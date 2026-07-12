import cv2
import numpy as np
import json
import os
import sys

# Colores en formato BGR (OpenCV) usados en las tablas de PreflopVision.
# El mismo color (ej. rojo) significa cosas distintas segun el grafico
# (3BET, ALL IN, ROL...), asi que el significado se detecta por imagen
# segun que colores aparecen realmente dentro de la cuadricula.
RED = [80, 75, 230]
BLUE = [235, 195, 115]
YELLOW = [150, 235, 245]          # "MARGINAL CALL" (aparece junto con BLUE)
GRAY_DARK = [75, 79, 84]
GRAY_MID = [158, 158, 158]        # "NOT IN RANGE"
CYAN_DARK = [208, 176, 0]         # "OPEN RAISE"
ORANGE = [64, 232, 248]           # "MARGINAL ALL IN" / "MARGINAL OPEN RAISE"

RAW_COLORS = {
    "red": RED, "blue": BLUE, "yellow": YELLOW, "gray_dark": GRAY_DARK,
    "gray_mid": GRAY_MID, "cyan_dark": CYAN_DARK, "orange": ORANGE,
}

# Mapeos color -> nombre de accion, uno por tipo de grafico de PreflopVision.
CHART_TYPES = {
    "open_raise": {"cyan_dark": "open_raise", "orange": "marginal_open_raise"},
    "raise_over_limpers": {"gray_dark": "all_in", "red": "rol", "blue": "check"},
    "3bet_call": {"gray_dark": "all_in", "red": "3bet", "blue": "call", "yellow": "marginal_call"},
    "range_call": {"red": "all_in", "blue": "call", "yellow": "marginal_call"},  # squeeze/call, cold4bet/farha
    "call_vs_open_push": {"red": "all_in", "orange": "marginal_all_in", "gray_mid": "not_in_range"},
    "4bet_position": {"red": "all_in", "gray_mid": "not_in_range"},
}

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
    los pixeles que coinciden con cualquiera de los colores conocidos. Funciona
    igual con capturas recortadas (~780px) o pantallas completas (1920px),
    porque no depende de coordenadas fijas."""
    mask = np.zeros(img.shape[:2], dtype=np.uint8)
    for bgr in RAW_COLORS.values():
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


def detect_chart_type(grid_img, w, h, tolerance=40, min_blob_area=100):
    """Decide que colores estan realmente presentes en la cuadricula y elige
    el mapeo color->accion adecuado. Evita asumir un tipo fijo por carpeta,
    porque una misma carpeta puede mezclar variantes (ej. "1 open raise"
    contiene tanto graficos base OPEN RAISE como respuestas ALL IN a un ROL).

    Usa el mayor blob conectado (no el conteo total de pixeles) para no
    confundir ruido de anti-aliasing en los bordes de la cuadricula (lineas
    finas de 1-2px) con un relleno de celda real."""
    present = set()
    for name, bgr in RAW_COLORS.items():
        lower = np.array([max(0, c - tolerance) for c in bgr])
        upper = np.array([min(255, c + tolerance) for c in bgr])
        mask = cv2.inRange(grid_img, lower, upper)
        n, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
        for i in range(1, n):
            bw, bh, area = stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT], stats[i, cv2.CC_STAT_AREA]
            # descarta lineas finas que recorren todo el ancho/alto (bordes)
            if bw > 0.5 * w or bh > 0.5 * h:
                continue
            if area >= min_blob_area:
                present.add(name)
                break

    if "cyan_dark" in present:
        return "open_raise"
    if "gray_dark" in present:
        return "3bet_call" if "yellow" in present else "raise_over_limpers"
    if "blue" in present and "yellow" in present:
        return "range_call"
    if "red" in present and "orange" in present:
        return "call_vs_open_push"  # incluye not_in_range si tambien aparece
    if "red" in present and "gray_mid" in present:
        return "4bet_position"
    if "orange" in present:
        return "open_raise"  # solo se ven celdas "marginal", sin ninguna "open raise"
    return "3bet_call"  # fallback razonable


def process_poker_image(image_path, debug=False):
    img = cv2.imread(image_path)
    if img is None:
        return None, "no se pudo cargar la imagen", None

    bbox = find_grid_bbox(img)
    if bbox is None:
        return None, "no se encontro la cuadricula (colores no reconocidos)", None
    x, y, w, h = bbox

    if debug:
        debug_img = img.copy()
        cv2.rectangle(debug_img, (x, y), (x + w, y + h), (0, 255, 0), 2)
        base = os.path.splitext(os.path.basename(image_path))[0]
        cv2.imwrite(f"_debug_bbox_{base}.png", debug_img)

    grid_img = img[y:y + h, x:x + w]
    cell_w = w / 13
    cell_h = h / 13

    chart_type = detect_chart_type(grid_img, w, h)
    chart_colors = {action: RAW_COLORS[raw] for raw, action in CHART_TYPES[chart_type].items()}

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

    return ranges_data, None, chart_type


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

    ok_count = 0
    error_count = 0
    type_counts = {}

    for filename in sorted(images):
        image_path = os.path.join(folder, filename)
        try:
            ranges, error, chart_type = process_poker_image(image_path, debug=debug)
        except Exception as e:
            ranges, error, chart_type = None, str(e), None

        if ranges is None:
            print(f"ERROR {filename}: {error}")
            error_count += 1
            continue

        output_json = {
            "source_image": filename,
            "chart_type": chart_type,
            "ranges": ranges,
        }

        out_name = os.path.splitext(filename)[0] + ".json"
        out_path = os.path.join(output_folder, out_name)
        with open(out_path, "w") as f:
            json.dump(output_json, f, indent=2)
        print(f"OK  {filename} [{chart_type}] -> {out_path}")
        ok_count += 1
        type_counts[chart_type] = type_counts.get(chart_type, 0) + 1

    print(f"\nTotal: {ok_count} OK, {error_count} con error.")
    if type_counts:
        print("Tipos de grafico detectados:", type_counts)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    target = args[0] if args else "."
    process_folder(target, debug="--debug" in sys.argv)
