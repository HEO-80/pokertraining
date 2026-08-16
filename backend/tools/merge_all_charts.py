import json
import os
from collections import defaultdict

TOURNAMENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "img", "tournaments")
FOLDERS = [
    "1 open raise",
    "2 raise over limpers",
    "3 3bet-call",
    "4 call vs open-push",
    "5 squeeze-call",
    "6 cold4bet-farha",
]
FIELDS = ["source_image", "menu_category", "hero_position", "effective_stack",
          "opp_position", "extra_action", "opp_3bet_size", "chart_type", "ranges"]
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "all_charts_master.json")


def main():
    master = []
    per_folder_counts = {}
    for folder in FOLDERS:
        path = os.path.join(TOURNAMENTS_DIR, folder, "output", "all_charts.json")
        with open(path, "r", encoding="utf-8") as f:
            charts = json.load(f)
        per_folder_counts[folder] = len(charts)
        for c in charts:
            entry = {k: c.get(k) for k in FIELDS}
            entry["source_folder"] = folder
            master.append(entry)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(master, f, indent=2, ensure_ascii=False)

    print(f"Total charts combinados: {len(master)}")
    for folder, n in per_folder_counts.items():
        print(f"  {folder}: {n}")
    print(f"Master -> {OUTPUT_PATH}\n")

    # Cobertura por (menu_category x hero_position x effective_stack)
    coverage = defaultdict(int)
    for c in master:
        key = (c["menu_category"] or "(sin categoria)",
               c["hero_position"] or "(sin posicion)",
               c["effective_stack"] or "(sin stack)")
        coverage[key] += 1

    print("=== COBERTURA (menu_category x hero_position x effective_stack) ===")
    for key in sorted(coverage):
        cat, pos, stack = key
        print(f"  {cat:<20s} {pos:<6s} {stack:<8s} -> {coverage[key]} chart(s)")

    missing = [c for c in master if not c["hero_position"] or not c["effective_stack"]]
    print(f"\n=== SIN posicion/stack: {len(missing)}/{len(master)} ===")
    for c in missing:
        print(f"  [{c['source_folder']}] {c['source_image']}  pos={c['hero_position']}  stack={c['effective_stack']}")

    # Resumen adicional: charts sin campos opcionales (best-effort)
    for field in ("menu_category", "opp_position", "extra_action", "opp_3bet_size"):
        n_missing = sum(1 for c in master if not c[field])
        print(f"Sin {field}: {n_missing}/{len(master)}")


if __name__ == "__main__":
    main()
