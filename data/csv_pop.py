#!/usr/bin/env python3
"""
Generate an MDX taxonomy tree for Astro + Starlight.

• Each species row → <Genus>/<Species>.mdx
• Each Phylum/Class/Order/Family/Genus folder gets an _index.mdx with:
    – sidebar.order = -1  (floats to top within folder)
    – a <Badge> showing its rank
    – a breadcrumb showing the full rank chain up to that folder
"""

import os, csv, re
from itertools import islice

CSV_FILE  = "species.csv"   # input
ROOT_DIR  = "Taxonomy"      # output
LIMIT     = 80_000          # None → all rows

# ── Templates ─────────────────────────────────────────────────────────────── #
SPECIES_TEMPLATE = """---
title: "{{species}}"
description: "{{description}}"
---

import { Card, CardGrid, Badge, Aside, Steps, Tabs, TabItem, Icon, LinkButton } from '@astrojs/starlight/components';

# *{{genus}} | {{species}}*

<LinkButton href="#top" variant="minimal" icon="arrow-up" iconPlacement="start">
  Back to top
</LinkButton>
"""

INDEX_TEMPLATE = """---
title: "{{name}}"
description: "Overview of the {{name}} ({{rank}})."
sidebar:
  order: -1
---

import { Badge, LinkButton } from '@astrojs/starlight/components';

# {{name}} <Badge variant="note" text="{{rank}}" />

**Taxonomic hierarchy:** {{chain}}

<LinkButton href="#top" variant="minimal" icon="arrow-up">
  Back to top
</LinkButton>
"""

_placeholder = re.compile(r"\{\{(\w+)\}\}")

# ── Helpers ───────────────────────────────────────────────────────────────── #
def render_species(template: str, row: dict) -> str | None:
    """Replace {{placeholders}} in SPECIES_TEMPLATE using a CSV row."""
    data = {k.lower(): v.strip() for k, v in row.items()}
    if not data.get("genus") or not data.get("species"):
        return None
    return _placeholder.sub(lambda m: data.get(m.group(1), ""), template)

def ensure_index(folder: str, name: str, rank: str, chain: str) -> None:
    """Create _index.mdx once per folder with rank badge & full chain."""
    os.makedirs(folder, exist_ok=True)
    idx = os.path.join(folder, "index.mdx")
    if not os.path.exists(idx):
        page = (
            INDEX_TEMPLATE
            .replace("{{name}}", name)
            .replace("{{rank}}", rank)
            .replace("{{chain}}", chain)
        )
        with open(idx, "w", encoding="utf-8") as f:
            f.write(page)

# ── Build the tree ───────────────────────────────────────────────────────── #
RANKS = ("Phylum", "Class", "Order", "Family", "Genus")
skipped: list[dict] = []

with open(CSV_FILE, newline="", encoding="utf-8") as fh:
    reader = csv.DictReader(fh)

    for row in islice(reader, LIMIT):
        mdx = render_species(SPECIES_TEMPLATE, row)
        if mdx is None:
            skipped.append(row)
            continue

        path, chain_parts = ROOT_DIR, []
        for rank in RANKS:
            taxon = row.get(rank, "").title().replace(" ", "_")
            chain_parts.append(f"**{rank}:** {taxon}")
            chain = " › ".join(chain_parts)
            path = os.path.join(path, taxon)
            ensure_index(path, taxon, rank, chain)

        # write species file
        species_file = f"{row['Species'].title().replace(' ', '')}.mdx"
        with open(os.path.join(path, species_file), "w", encoding="utf-8") as out:
            out.write(mdx)

# ── Report skipped rows ──────────────────────────────────────────────────── #
if skipped:
    with open("skipped_rows.csv", "w", newline="", encoding="utf-8") as sf:
        writer = csv.DictWriter(sf, fieldnames=reader.fieldnames)
        writer.writeheader(); writer.writerows(skipped)
    print(f"⚠️  Skipped {len(skipped)} rows → skipped_rows.csv")

print(f"✅  Taxonomy generated in “{ROOT_DIR}”.")
