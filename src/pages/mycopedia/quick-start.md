---
title: Getting Started with MycoSci
description: How to install Astro Starlight locally and navigate the MycoPedia documentation system.
---

Welcome to **MycoSci**, your open documentation stack for fungal research, cultivation, and fieldwork. The
reference is now powered by the official **Astro Starlight** theme, which means collapsible sidebar groups,
responsive navigation, and a growing component library that keeps dense scientific content easy to scan.

Use this guide to install the theme locally and jump into the sections that matter most to your work.

## 1. Install the Starlight Theme

```bash
npm install @astrojs/starlight
npm run dev
```

Once the dev server is running, head to <http://localhost:4321/docs/>. The sidebar mirrors the MycoPedia
hierarchy and defaults to collapsed groups so you can focus on one discipline at a time.

## 2. Explore the Documentation

### 📖 Taxonomy (Scientific Reference)

Walk through a fully nested hierarchy:

- **Kingdom → Phylum → Class → Order → Family → Genus → Species**
- Each species dossier captures macroscopic traits, microscopy, chemistry, edibility, and caution notes.

**Example:**
[Basidiomycota → Agaricomycetes → Agaricales → Agaricaceae → Agaricus → Agaricus bisporus](/docs/Taxonomy/Basidiomycota/Agaricomycetes/Agaricales/Agaricaceae/Agaricus/agaricus_bisporus/intro/)

### 🌱 Cultivation Methods

Starlight tabs and asides bundle teks for every skill level—from PF Tek jars to monotubs and commercial
sterile workflows.

Start with the [PF Tek walkthrough](/docs/cultivation/beginner/pf-tek/) or dive into [advanced lab teks](/docs/lab/intro/).

### 🍄 Foraging & Field Guides

Checklists and visual references help you recognize edible species while steering clear of look-alikes.
Launch from the [Foraging primer](/docs/foraging/getting-started/).

### 🧪 Equipment & Lab Setup

Bill of materials, cleanroom layouts, and instrumentation guides keep lab builds precise. Begin with the
[Beginner Lab Setup](/docs/equipment/beginner-lab-setup/).

### ⚗️ Chemistry & Nutrition

Dig into metabolite profiles, nutritional analysis, and extraction protocols in the
[Chemistry & Nutrition section](/docs/chemistry-nutrition/mushroom-nutrition/).

### 📚 Research Library

A curated archive of field notes, historical scans, and database links lives in the
[Research Library](/docs/references/historical-literature/).

## 3. Share Feedback

Found a missing species or want to suggest a navigation improvement? Open an issue or PR so we can keep
iterating on the MycoPedia flight manual.

Happy exploring, and may your cultures thrive!
