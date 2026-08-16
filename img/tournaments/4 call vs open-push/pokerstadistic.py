import cv2
import numpy as np
import json
import os
import sys
import difflib
import re

try:
    import pytesseract
    _HAS_TESS = True
    try:
        pytesseract.get_tesseract_version()
    except Exception:
        _fallback = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        if os.path.isfile(_fallback):
            pytesseract.pytesseract.tesseract_cmd = _fallback
        else:
            _HAS_TESS = False
except Exception:
    _HAS_TESS = False

if not _HAS_TESS:
    print("AVISO: Tesseract OCR no disponible. categoria/opp_3bet_size/extra_action "
          "no se extraeran (posicion/stack por geometria si funcionan).")

# Colores en formato BGR (OpenCV) usados en las tablas de PreflopVision.
RED = [80, 75, 230]
BLUE = [235, 195, 115]
YELLOW = [150, 235, 245]          # "MARGINAL CALL" (aparece junto con BLUE)
GRAY_DARK = [75, 79, 84]
GRAY_MID = [158, 158, 158]        # "NOT IN RANGE"
CYAN_DARK = [208, 176, 0]         # "OPEN RAISE" + botones SELECCIONADOS (teal)
ORANGE = [64, 232, 248]           # "MARGINAL ALL IN" / "MARGINAL OPEN RAISE"

RAW_COLORS = {
    "red": RED, "blue": BLUE, "yellow": YELLOW, "gray_dark": GRAY_DARK,
    "gray_mid": GRAY_MID, "cyan_dark": CYAN_DARK, "orange": ORANGE,
}

CHART_TYPES = {
    "open_raise": {"cyan_dark": "open_raise", "orange": "marginal_open_raise"},
    "raise_over_limpers": {"gray_dark": "all_in", "red": "rol", "blue": "check"},
    "3bet_call": {"gray_dark": "all_in", "red": "3bet", "blue": "call", "yellow": "marginal_call"},
    "range_call": {"red": "all_in", "blue": "call", "yellow": "marginal_call"},
    "call_vs_open_push": {"red": "all_in", "orange": "marginal_all_in", "gray_mid": "not_in_range"},
    "4bet_position": {"red": "all_in", "gray_mid": "not_in_range"},
}

RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

# ----- Listas de opciones de la cabecera de PreflopVision (en orden de pantalla) -----
POSITIONS = ["SB", "BTN", "CO", "HJ", "MP2", "MP1", "EP2", "EP1"]        # fila superior, izq->der
STACKS = ["40BB", "35BB", "30BB", "25BB", "20BB", "17.5BB", "15BB", "12.5BB", "10BB"]  # rejilla 2 col, fila-mayor
EXTRA_ACTIONS = ["ROL", "3BET", "3BET + CALL", "SQUEEZE", "COLD4BET", "4BET", "LIMP RAISE"]
MENU_CATEGORIES = ["OPEN RAISE", "RAISE OVER LIMPERS", "3BET / CALL",
                   "CALL VS OPEN-PUSH", "SQUEEZE / CALL", "COLD4BET / FARHA"]
TEAL_BGR = np.array(CYAN_DARK)


def get_hand_name(row, col):
    if row == col:
        return RANKS[row] + RANKS[col]
    elif row < col:
        return RANKS[row] + RANKS[col] + 's'
    else:
        return RANKS[col] + RANKS[row] + 'o'


def find_grid_bbox(img, tolerance=40, header_h=100, min_component_area=500):
    mask = np.zeros(img.shape[:2], dtype=np.uint8)
    for bgr in RAW_COLORS.values():
        lower = np.array([max(0, c - tolerance) for c in bgr])
        upper = np.array([min(255, c + tolerance) for c in bgr])
        mask |= cv2.inRange(img, lower, upper)
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
    present = set()
    for name, bgr in RAW_COLORS.items():
        lower = np.array([max(0, c - tolerance) for c in bgr])
        upper = np.array([min(255, c + tolerance) for c in bgr])
        mask = cv2.inRange(grid_img, lower, upper)
        n, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
        for i in range(1, n):
            bw, bh, area = stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT], stats[i, cv2.CC_STAT_AREA]
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
        return "call_vs_open_push"
    if "red" in present and "gray_mid" in present:
        return "4bet_position"
    if "orange" in present:
        return "open_raise"
    return "3bet_call"


# =====================================================================
# NUEVO: extraccion de la metadata de la cabecera (posicion, stack, etc.)
# =====================================================================
def _teal_mask(img):
    return cv2.inRange(img, np.clip(TEAL_BGR - 55, 0, 255), np.clip(TEAL_BGR + 55, 0, 255))


def _detect_teal_blobs(img, gx, gy, min_area=300):
    """Componentes SOLO del color teal (boton/etiqueta seleccionada), sin unir con
    el relleno gris de los botones no seleccionados. Se usa para los campos de
    seleccion unica (categoria, extra action, oponente...) donde no hace falta
    enumerar todos los botones de la fila, solo localizar el que esta activo."""
    teal = _teal_mask(img)
    teal = cv2.morphologyEx(teal, cv2.MORPH_CLOSE, np.ones((3, 9), np.uint8))
    n, _, st, _ = cv2.connectedComponentsWithStats(teal, connectivity=8)
    blobs = []
    for i in range(1, n):
        x, y, w, h, a = st[i, 0], st[i, 1], st[i, 2], st[i, 3], st[i, 4]
        if a < min_area or y < 50 or w > 400 or h > 70:
            continue
        if x >= gx and y >= gy:           # dentro de la rejilla -> no es boton de cabecera
            continue
        blobs.append({"x": x, "y": y, "w": w, "h": h, "cx": x + w // 2, "cy": y + h // 2})
    return blobs


def _ocr_button(img, b, upscale=4):
    """OCR de un boton. Tesseract falla ('Empty page!!') si se le pasa el boton
    entero: es una caja ancha con el texto centrado y mucho relleno vacio a los
    lados, y su heuristica de deteccion de lineas la descarta. Por eso recortamos
    primero, por componentes conexos oscuros (texto + borde del boton), la caja
    AJUSTADA solo al texto (descartando el borde exterior, que es el componente
    grande que abarca casi toda la imagen), la binarizamos y la ampliamos con
    margen blanco antes de pasarla a tesseract."""
    if not _HAS_TESS:
        return ""
    c = img[max(0, b["y"] - 2):b["y"] + b["h"] + 2, max(0, b["x"] - 2):b["x"] + b["w"] + 2]
    if c.size == 0:
        return ""
    gray = cv2.cvtColor(c, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=upscale, fy=upscale, interpolation=cv2.INTER_CUBIC)

    dark = (gray < 90).astype(np.uint8) * 255
    hh, ww = gray.shape
    n, _, st, _ = cv2.connectedComponentsWithStats(dark, connectivity=8)
    # el borde/marco del boton es un componente oscuro que abarca casi todo el
    # ancho Y todo el alto a la vez (a diferencia de una letra, que solo es
    # grande en una dimension) -> se descarta por FORMA, no por area (el area
    # del marco puede ser parecida a la de las letras en botones pequenos).
    letters = [st[i] for i in range(1, n)
               if st[i][4] > 0.0005 * hh * ww and not (st[i][2] > 0.5 * ww and st[i][3] > 0.5 * hh)]
    if letters:
        x0 = min(s[0] for s in letters); y0 = min(s[1] for s in letters)
        x1 = max(s[0] + s[2] for s in letters); y1 = max(s[1] + s[3] for s in letters)
        pad = 15
        gray = gray[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad]

    _, bw = cv2.threshold(gray, 110, 255, cv2.THRESH_BINARY)
    bw = cv2.copyMakeBorder(bw, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255)
    # Tesseract es inconsistente en cajas tan pequenas/variadas: un solo --psm falla
    # segun el ancho/numero de caracteres. Probamos varios y nos quedamos con el
    # primer resultado que contenga texto alfanumerico (no solo basura tipo "[=]").
    for psm in (7, 6, 13, 11, 8):
        txt = pytesseract.image_to_string(bw, config=f"--psm {psm}").strip().upper().replace("\n", " ")
        if re.search(r"[A-Z0-9]", txt):
            return txt
    return ""


def _closest(txt, options):
    if not txt:
        return None
    t = txt.replace(" ", "")
    best = max(options, key=lambda o: difflib.SequenceMatcher(None, t, o.replace(" ", "")).ratio())
    ratio = difflib.SequenceMatcher(None, t, best.replace(" ", "")).ratio()
    return best if ratio >= 0.34 else None


def _closest_position(txt):
    """Como _closest pero contra POSITIONS+BB, rechazando texto tipo "1 BB" o
    "9.5 BB": se pueden parecer lo bastante a "BB" segun SequenceMatcher como
    para colarse como si fueran una posicion valida. Ojo: posiciones como
    MP2/EP1 SI llevan digito, asi que solo rechazamos cuando el digito va
    pegado a "BB" (patron de tamano en bigblinds), no cualquier digito."""
    if not txt:
        return None
    compact = txt.replace(" ", "")
    if re.search(r"\dBB|BB\d", compact):
        return None
    return _closest(txt, POSITIONS + ["BB"])


def _section_ys(img):
    """Localiza la Y de las cabeceras de seccion por OCR (etiquetas largas, fiables).
    Las etiquetas "OPPONENT ..." varian de chart a chart (OPPONENT POSITION,
    OPPONENT OPEN RAISE POSITION, OPPONENT 3BET SIZE, OPPONENT ROL SIZE,
    OPPONENT COLD 4BET SIZE, esta ultima incluso partida en dos lineas por el
    ancho...) y NO siempre aparecen en el mismo orden ni las dos a la vez -> en
    vez de asumir "1er hit = posicion, 2o hit = tamano", por cada "OPPONENT"
    juntamos las palabras cercanas (misma zona, hasta 2 lineas hacia abajo) y
    miramos si el texto contiene POSITION o SIZE para clasificarlo bien."""
    ys = {"extra": None, "opp_pos": None, "stack": None, "opp_size": None, "your": None}
    if not _HAS_TESS:
        return ys
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    words = [(t.strip().upper(), data["top"][i], data["left"][i])
             for i, t in enumerate(data["text"]) if t.strip()]
    for u, top, left in words:
        if u == "YOUR":
            ys["your"] = top if ys["your"] is None else min(ys["your"], top)
        elif u == "EXTRA":
            ys["extra"] = top if ys["extra"] is None else min(ys["extra"], top)
        elif u == "EFFECTIVE":
            ys["stack"] = top if ys["stack"] is None else min(ys["stack"], top)
        elif u == "OPPONENT":
            nearby = " ".join(w for w, t2, l2 in words
                               if top - 5 <= t2 <= top + 45 and abs(l2 - left) < 400)
            if "POSI" in nearby:  # OCR a veces trunca "POSITION" -> "POSI"
                ys["opp_pos"] = top if ys["opp_pos"] is None else min(ys["opp_pos"], top)
            elif "SIZE" in nearby:
                ys["opp_size"] = top if ys["opp_size"] is None else min(ys["opp_size"], top)
    return ys


def extract_header_metadata(img, grid_bbox):
    """Devuelve dict con hero_position, effective_stack, opp_position,
    extra_action, opp_3bet_size, menu_category. Cada campo es best-effort:
    None si no se puede determinar (p.ej. imagen sin cabecera). Nunca lanza."""
    meta = {"hero_position": None, "effective_stack": None, "opp_position": None,
            "extra_action": None, "opp_3bet_size": None, "menu_category": None}
    try:
        gx, gy = grid_bbox[0], grid_bbox[1]
        blobs = _detect_teal_blobs(img, gx, gy)
        if not blobs:
            return meta
        ys = _section_ys(img)
        bleft = [b for b in blobs if b["cx"] < gx]
        bright = [b for b in blobs if b["cx"] >= gx]

        # Distintos tipos de chart meten campos "OPPONENT ..." extra (p.ej. en
        # 3bet/call desde la perspectiva del que responde hay tambien una fila
        # "OPPONENT OPEN RAISE POSITION" ANTES de "EXTRA ACTIONS", cosa que no
        # pasa en los charts simples). En vez de asumir un orden fijo de
        # secciones, ordenamos los anclajes que sí pudimos OCR y usamos, para
        # cada seccion, el hueco hasta el siguiente anclaje conocido.
        anchors = sorted(y for y in (ys["your"], ys["extra"], ys["opp_pos"], ys["opp_size"], ys["stack"]) if y)

        def zone_end(start):
            nxt = [a for a in anchors if a > start]
            return min(nxt) if nxt else 10 ** 9

        # HERO POSITION: si hay etiqueta "YOUR POSITION" la usamos como anclaje
        # (algunos charts, p.ej. squeeze/cold4bet, meten OTRAS filas de
        # seleccion -dropdowns "OPEN RAISE"/"CALL"- ANTES de "YOUR POSITION",
        # asi que sin la etiqueta cogeriamos la fila equivocada). Si no hay
        # etiqueta (charts simples), la fila de posicion es la primera de la
        # cabecera. El CONTENIDO/orden de esa fila no es fijo (algunos charts
        # de "responder" incluyen BB y no EP1) -> mejor OCR directo del boton
        # teal que indexar contra una lista fija.
        hero_start = ys["your"] or 0
        herorow = sorted([b for b in bright if b["cy"] > hero_start and b["cy"] < zone_end(hero_start)],
                          key=lambda b: (b["cy"], b["cx"]))
        if herorow:
            meta["hero_position"] = _closest_position(_ocr_button(img, herorow[0]))

        # Puede haber una SEGUNDA fila de posicion justo despues de la del hero
        # sin etiqueta "OPPONENT..." (p.ej. "LIMP POSITION"); la guardamos
        # aparte como candidata a opp_position por si no aparece la etiquetada.
        hero_end = zone_end(hero_start)
        unlabeled_opp_pos_candidate = None
        nextrow = sorted([b for b in bright if hero_end <= b["cy"] < zone_end(hero_end)],
                          key=lambda b: (b["cy"], b["cx"]))
        if nextrow:
            unlabeled_opp_pos_candidate = nextrow[0]

        # EFFECTIVE STACK: la rejilla de stacks NO siempre muestra las 8
        # opciones completas (algunas cabeceras solo listan 4-6, o incluso un
        # unico desplegable) y el primer elemento visible no siempre es 40BB
        # -> el indice de pantalla no es fiable. OCR directo + fuzzy match.
        if ys["stack"]:
            stackbtns = sorted([b for b in bleft if ys["stack"] < b["cy"] < zone_end(ys["stack"])],
                                key=lambda b: (b["cy"], b["cx"]))
            if stackbtns:
                cand = _closest(_ocr_button(img, stackbtns[0]), STACKS)
                if cand:
                    meta["effective_stack"] = cand

        # MENU CATEGORY (sidebar): candidatos = teal de la izquierda por encima de
        # "EFFECTIVE STACK"; puede colarse el logo "PREFLOPVISION" (ya excluido por
        # y<50) u otros; nos quedamos con el que mejor casa con una categoria real.
        cat_btns = [b for b in bleft if not ys["stack"] or b["cy"] < ys["stack"]]
        best_cat, best_ratio = None, 0.0
        for b in cat_btns:
            raw = _ocr_button(img, b)
            if not raw:
                continue
            cand = max(MENU_CATEGORIES,
                       key=lambda o: difflib.SequenceMatcher(None, raw.replace(" ", ""), o.replace(" ", "")).ratio())
            r = difflib.SequenceMatcher(None, raw.replace(" ", ""), cand.replace(" ", "")).ratio()
            if r > best_ratio:
                best_cat, best_ratio = cand, r
        if best_ratio >= 0.5:
            meta["menu_category"] = best_cat

        # EXTRA ACTION / OPPONENT POSITION: columna derecha, igual que la fila
        # de posicion del hero (usar `blobs` completo aqui puede colar el
        # boton de categoria del sidebar -SEQUENCE/MENU-, que en cabeceras
        # anchas cae en el mismo rango de Y que estas secciones).
        if ys["extra"]:
            ea = sorted([b for b in bright if ys["extra"] <= b["cy"] < zone_end(ys["extra"])],
                        key=lambda b: (b["cy"], b["cx"]))
            if ea:
                meta["extra_action"] = _closest(_ocr_button(img, ea[0]), EXTRA_ACTIONS)

        # OPPONENT POSITION: preferimos la etiqueta explicita "OPPONENT ...
        # POSITION" si _section_ys la encontro (p.ej. "OPPONENT OPEN RAISE
        # POSITION" en 3bet/call, o "OPPONENT POSITION" en el ROL simple).
        # Si no hay ninguna, caemos a la segunda fila sin etiquetar detectada
        # junto a la posicion del hero (p.ej. "LIMP POSITION").
        if ys["opp_pos"]:
            op = sorted([b for b in bright if ys["opp_pos"] < b["cy"] < zone_end(ys["opp_pos"])],
                        key=lambda b: (b["cy"], b["cx"]))
            if op:
                meta["opp_position"] = _closest_position(_ocr_button(img, op[0]))
        if not meta["opp_position"] and unlabeled_opp_pos_candidate:
            meta["opp_position"] = _closest_position(_ocr_button(img, unlabeled_opp_pos_candidate))

        # OPPONENT ___ SIZE: bajo la etiqueta "OPPONENT ... SIZE" -> OCR.
        # Esta etiqueta cae en la columna izquierda (bajo EFFECTIVE STACK) en
        # todos los charts vistos hasta ahora.
        if ys["opp_size"]:
            o3 = sorted([b for b in bleft if ys["opp_size"] < b["cy"] < zone_end(ys["opp_size"])],
                        key=lambda b: (b["cy"], b["cx"]))
            if o3:
                meta["opp_3bet_size"] = _ocr_button(img, o3[0]) or None
    except Exception as e:
        meta["_header_error"] = str(e)
    return meta


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
            y_start = round(row * cell_h); y_end = min(round((row + 1) * cell_h), grid_img.shape[0])
            x_start = round(col * cell_w); x_end = min(round((col + 1) * cell_w), grid_img.shape[1])
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
                percentage = cv2.countNonZero(mask) / total_pixels
                if percentage > 0.05:
                    actions[action] = round(percentage, 2)
            total_action_pct = sum(actions.values())
            if total_action_pct > 0:
                actions = {k: round(v / total_action_pct, 2) for k, v in actions.items()}
                ranges_data[hand_name] = {"actions": actions}
            else:
                ranges_data[hand_name] = {"actions": {"fold": 1.0}}

    # NUEVO: metadata de la cabecera
    header = extract_header_metadata(img, bbox)

    return ranges_data, None, {"chart_type": chart_type, "header": header}


def process_folder(folder, output_folder=None, debug=False):
    output_folder = output_folder or os.path.join(folder, "output")
    os.makedirs(output_folder, exist_ok=True)

    images = [f for f in os.listdir(folder)
              if f.lower().endswith((".png", ".jpg", ".jpeg"))
              and not f.startswith("_debug") and not f.startswith("comprobacion_recorte")]
    if not images:
        print(f"No se encontraron imagenes en '{folder}'.")
        return

    ok_count = error_count = 0
    type_counts = {}
    combined = []   # NUEVO: todos los charts en una sola lista

    for filename in sorted(images):
        image_path = os.path.join(folder, filename)
        try:
            ranges, error, info = process_poker_image(image_path, debug=debug)
        except Exception as e:
            ranges, error, info = None, str(e), None
        if ranges is None:
            print(f"ERROR {filename}: {error}")
            error_count += 1
            continue

        chart_type = info["chart_type"]
        header = info["header"]
        output_json = {
            "source_image": filename,
            "chart_type": chart_type,
            # NUEVO: metadata de cabecera al nivel superior del chart
            "hero_position": header.get("hero_position"),
            "effective_stack": header.get("effective_stack"),
            "opp_position": header.get("opp_position"),
            "extra_action": header.get("extra_action"),
            "opp_3bet_size": header.get("opp_3bet_size"),
            "menu_category": header.get("menu_category"),
            "ranges": ranges,
        }
        out_path = os.path.join(output_folder, os.path.splitext(filename)[0] + ".json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(output_json, f, indent=2, ensure_ascii=False)
        combined.append(output_json)

        miss = [k for k in ("hero_position", "effective_stack") if not header.get(k)]
        flag = f"  <-- REVISAR (sin {', '.join(miss)})" if miss else ""
        print(f"OK  {filename} [{chart_type}] pos={header.get('hero_position')} "
              f"stack={header.get('effective_stack')} cat={header.get('menu_category')}{flag}")
        ok_count += 1
        type_counts[chart_type] = type_counts.get(chart_type, 0) + 1

    # NUEVO: volcado combinado (todos los charts en un solo archivo)
    combined_path = os.path.join(output_folder, "all_charts.json")
    with open(combined_path, "w", encoding="utf-8") as f:
        json.dump(combined, f, indent=2, ensure_ascii=False)

    print(f"\nTotal: {ok_count} OK, {error_count} con error.")
    if type_counts:
        print("Tipos de grafico detectados:", type_counts)
    n_missing = sum(1 for c in combined if not c["hero_position"] or not c["effective_stack"])
    print(f"Charts sin posicion/stack (revisar a mano o mejorar OCR): {n_missing}/{len(combined)}")
    print(f"Combinado -> {combined_path}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    target = args[0] if args else "."
    process_folder(target, debug="--debug" in sys.argv)
