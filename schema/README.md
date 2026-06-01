# MycoSci Species Schema

The canonical data model for a fungal species record. Designed to capture *everything*
worth knowing about a mushroom — and to make it free and open, where today it's scattered
and hoarded.

| File | What it is |
|------|------------|
| [`../docs/SPECIES-DATA-MODEL.md`](../docs/SPECIES-DATA-MODEL.md) | **Read this first.** The full human spec: vision, design principles, every field by group, controlled vocabularies, provenance/confidence model, safety policy, exploration/UX, and a phased rollout. |
| `species-model.json` | Machine-readable source of truth: 14 groups, 244 fields, 142 enums, design notes. Generators read this. |
| `species.schema.json` | JSON Schema (draft 2020-12) for API consumers/validation. Enums in `$defs`; `x-tier` and `x-safety` annotations per field. |
| `species.types.ts` | TypeScript interfaces for the canonical record. |
| `species.example.json` | A fully worked example record. |

## Core ideas
- **Three tiers, one schema.** `core` (76 fields — identity + safety, every taxon carries them), `standard` (112), `deep` (56). Stubs enrich into curated without schema churn.
- **Safety-first.** 83 fields are safety-flagged. Edibility defaults to `unknown → treat as inedible`; never auto-classify edible; toxin/antidote data is educational-only, never a treatment guide.
- **Provenance is first-class.** Source, confidence and verification are tracked per field rather than per record.

## Status
Draft v1.0.0. This is the *target* model. The live dataset (`data/species.json`, ~24k taxa)
currently fills only the identity/naming/classification core; everything else enriches over time.
See §10 of the spec for the rollout order. The 244-field model is deliberately ambitious —
see §11 and the over-engineering review before implementing the heavier groups.
