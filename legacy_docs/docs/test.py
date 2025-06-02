import requests
import pandas as pd
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

# — Configuration —
CSV_FILE     = 'species.csv'
API_URL      = "https://api.gbif.org/v1/species/match"
MAX_WORKERS  = 5
TAXON_COLUMNS = ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"]

def get_taxonomy_row(idx, name):
    """
    Query GBIF for the given species name,
    return (row_index, taxonomy_dict).
    """
    try:
        res = requests.get(API_URL, params={"name": name}, timeout=10)
        if res.ok:
            d = res.json()
            tax = {
                "Kingdom": d.get("kingdom", ""),
                "Phylum" : d.get("phylum", ""),
                "Class"  : d.get("class", ""),
                "Order"  : d.get("order", ""),
                "Family" : d.get("family", ""),
                "Genus"  : d.get("genus", ""),
                "Species": d.get("species", "")
            }
        else:
            print(f"⚠️  GBIF error {res.status_code} for '{name}'")
            tax = {k: "" for k in TAXON_COLUMNS}
    except Exception as e:
        print(f"⚠️  Exception for '{name}': {e}")
        tax = {k: "" for k in TAXON_COLUMNS}
    return idx, tax

def main():
    if not os.path.exists(CSV_FILE):
        print(f"File not found: {CSV_FILE}")
        return

    # Load your data
    df = pd.read_csv(CSV_FILE)

    # Detect the species column
    species_col = None
    for col in df.columns:
        if col.strip().lower() == "species name":
            species_col = col
            break
    if not species_col:
        species_col = df.columns[0]
        print(f"⚠️  'species name' header not found; using '{species_col}' as species column")

    # Ensure taxonomy columns exist
    for col in TAXON_COLUMNS:
        if col not in df.columns:
            df[col] = ""

    # Prepare list of rows to process
    tasks = [
        (idx, str(row[species_col]).strip())
        for idx, row in df.iterrows()
        if not pd.notna(row["Kingdom"]) or not row["Kingdom"]
    ]
    total = len(tasks)
    print(f"⏳ Queued {total} species for lookup...")

    # Use a ThreadPool to fetch up to MAX_WORKERS at once
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_idx = {
            executor.submit(get_taxonomy_row, idx, name): idx
            for idx, name in tasks
        }

        completed = 0
        for future in as_completed(future_to_idx):
            row_idx = future_to_idx[future]
            name    = df.at[row_idx, species_col]
            try:
                _, tax = future.result()
                # Write taxonomy back into the DataFrame
                for k, v in tax.items():
                    df.at[row_idx, k] = v

                # Save after each row completes
                df.to_csv(CSV_FILE, index=False)

                completed += 1
                # **Console-log the full taxonomy for fun**
                print(f"[{completed}/{total}] ✅ '{name}' → {tax}")
            except Exception as e:
                print(f"[Error] {name}: {e}")

    print("🎉 All done!")

if __name__ == "__main__":
    main()
