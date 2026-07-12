import cv2
import numpy as np
import json
import os
import sys

# Colores en formato BGR (OpenCV)
# Graficos normales de rango (OPEN RAISE, 3BET/CALL, SQUEEZE/CALL, etc.)
COLORS = {
    "all_in": [75, 79, 84],       # Gris oscuro
    "3bet": [80, 75, 230],        # Rojo
    "call": [235, 195, 115],      # Azul claro
    "marginal_call": [150, 235, 245],  # Amarillo claro
    # "fold" no se busca por color: es indistinguible del fondo de la pagina,
    # se asume por descarte (celda sin ninguno de los colores de arriba).
}

# Graficos de "4BET POSITION" (leyenda ALL IN / FOLD / NOT IN RANGE): el rojo
# aqui significa ALL IN (no 3BET), y usan un gris propio para NOT IN RANGE.
COLORS_4BET = {
    "all_in": [80, 75, 230],      # Rojo (mismo rojo, otro significado)
    "not_in_range": [158, 158, 158],  # Gris medio, distinto del gris de arriba
}

# Union de todos los colores posibles, solo para localizar la cuadricula.
ALL_PALETTE_COLORS = {**COLORS, "not_in_range": [158, 158, 158]}

RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']


def get_hand_name(row, col):
    if row == col:
        return RANKS[row] + RANKS[col]
    elif row < col:
        return RANKS[row] + RANKS[col] + 's'
    else:
        return RANKS[col] + RANKS[row] + 'o'


def find_grid_bbox(img, tolerance=40, header_h=100, min_component_area=500):
    """Localiza automaticamente el rectangulo de la cuadricula 13x13 buscando
    los pixeles que coinciden con los colores de accion. Funciona igual con
    capturas recortadas (~780px) o capturas de pantalla completas (1920px),
    porque no depende de coordenadas fijas."""
    mask = np.zeros(img.shape[:2], dtype=np.uint8)
    for bgr in ALL_PALETTE_COLORS.values():
        lower = np.array([max(0, c - tolerance) for c in bgr])
        upper = np.array([min(255, c + tolerance) for c in bgr])
        mask |= cv2.inRange(img, lower, upper)

    # La cabecera del sitio (logo, boton naranja "clicks gratis") puede dar
    # falsos positivos de color; nunca contiene la cuadricula.
    mask[:header_h, :] = 0

    n, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    keep = [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] > min_component_area]
    if not keep:
        return None

    x0 = min(stats[i, cv2.CC_STAT_LEFT] for i in keep)
    y0 = min(stats[i, cv2.CC_STAT_TOP] for i in keep)
    x1 = max(stats[i, cv2.CC_STAT_LEFT] + stats[i, cv2.CC_STAT_WIDTH] for i in keep)
    y1 = max(stats[i, cv2.CC_STAT_TOP] + stats[i, cv2.CC_STAT_HEIGHT] for i in keep)
    return (x0, y0, x1 - x0, y1 - y0)


def process_poker_image(image_path, debug=False):
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: No se pudo cargar '{image_path}'.")
        return None

    bbox = find_grid_bbox(img)
    if bbox is None:
        print(f"Error: No se encontro la cuadricula en '{image_path}'.")
        return None
    x, y, w, h = bbox

    if debug:
        debug_img = img.copy()
        cv2.rectangle(debug_img, (x, y), (x + w, y + h), (0, 255, 0), 2)
        base = os.path.splitext(os.path.basename(image_path))[0]
        cv2.imwrite(f"_debug_bbox_{base}.png", debug_img)

    grid_img = img[y:y + h, x:x + w]
    cell_w = w / 13
    cell_h = h / 13

    # Detectar el tipo de grafico: si el gris "NOT IN RANGE" ocupa una parte
    # significativa de la cuadricula, es un grafico de 4BET POSITION y hay que
    # usar su propio mapeo de colores (el rojo ahi significa ALL IN, no 3BET).
    tol = 40
    not_in_range_bgr = ALL_PALETTE_COLORS["not_in_range"]
    lower = np.array([max(0, c - tol) for c in not_in_range_bgr])
    upper = np.array([min(255, c + tol) for c in not_in_range_bgr])
    not_in_range_ratio = cv2.countNonZero(cv2.inRange(grid_img, lower, upper)) / (w * h)
    chart_colors = COLORS_4BET if not_in_range_ratio > 0.03 else COLORS

    ranges_data = {}

    for row in range(13):
        for col in range(13):
            hand_name = get_hand_name(row, col)

            y_start = round(row * cell_h)
            y_end = round((row + 1) * cell_h)
            x_start = round(col * cell_w)
            x_end = round((col + 1) * cell_w)

            y_end = min(y_end, grid_img.shape[0])
            x_end = min(x_end, grid_img.shape[1])

            cell = grid_img[y_start:y_end, x_start:x_end]

            if cell.size == 0:
                ranges_data[hand_name] = {"actions": {"fold": 1.0}}
                continue

            total_pixels = cell.shape[0] * cell.shape[1]
            actions = {}
            tolerance = 45

            for action, bgr in chart_colors.items():
                lower_bound = np.array([max(0, c - tolerance) for c in bgr])
                upper_bound = np.array([min(255, c + tolerance) for c in bgr])

                mask = cv2.inRange(cell, lower_bound, upper_bound)
                pixel_count = cv2.countNonZero(mask)
                percentage = pixel_count / total_pixels

                if percentage > 0.05:
                    actions[action] = round(percentage, 2)

            total_action_pct = sum(actions.values())
            if total_action_pct > 0:
                actions = {k: round(v / total_action_pct, 2) for k, v in actions.items()}
                ranges_data[hand_name] = {"actions": actions}
            else:
                ranges_data[hand_name] = {"actions": {"fold": 1.0}}

    return ranges_data


def process_folder(folder, output_folder=None, debug=False):
    output_folder = output_folder or os.path.join(folder, "output")
    os.makedirs(output_folder, exist_ok=True)

    images = [
        f for f in os.listdir(folder)
        if f.lower().endswith((".png", ".jpg", ".jpeg"))
        and not f.startswith("_debug")
        and not f.startswith("comprobacion_recorte")
    ]

    if not images:
        print(f"No se encontraron imagenes en '{folder}'.")
        return

    for filename in sorted(images):
        image_path = os.path.join(folder, filename)
        try:
            ranges = process_poker_image(image_path, debug=debug)
        except Exception as e:
            print(f"ERROR {filename}: {e}")
            continue
        if ranges is None:
            print(f"ERROR {filename}: no se pudo extraer la cuadricula.")
            continue

        output_json = {
            "source_image": filename,
            "ranges": ranges,
        }

        out_name = os.path.splitext(filename)[0] + ".json"
        out_path = os.path.join(output_folder, out_name)
        with open(out_path, "w") as f:
            json.dump(output_json, f, indent=2)
        print(f"OK  {filename} -> {out_path}")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    process_folder(target, debug="--debug" in sys.argv)
