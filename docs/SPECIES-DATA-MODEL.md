# MycoSci Species Data Model

**Status:** Draft specification v1.0.0
**Audience:** MycoSci contributors and developers
**Scope:** The canonical structured representation of a fungal taxon record — its fields, vocabularies, provenance model, and the UX it powers.

---

## 1. Vision

MycoSci exists to flip mycological knowledge from *hoarded* to *open*. The world's fungal data — taxonomy, toxicity, microscopy, sequences, folklore — is scattered across paywalled monographs, siloed databases, and the heads of a few experts. This document defines the single, open, machine-readable shape every fungal taxon takes in MycoSci: one JSON record per taxon concept, CC-licensed, that scales from a one-line stub to a reference-grade monograph without ever changing schema. A species is *data*, not a document. The goal is an accurate skeleton for every taxon and verifiable depth wherever we have it — readable at a glance by a worried forager, queryable by a researcher, and free for anyone to reuse.

---

## 2. Design principles

### 2.1 Tiering — one schema, three altitudes

Every field carries a **tier**. The same TypeScript type and JSON shape describe a stub and a reference-quality record; enrichment is purely additive.

- **`core`** — Identity + the safety triad + the provenance backbone. ~25 fields. A stub is a *valid record* carrying only core fields: `recordId`, `slug`, `recordTier`, `scientificName`, `canonicalName`, `primaryCommonName`, `taxonRank`, `taxonomicStatus`, `acceptedNameUsageId`, the seven Linnaean rank strings, `parentNameUsageId`, the safety triad (`edibilityClass`, `edibilityConfidence`, `toxicityClass`), and provenance (`fieldProvenance`, `references`, `externalLinks`, `verificationLevel`, `recordLicense`).
- **`standard`** — A good profile: key morphology, ecology, distribution, common sensory and safety detail.
- **`deep`** — Expert/rare: microscopy protocol metadata, gene clusters, development ontogeny, folklore detail. NULL for the overwhelming majority of taxa, likely forever.

Every field except the core identity keys is optional. Genus-dependence is handled by nullability plus `not-applicable` enum members — a polypore omits gill fields; an ascomycete omits basidiospore fields.

### 2.2 Progressive enrichment & promotion

`recordTier` is the promotion flag (CLAUDE.md §3). `stub`/`imported` render **client-side** from sharded JSON; `curated`/`featured`/`reference-quality` **pre-render** via `getStaticPaths`. Promotion requires **no code change** — flip `recordTier` and add fields. Build cost scales with curated content, not catalog size.

### 2.3 Provenance & confidence as a first-class layer

Trust is data, not prose. A sparse `fieldProvenance[]` array keyed by dotted field path attaches `{sourceType, confidence, verificationStatus, verifiedBy, reviewedOn}` to any asserted field. The rest inherit the record-level `verificationLevel`. `SourceType` deliberately includes `ai-generated-unverified` and `machine-inference` as distinct flags so the anti-fabrication policy (CLAUDE.md §9) is **enforceable in data**, not just policy.

### 2.4 Safety-first by construction

~80 fields are flagged `safetyRelevant`. The renderer hoists them out of their schema groups into the page header regardless of group order. Hard rules (§9) — never auto-classify edible, treat unknown as caution, gate preparation advice against toxin thermolability — are encoded as build-time lints, not hopes.

### 2.5 Static-site fit

The record is plain JSON with no runtime dependencies. Core fields are small enough that a shard of thousands of stubs stays under the ~200 KB target (`public/data/species/{first-letter}.json`). Deep arrays (media, toxins, microscopy, provenance) only materialize on curated records. One search index reads the same canonical record: Pagefind over pre-rendered curated pages, MiniSearch/Orama over the flat stub fields.

> **Grounding note.** The current raw source is `data/species.csv` / `data/taxonomy.csv` — essentially *name + 7 ranks* for a few hundred species, with a small set of hand-written MDX profiles. This schema describes the *target* shape. See §10 for the phased path that ships **core-first** and treats `deep` as out-of-scope-for-now. Do not build renderers or indexes for deep fields until real records carry them.

---

## 3. The data model

14 groups, ordered by record narrative. Tier legend: **C** = core, **S** = standard, **D** = deep. Safety column: ⚠ = `safetyRelevant`.

### 3.1 Identity & Record

The minimal anchor every taxon carries.

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `recordId` | string | C | | | Stable internal primary key for the taxon concept; survives renames. |
| `slug` | string | C | | | Lowercase hyphenated; stable URL component and shard key (first letter). |
| `recordTier` | enum | C | RecordTier | | Drives static pre-render vs client-fetch fallback. |
| `scientificName` | string | C | | ⚠ | Canonical accepted name **with** authorship. Identity anchor for all safety records. |
| `canonicalName` | string | C | | | Name without authorship, for search/joins/display. |
| `primaryCommonName` | string | C | | ⚠ | Single canonical English vernacular. Full set lives in `culture.vernacularNames`. |
| `taxonRank` | enum | C | TaxonRank | | Rank of THIS record. |
| `taxonomicStatus` | enum | C | TaxonomicStatus | ⚠ | Accepted vs synonym/misapplied. A toxic species may be searched under a synonym. |
| `acceptedNameUsageId` | string | C | | ⚠ | If a synonym, points to the accepted taxon `recordId`. |

### 3.2 Naming & Nomenclature

The ICN naming layer.

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `authorship` | string | C | | | Complete authority incl. parentheses, ex-author, combining author. |
| `basionymAuthorship` | string | S | | | Parenthetical author(s) of the basionym. |
| `combinationAuthorship` | string | S | | | Author of the current combination (outside parentheses). |
| `namePublishedInYear` | integer (year) | C | | | Year the accepted name was validly published. |
| `nomenclaturalCode` | enum | S | NomenclaturalCode | | Fungi default to ICN; dark taxa may use UNITE SH / provisional. |
| `nomenclaturalStatus` | enum | S | NomenclaturalStatus | | ICN name-level standing, orthogonal to taxonomic acceptance. |
| `sanctioningStatus` | enum | D | SanctioningStatus | | Fries/Persoon sanctioning confers priority (ICN Art. F.7). |
| `basionymName` | string | S | | | Original name the current combination is based on. |
| `synonyms` | array\<Synonym> | S | | ⚠ | Each `{name, authorship, synonymType, registryId, year}`. Searches under any synonym must resolve to the accepted toxic taxon. |
| `misappliedNames` | array\<MisappliedName> | D | | ⚠ | Names erroneously applied in literature; major source of ID/poisoning confusion. |
| `orthographicVariants` | array\<string> | D | | | Spelling variants/corrigenda to aid matching. |
| `typeStatus` | enum | S | TypeStatus | | Kind of name-bearing type. Epitypes heavily used in fungi for DNA reference. |
| `typeSpecimenCitation` | string | D | | | Free-text citation of the type as published. |
| `typeHerbariumCode` | string | D | | | Index Herbariorum acronym holding the type. |
| `typeLocality` | string | S | | | Place where the type was collected. Coordinates belong to distribution. |
| `protologueCitation` | string | D | | | Bibliographic citation of the original description. |
| `etymology` | string | S | | | Derivation/meaning of the epithet. |
| `etymologyRootLanguage` | enum | D | EtymologyRoot | | Source of the epithet's derivation. |
| `anamorphTeleomorphLink` | object | D | | ⚠ | Pre-2011 dual nomenclature linkage; track suppressed name. Toxin producers often known under the anamorph. |

### 3.3 Classification & Phylogeny

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `kingdom` | string | C | | | |
| `phylum` | string | C | | | Canonical higher-rank home; molecular placement de-duped here. |
| `class` | string | C | | | |
| `order` | string | C | | | |
| `family` | string | C | | | |
| `genus` | string | C | | | |
| `specificEpithet` | string | C | | | |
| `infraspecificEpithet` | string | S | | | Epithet for subspecies/variety/form. |
| `infraspecificRankMarker` | enum | S | InfraspecificRankMarker | | |
| `intermediateRanks` | object | D | | | Sparse map of populated intermediate/infrageneric ranks. |
| `classificationPath` | array\<RankName> | S | | | Ordered rank→name pairs for breadcrumbs. **Derived at build time** (see §10). |
| `parentNameUsageId` | string | C | | | Direct parent `recordId`; **canonical hierarchy representation**. |
| `speciesComplex` | string | S | | ⚠ | Cryptic-species grouping. Matters when toxicity differs across members. |
| `crypticSpeciesFlag` | boolean | S | | ⚠ | Morphologically similar but genetically distinct species confused under this name. |
| `phylogeneticClade` | string | D | | | Finest-resolution molecular clade/section. |
| `sisterTaxa` | array\<string> | S | | ⚠ | Closest relatives by molecular phylogeny; lookalike/safety context. |
| `placementConfidence` | enum | S | PlacementConfidence | | How settled the placement/acceptance is. |
| `recentReclassification` | string | D | | ⚠ | Genus transfers/splits that change which safety profile a name maps to. |

### 3.4 Macroscopic Morphology

Naked-eye features. Genus-dependent and mostly nullable; `basidiomeType` gates which subfields apply.

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `basidiomeType` | enum | C | BasidiomeType | | Gross form; gates downstream morphology fields. |
| `growthHabit` | enum | S | GrowthHabit | | |
| `capDiameter` | range (mm) | C | | | |
| `capShape` | array\<enum> | C | CapShape | | Profile(s) across maturity. |
| `capColor` | array\<enum> | C | ColorPrimary | | Pair with chart code via provenance for precise hue. |
| `capSurfaceTexture` | array\<enum> | C | SurfaceTexture | | |
| `capSurfaceOrnamentation` | enum | S | CapOrnamentation | ⚠ | Distinguishes Amanita warts vs Lepiota scales. |
| `hymenophoreType` | enum | C | HymenophoreType | | Gates gill vs pore vs tooth subfields. |
| `gillAttachment` | enum | C | GillAttachment | ⚠ | Free gills + volva ⇒ Amanita. |
| `gillSpacing` | enum | S | GillSpacing | | |
| `gillColor` | array\<enum> | C | ColorPrimary | ⚠ | Often tracks spore color. |
| `poreSurfaceColor` | array\<enum> | S | ColorPrimary | ⚠ | Red pores + blue staining = caution (boletes). |
| `poreDensity` | range (pores/mm) | S | | | Polypore character; null for non-poroid taxa. |
| `toothLength` | range (mm) | S | | | Hydnoid taxa only. |
| `stipePresent` | boolean | C | | | |
| `stipeDimensions` | object `{length:range, width:range}` | C | | | |
| `stipeColor` | array\<enum> | C | ColorPrimary | | |
| `stipeSurfaceTexture` | array\<enum> | S | SurfaceTexture | | |
| `annulusPresence` | enum | C | AnnulusPresence | ⚠ | Critical safety character (Amanita/Lepiota have rings). |
| `cortinaPresence` | boolean | S | | ⚠ | Defines Cortinarius (orellanine genus). |
| `volvaPresence` | enum | C | VolvaPresence | ⚠ | **THE** key Amanita safety character. |
| `stipeBaseShape` | enum | S | StipeBaseShape | ⚠ | Marginate/abrupt bulb is an Amanita warning sign. |
| `basalMycelium` | enum | D | BasalMycelium | | Black bootlace rhizomorphs typify Armillaria. |
| `fleshColor` | array\<enum> | C | ColorPrimary | | |
| `fleshColorChangeOnCut` | string | C | | ⚠ | Oxidation change; major bolete safety character. |
| `latexPresence` | boolean | C | | ⚠ | Defines Lactarius/Lactifluus. |
| `latexColorFresh` | enum | S | LatexColor | ⚠ | |
| `latexColorChange` | string | S | | ⚠ | Major Lactarius diagnostic. |
| `sporePrintColor` | enum | C | SporePrintColor | ⚠ | Foundational keying & safety discriminator. Microscopy owns the chart-coded variant. |
| `odor` | array\<enum> | C | OdorDescriptor | ⚠ | Phenolic flags toxic Agaricus; fetid flags Phallaceae. |
| `taste` | enum | C | TasteDescriptor | ⚠ | Chew-and-spit ONLY. Never swallow; never taste suspected Amanita/Cortinarius. |
| `bruisingReaction` | object `{description, color, speed}` | C | BruisingColor/BruisingSpeed | ⚠ | Bluing ⇒ possible psilocybin. |
| `glebaDescription` | object | S | | ⚠ | Cut-young-white test distinguishes puffballs from Amanita eggs. |
| `autodigestionDeliquescence` | boolean | S | | ⚠ | Inky dissolution (Coprinus s.l.); coprine context. |
| `luminescence` | boolean | D | | | |
| `basidiomeDevelopmentType` | enum | D | DevelopmentType | | Reijnders/Kühner ontogeny terminology. |
| `fruitingBodyTexture` | enum | S | FruitbodyTexture | | Separates soft agarics from woody polypores. |

### 3.5 Microscopy & Anatomy

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `basidiosporeDimensions` | object `{length, width, lengthMean?, widthMean?}` | C | | | Apiculus/ornamentation excluded unless protocol notes otherwise. |
| `qRatio` | object `{range, mean?}` | S | | | Shape descriptor (Q≈1 globose). |
| `basidiosporeShape` | enum | C | SporeShape | | |
| `basidiosporeOrnamentation` | enum | S | SporeOrnamentation | | |
| `basidiosporeReactionMelzer` | enum | C | AmyloidReaction | ⚠ | Amyloid spores part of toxic Amanita sect. Phalloideae ID. |
| `basidiosporeGermPore` | enum | S | GermPore | ⚠ | Diagnostic for psychoactive dark-spored genera (Psilocybe, Panaeolus). |
| `basidiaShape` | enum | S | BasidiaShape | | |
| `basidiaSterigmataNumber` | enum | S | SterigmataNumber | | 2- vs 4-spored affects spore size/ploidy. |
| `cheilocystidia` | object `{presence, shapes[], size?}` | S | CystidiaPresence/CystidiaShape | | Gill-edge cystidia; primary species character. |
| `pleurocystidia` | object | S | CystidiaPresence/CystidiaShape | | Metuloids diagnostic in Inocybe/Pluteus. |
| `hyphalSystem` | enum | S | HyphalSystem | | Central to polypore taxonomy. |
| `clampConnections` | enum | S | ClampConnections | | Core genus-level character. |
| `tramaType` | enum | S | TramaType | | Bilateral (Amanita, Pluteus); with-sphaerocytes defines Russulales. |
| `pileipellisType` | enum | S | PileipellisType | | Correlates with cap viscidity. |
| `setaePresence` | enum | D | SetaePresence | | Dark setae define Hymenochaetaceae. |
| `crystalsPresence` | enum | D | CrystalsPresence | | Acanthocytes diagnostic for Stropharia. |
| `ascusType` | enum | D | AscusType | | Operculate vs inoperculate fundamental for ascomycetes. |
| `ascosporeFeatures` | object `{shape, size?, ornamentation?}` | D | | | Muriform/reticulate diagnostic in Morchella/Tuber. |
| `measurementProtocol` | object | S | MountingMedium (nested) | | **Mandatory context** for reproducible micro-measurements; medium changes measured size. |
| *(proposed)* `sporeColorInMount` | enum | S | ColorPrimary | | Hyaline vs pigmented spores in KOH — a keying character distinct from print color. (Critic gap; reserve key.) |

### 3.6 Chemistry, Toxins & Medicinal

Owns compound identity and the hazard axis.

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `toxicityClass` | enum | C | ToxicityClass | ⚠ | Hazard axis, orthogonal to culinary edibility. |
| `primaryToxidrome` | enum | C | Toxidrome | ⚠ | |
| `secondaryToxidromes` | array\<enum> | S | Toxidrome | ⚠ | Many amatoxin species also cause early GI symptoms. |
| `onsetCategory` | enum | C | OnsetCategory | ⚠ | Delayed onset (>6h) is the danger flag. |
| `onsetTimeRange` | range (h) | S | | ⚠ | |
| `toxins` | array\<Compound> | C | ToxinCompoundClass (nested) | ⚠ | Per-toxin nested objects. CID/CAS realistic placeholders if unverified. |
| `lethalDoseHuman` | string | S | | ⚠ | Hazard **context only** — never a "safe sub-lethal amount." See §9. |
| `targetOrgans` | array\<enum> | C | TargetOrgan | ⚠ | |
| `antidotes` | array\<enum> | S | Antidote | ⚠ | Antidote **class, never dose**. Educational only; UI surfaces medical-caution Aside. |
| `toxinThermolability` | enum | S | ToxinThermolability | ⚠ | Amatoxins heat_stable; gates edibility prep validity. |
| `psychoactiveStatus` | enum | C | PsychoactiveStatus | ⚠ | |
| `psychoactiveCompounds` | array\<Compound> | S | | ⚠ | psilocybin/psilocin/baeocystin/muscimol/ibotenic_acid. |
| `medicinalCompounds` | array\<Compound> | S | MedicinalCompoundClass (nested) | | Per-compound activity + evidenceGrade. |
| `medicinalEvidenceGrade` | enum | S | MedicinalEvidenceGrade | ⚠ | Anti-overclaim gate. |
| `nutritionalComposition` | object | D | | | Owned here; edibility references via provenance. |
| `bioaccumulatorFlag` | enum | C | BioaccumulatorFlag | ⚠ | Quick wild-harvest safety flag even when edible. |
| `bioaccumulationProfile` | array\<BioaccumEntry> | S | BioaccumElement | ⚠ | Per-element concentration + bioconcentration factor. |
| `allergenProfile` | array\<enum> | S | AllergenProfile | ⚠ | |
| `bluingReaction` | enum | S | BluingReaction | ⚠ | Bluing in Psilocybe = presumptive psilocin; in boletes = variegatic acid (unrelated). |
| `macrochemicalReactions` | array\<SpotTest> | D | MacrochemicalReagent (nested) | ⚠ | Schaeffer cross-reaction separates edible from toxic Agaricus. |
| `pigmentChemistry` | array\<Pigment> | D | PigmentClass (nested) | | Underlies bluing/staining. |
| `legalScheduleStatus` | enum | S | LegalScheduleStatus | ⚠ | Coarse flag; jurisdiction detail in notes. |

### 3.7 Edibility & Safety

The actionable safety layer.

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `edibilityClass` | enum | C | EdibilityClass | ⚠ | Single authoritative classification; pick the most conservative applicable value. Never auto-classify. |
| `edibilityConfidence` | enum | C | EdibilityConfidence | ⚠ | Drives whether a caution Aside is surfaced. |
| `edibilityRationale` | array\<string> | C | | ⚠ | Why this classification. |
| `noviceSafetyRating` | enum | C | NoviceSafetyRating | ⚠ | Forager-skill gate factoring lookalike danger. |
| `deadlyLookalikeRisk` | enum | C | LookalikeRiskLevel | ⚠ | Summary flag; detail in `dangerousLookalikes`. |
| `toxicWhenRaw` | boolean | C | | ⚠ | For species edible only when cooked. |
| `preparationRequirement` | array\<PrepStep> | C | PreparationStep (nested) | ⚠ | Ordered steps. Validity **gated by `chemistry.toxinThermolability`**. |
| `alcoholInteraction` | enum | C | AlcoholInteraction | ⚠ | Coprine reaction window up to ~72h. |
| `dangerousLookalikes` | array\<Lookalike> | C | EdibilityClass/ConfusionDirection/LookalikeRiskLevel (nested) | ⚠ | Per-lookalike comparison; must be reciprocal (build lint, §9). |
| `keyDistinguishingTests` | array\<string> | S | | ⚠ | |
| `firstTimeTrialAdvice` | string | S | | ⚠ | |
| `individualIdiosyncrasyRisk` | boolean | D | | ⚠ | Otherwise-edible species causing reactions in some individuals. |
| `tasteRating` | enum | S | TasteRating | | Gastronomic quality, separate from safety. |
| `flavorProfile` | array\<enum> | S | FlavorProfile | | |
| `aromaDescriptors` | array\<enum> | S | AromaDescriptor | | Some double as toxicity signals. |
| `textureCooked` | array\<enum> | S | TextureCooked | | |
| `culinaryUses` | array\<enum> | S | CulinaryUse | | |
| `preservationMethods` | array\<enum> | S | PreservationMethod | | |
| `commercialFoodStatus` | enum | S | CommercialFoodStatus | | |
| `regionalEdibilityVariation` | string | D | | ⚠ | A single global enum + prose cannot fully drive a "safe in my region" query (critic gap). |
| `specialPopulationCaution` | string | D | | ⚠ | Children, pregnancy, immunocompromised advisories. |

### 3.8 Ecology & Habitat

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `trophicMode` | enum | C | TrophicMode | | Canonical owner; gates cultivability. FungalTraits/FUNGuild aligned. |
| `trophicModeSecondary` | array\<enum> | S | TrophicMode | | |
| `decayType` | enum | S | DecayType | | |
| `substrateType` | array\<enum> | C | SubstrateType | ⚠ | Wild substrate. Lab substrate lives in cultivation. |
| `hostAssociations` | array\<HostAssoc> | C | HostRelationship/HostSpecificity (nested) | ⚠ | Critical foraging ID cue. |
| `hostBreadthClass` | enum | S | HostBreadthClass | ⚠ | Hardwood vs conifer matters for ID. |
| `habitatType` | array\<enum> | C | HabitatType | | |
| `climateClass` | enum | S | ClimateClass | | |
| `soilPreference` | array\<enum> | D | SoilPreference | | Wild edaphic preference. |
| `soilPhRange` | range (pH) | D | | | |
| `moisturePreference` | enum | D | MoisturePreference | | |
| `fruitingSeason` | array\<enum> | C | FruitingSeason | ⚠ | Hemisphere-normalized; pair with `phenologyHemisphere`. Top foraging cue. |
| `phenologyHemisphere` | enum | S | PhenologyHemisphere | | |
| `fruitingTriggers` | array\<enum> | D | FruitingTriggers | | Wild cues; rainfall-driven for tropical taxa. |
| `fruitingPosition` | enum | S | FruitingPosition | | Truffles hypogeous; affects detection. |
| `ecologicalRole` | array\<enum> | D | EcologicalRole | | |
| `indicatorSpeciesRole` | enum | D | IndicatorSpeciesRole | | |
| `iucnStatus` | enum | S | IucnStatus | | |
| `abundance` | enum | S | Abundance | ⚠ | |
| `legalProtection` | array\<LegalProtection> | D | | ⚠ | Some countries restrict harvesting. |
| `habitatNotes` | string | S | | | Replaces legacy free-text habitat field. |

### 3.9 Distribution & Biogeography

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `nativeStatus` | enum | S | NativeStatus | | |
| `nativeRange` | string | C | | | |
| `countryDistribution` | array\<string> | C | | | ISO 3166-1 alpha-2 codes. |
| `introducedRange` | array\<string> | S | | | ISO codes where introduced/naturalized. |
| `distributionPattern` | enum | S | DistributionPattern | | |
| `biogeographicRealm` | array\<enum> | S | BiogeographicRealm | | |
| `elevationRange` | range (m) | S | | | |
| `occurrenceCentroid` | geo `{lat, lon}` | D | | | |
| `occurrenceBoundingBox` | object | D | | | |
| `gbifOccurrenceCount` | integer | S | | | Documentation richness proxy, **not** true abundance. |
| `inatObservationCount` | integer | S | | | Encounter/photo frequency proxy; feeds MycoGram. |
| `rangeExpansionNotes` | string | D | | | |

### 3.10 Cultivation & Lab

Cultivability gated by `ecology.trophicMode`. Suppressed entirely for uncultivable taxa.

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `cultivable` | boolean | C | | | Ectomycorrhizal species generally cannot be fruited indoors. |
| `cultivationDifficulty` | enum | C | CultivationDifficulty | | |
| `primaryCultivationMethod` | enum | S | CultivationMethod | | |
| `agarMediaRecommended` | array\<enum> | S | AgarMedia | | |
| `spawnTypes` | array\<enum> | S | SpawnType | | |
| `bulkSubstrates` | array\<enum> | S | BulkSubstrate | | |
| `colonizationTempRange` | range (°C) | S | | | |
| `fruitingTempRange` | range (°C) | S | | | Lab/induced; wild fruiting temp lives in ecology. |
| `fruitingHumidityRange` | range (% RH) | S | | | |
| `fruitingCO2Range` | range (ppm) | D | | | |
| `freshAirExchangeRate` | enum | S | FreshAirExchangeRate | | |
| `lightRequirement` | enum | S | LightRequirement | | |
| `pinningTriggers` | array\<enum> | S | PinningTriggers | | |
| `totalCycleTime` | range (days) | S | | | |
| `biologicalEfficiency` | range (% BE) | S | | | |
| `contaminationSusceptibility` | enum | S | ContaminationSusceptibility | | |
| `commonContaminants` | array\<enum> | D | CommonContaminant | | |
| `senescenceSusceptibility` | enum | S | SenescenceSusceptibility | | Differentiator content area for the gene-science pillar. |
| `degradationSymptoms` | array\<enum> | D | DegradationSymptom | | |
| `longTermStorageMethods` | array\<enum> | S | StorageMethod | | Cryo is gold standard to arrest senescence. |
| `sclerotiaFormation` | boolean | S | | ⚠ | Psilocybe "truffles," Wolfiporia. Alternate cultivation product. |
| `recommendedStrains` | array\<Strain> | S | | ⚠ | For psychoactive species, strain list is safety-relevant. |
| `commercialViability` | enum | S | CommercialViability | | |
| `logCultivationSuitable` | boolean | D | | | |
| `legalCultivationNote` | string | S | | ⚠ | Flags where growing (esp. psychoactive) is controlled. |

### 3.11 Genetics & Molecular

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `matingSystem` | enum | S | MatingSystem | | Canonical owner; cultivation references it. |
| `matingTypeSystem` | enum | D | MatingTypeArchitecture | | |
| `ploidy` | enum | S | PloidyState | | Basidiomycota vegetative phase typically dikaryotic. |
| `chromosomeCount` | integer | D | | | From PFGE or genome assembly. |
| `itsBarcode` | object `{available, accessions[], lengthBp?}` | C | | | ITS = formal fungal barcode. Accessions are placeholders unless verified. |
| `uniteSpeciesHypothesis` | string | S | | | DOI-backed SH clustering ITS; critical for dark taxa. |
| `otherMarkers` | array\<MarkerAccession> | D | GeneticMarker (nested) | | LSU/SSU/RPB2/TEF1/TUB2 etc. |
| `recommendedBarcodeMarker` | enum | S | RecommendedBarcodeMarker | | Best-practice marker(s) for confident ID. |
| `exTypeSequence` | object | S | TypeStatus (nested) | | Highest molecular-ID provenance tier. |
| `genome` | object | S | AssemblyLevel (nested) | | Assembly accessions, size, level, BUSCO. |
| `intraspecificVariation` | enum | D | IntraspecificVariation | | |
| `populationStructure` | string | D | | | |
| `toxinGeneClusters` | array\<GeneCluster> | D | | ⚠ | amatoxin MSDIN+POPB, aflatoxin PKS, etc. |
| `psilocybinGeneCluster` | object `{present, genes[]}` | D | | ⚠ | psiD/psiK/psiM/psiH. Molecular marker of psychoactivity. |
| `mlstScheme` | string | D | | | |
| `environmentalSequenceOnly` | boolean | D | | | "Dark taxon" flag for SH-based provisional names. |

### 3.12 Ethnomycology & History (`culture`)

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `vernacularNames` | array\<VernacularName> | C | NameUsageStatus (nested) | ⚠ | Owns the provenanced multilingual set; `primaryCommonName` denormalizes the English preferred. |
| `indigenousNames` | array\<IndigenousName> | D | | | Handle with cultural sensitivity; see `culturalSensitivityFlag`. |
| `originalDescriber` | array\<Describer> | S | | | Human-readable describers with role; links to `historicalFigures`. |
| `discoveryNarrative` | string | D | | | |
| `historicalFigures` | array\<HistoricalFigure> | D | | | |
| `folkloreAndMythology` | array\<FolkloreEntry> | D | | | |
| `traditionalUses` | array\<TraditionalUse> | S | UseType (nested) | ⚠ | Ethnographic record, **never** read as endorsement. |
| `notablePoisoningCases` | array\<PoisoningCase> | S | PoisoningOutcome (nested) | ⚠ | `verified` flag distinguishes documented vs anecdotal. |
| `referencesInCulture` | array\<CultureReference> | D | MediaReferenceType (nested) | | Art, literature, film, games, stamps. |
| `culturalSignificance` | string | S | | | |
| `popularMisconceptions` | array\<Misconception> | D | | ⚠ | e.g. "cooking makes it safe" debunk. |
| `culturalSensitivityFlag` | enum | D | CulturalSensitivityFlag | | Marks Indigenous/sacred/restricted knowledge. |

### 3.13 Media

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `media` | array\<MediaAsset> | C | (see MediaAsset interface) | ⚠ | Independently-licensed assets. A misID'd image is a safety hazard. Default license `unknown` blocks redistribution. |
| `primaryImageId` | string | C | | | FK into `media[]` for the hero image. |
| `hasMicroscopy` | boolean | D | | | Facet flag for deep-search index. |

### 3.14 Provenance & Data Quality

Cross-cutting. See §7 for the model.

| Key | Type / Unit | Tier | Enum | Safe | Notes |
|---|---|---|---|---|---|
| `fieldProvenance` | array\<FieldProvenance> | C | SourceType/ConfidenceLevel/FieldVerificationStatus (nested) | ⚠ | THE cross-cutting structure: attaches source/confidence/verification to any field path. Sparse. |
| `references` | array\<Reference> | C | ReferenceType (nested) | | Bibliography backing the record. `fieldProvenance` cites these by `refId`. |
| `externalLinks` | array\<ExternalLink> | C | ExternalAuthority/LinkRelationship (nested) | | Canonical cross-references; identity resolution depends on them. |
| `dataCompletenessScore` | number (0-1) | S | | | Tier-weighted fraction of expected fields populated; drives curation prompts. |
| `verificationLevel` | enum | C | RecordVerificationLevel | ⚠ | Record-level trust badge; gates how strongly edibility claims are presented. |
| `lastReviewedDate` | date | S | | | |
| `contributors` | array\<Contributor> | S | ContributorRole (nested) | | Supports attribution and leaderboard. |
| `disputeFlags` | array\<DisputeFlag> | S | DisputeStatus (nested) | ⚠ | Safety-relevant on edibility; surfaces a caution banner until resolved. |
| `recordLicense` | enum | C | RecordLicense | | License of the MycoSci record itself, DISTINCT from per-asset media licenses. |
| `schemaVersion` | string | D | | | For migration safety as stubs enrich. |

---

## 4. Controlled vocabularies

Enums are centralized once and referenced by `enumRef`. Multi-valued descriptive fields are arrays of the enum because real taxa span several values. Genus-dependence uses `not-applicable` members so a polypore can populate `hymenophoreType: poroid-tubes` and skip gill fields cleanly.

> **Vocabulary policy (v1).** Fully spec the *safety-relevant* enums now (`EdibilityClass`, `ToxicityClass`, `Toxidrome`, `OnsetCategory`, `SporePrintColor`, `VolvaPresence`, `AnnulusPresence`). Treat the long morphology/microscopy vocabularies as **extensible** — ship the commonly-used values and grow from real curation demand rather than maintaining 30–40-value lists no record uses yet.

### Identity / naming / classification

- **RecordTier:** `stub`, `imported`, `in-progress`, `curated`, `featured`, `reference-quality`
- **TaxonRank:** `kingdom`, `subkingdom`, `phylum`, `subphylum`, `class`, `subclass`, `superorder`, `order`, `suborder`, `family`, `subfamily`, `tribe`, `subtribe`, `genus`, `subgenus`, `section`, `subsection`, `series`, `species`, `subspecies`, `variety`, `subvariety`, `form`, `forma_specialis`, `aggregate`, `species_complex`, `clade_unranked`
- **TaxonomicStatus:** `accepted`, `synonym`, `homotypic_synonym`, `heterotypic_synonym`, `basionym`, `misapplied`, `provisional`, `doubtful_dubious`, `ambiguous`, `unplaced`, `excluded`, `deleted_orphaned`
- **NomenclaturalCode:** `ICN`, `ICNP_provisional`, `SH_UNITE`, `unranked_environmental`, `ICZN_misapplied`
- **NomenclaturalStatus:** `legitimate`, `illegitimate`, `invalid_nom_inval`, `nomen_nudum`, `nomen_dubium`, `nomen_conservandum`, `nomen_rejiciendum`, `nomen_novum`, `nomen_provisorium`, `superfluous`, `later_homonym`, `orthographic_variant`, `sanctioned`
- **SanctioningStatus:** `sanctioned_fries`, `sanctioned_persoon`, `none`
- **TypeStatus:** `holotype`, `lectotype`, `neotype`, `epitype`, `isotype`, `syntype`, `paratype`, `topotype`, `ex-type_culture`, `ex-holotype`, `ex-epitype`, `ex-neotype`, `ex-lectotype`, `authentic-strain`, `no_type_designated`, `type_lost`, `type_destroyed`, `not-type-derived`, `unknown`
- **SynonymType:** `homotypic`, `heterotypic`, `pro_parte`
- **InfraspecificRankMarker:** `subsp.`, `var.`, `subvar.`, `f.`, `f.sp.`, `ser.`, `sect.`, `subg.`
- **EtymologyRoot:** `greek`, `latin`, `eponym`, `toponym`, `vernacular_derived`, `other`
- **PlacementConfidence:** `high`, `medium`, `low`, `contested`, `unresolved`

### Morphology

- **BasidiomeType:** `agaricoid`, `boletoid`, `polyporoid`, `hydnoid`, `clavarioid`, `cantharelloid`, `gasteroid`, `secotioid`, `resupinate`, `cyphelloid`, `corticioid`, `stereoid`, `tremelloid`, `apothecial`, `perithecial`, `stromatic`, `morchelloid`, `helvelloid`, `geoglossoid`, `pezizoid`, `truffle-hypogeous`, `puffball`, `earthstar`, `stinkhorn`, `birds-nest`, `jelly`, `bracket`, `other`
- **GrowthHabit:** `solitary`, `scattered`, `gregarious`, `caespitose`, `fasciculate`, `connate`, `imbricate`, `effused`, `troops`, `fairy-ring`, `clustered-at-base`, `single-on-substrate`
- **CapShape:** `conical`, `campanulate`, `convex`, `plano-convex`, `applanate`, `plane`, `depressed`, `infundibuliform`, `umbilicate`, `umbonate`, `papillate`, `hemispherical`, `parabolic`, `ovoid`, `ungulate`, `flabelliform`, `reniform`, `irregular`, `not-applicable`
- **SurfaceTexture** *(shared cap & stipe):* `glabrous`, `smooth`, `viscid`, `glutinous`, `dry`, `velvety`, `tomentose`, `fibrillose`, `squamulose`, `squamose`, `verrucose`, `granulose`, `pruinose`, `rugose`, `reticulate`, `areolate`, `rimose`, `floccose`, `strigose`, `scabrous`, `punctate`, `hygrophanous-appearance`, `not-applicable`
- **CapOrnamentation:** `none`, `universal-veil-warts`, `universal-veil-patches`, `volval-patches`, `fibrillose-scales`, `recurved-scales`, `appressed-scales`, `concentric-scales`, `granular-veil`, `floccose-veil-remnants`, `areolae`, `not-applicable`
- **ColorPrimary** *(shared cap/gill/pore/stipe/flesh/tooth):* `white`, `cream`, `ivory`, `yellow`, `ochre`, `orange`, `tan`, `buff`, `brown`, `red-brown`, `cinnamon`, `red`, `pink`, `salmon`, `purple`, `violet`, `lilac`, `blue`, `green`, `olive`, `grey`, `black`, `multicolored`, `variable`, `concolorous-with-cap`, `not-applicable`
- **HymenophoreType:** `lamellate-gills`, `poroid-tubes`, `hydnoid-teeth`, `lamellate-ridges-false-gills`, `veined-wrinkled`, `smooth-even`, `gasteroid-internal`, `labyrinthine`, `daedaleoid`, `merulioid`, `none`, `not-applicable`
- **GillAttachment:** `free`, `remote`, `adnexed`, `adnate`, `sinuate`, `emarginate`, `decurrent`, `subdecurrent`, `deeply-decurrent`, `seceding`, `collariate`, `uncinate`, `not-applicable`
- **GillSpacing:** `distant`, `subdistant`, `close`, `crowded`, `very-crowded`, `not-applicable`
- **AnnulusPresence:** `absent`, `present`, `present-membranous`, `present-fibrillose`, `cortina-only`, `ring-zone-only`, `fugacious-evanescent`, `double`, `movable`, `present-pendant`, `not-applicable`
- **VolvaPresence:** `absent`, `present`, `saccate-cup`, `circumscissile-rim`, `friable-rings`, `floccose-bands`, `marginate-bulb`, `limbate`, `volval-patches-only`, `not-applicable`
- **StipeBaseShape:** `equal`, `tapered`, `clavate`, `bulbous`, `marginate-bulb`, `abruptly-bulbous`, `napiform`, `rooting-radicating`, `pseudorhiza`, `attached-to-rhizomorphs`, `mycelial-pad`, `not-applicable`
- **BasalMycelium:** `none`, `white-mycelial-pad`, `colored-mycelium`, `rhizomorphs`, `white-rhizomorphs`, `black-rhizomorphs-bootlaces`, `tomentose-base`, `not-applicable`
- **LatexColor:** `white`, `cream`, `yellow`, `orange`, `red`, `blood-red`, `carrot-orange`, `blue`, `violet`, `watery`, `watery-white`, `clear`, `not-applicable`
- **SporePrintColor:** `white`, `cream`, `pale-yellow`, `yellow`, `ochre`, `pink`, `salmon`, `pinkish-buff`, `rust-brown`, `cinnamon-brown`, `clay-brown`, `brown`, `dark-brown`, `purple-brown`, `chocolate-brown`, `black`, `olive`, `green`, `lilac`, `not-applicable`, `unknown`
- **OdorDescriptor:** `indistinct`, `none`, `farinaceous-mealy`, `cucumber`, `fishy`, `spermatic`, `aniseed`, `almond-marzipan`, `fruity`, `apricot`, `fragrant`, `sweet`, `sickly_sweet`, `honey`, `coconut`, `maple-syrup-fenugreek`, `garlic`, `radish-raphanoid`, `cabbage`, `rubber`, `chlorine-bleach`, `phenolic`, `iodoform-medicinal`, `coal-tar`, `earthy`, `mushroomy`, `spicy`, `pungent`, `foul-fetid`, `ammoniacal`, `skunk-like`, `metallic`, `green-corn`
- **TasteDescriptor** *(chew-and-spit only):* `mild`, `pleasant`, `nutty`, `sweet`, `bitter`, `very-bitter`, `acrid`, `peppery-hot`, `burning-acrid`, `tardily-acrid`, `sour`, `astringent`, `metallic`, `unpleasant`, `farinaceous`, `not-tested`
- **BruisingColor:** `none`, `blue`, `blue-green`, `green`, `red`, `reddish`, `pink`, `brown`, `black`, `yellow`, `saffron`, `grey`, `vinaceous`, `not-applicable`
- **BruisingSpeed:** `immediate`, `rapid-under-1min`, `moderate-1-5min`, `slow-over-5min`, `none`, `not-applicable`
- **DevelopmentType:** `gymnocarpic`, `angiocarpic`, `hemiangiocarpic`, `pseudoangiocarpic`, `pileostipitocarpic`, `bivelangiocarpic`, `metavelangiocarpic`, `paravelangiocarpic`, `monovelangiocarpic`, `not-applicable`
- **FruitbodyTexture:** `fleshy`, `leathery`, `corky`, `woody`, `gelatinous`, `membranous`, `brittle`, `cartilaginous`, `waxy`, `papery`, `fibrous-tough`

### Microscopy

- **SporeShape:** `globose`, `subglobose`, `broadly-ellipsoid`, `ellipsoid`, `ovoid`, `obovoid`, `amygdaliform`, `limoniform`, `fusiform`, `cylindrical`, `allantoid`, `reniform`, `phaseoliform`, `navicular`, `tetrahedral`, `stellate`, `angular`, `nodulose`, `polygonal`, `lacrymoid`, `citriform`, `boletoid`, `other`
- **SporeOrnamentation:** `smooth`, `punctate`, `verrucose-warts`, `spiny-echinulate`, `warts-connected-by-ridges`, `reticulate`, `partially-reticulate`, `ridged-costate`, `winged-alate`, `cristate`, `striate`, `pitted-foveolate`, `nodulose-angular`, `verrucose-low`, `unknown`
- **AmyloidReaction:** `amyloid`, `weakly-amyloid`, `inamyloid`, `dextrinoid`, `weakly-dextrinoid`, `mixed`, `not-tested`, `unknown`
- **GermPore:** `present-distinct`, `present-broad`, `present-truncate`, `present-indistinct`, `eccentric`, `absent`, `unknown`
- **BasidiaShape:** `clavate`, `cylindrical`, `subcylindrical`, `narrowly-clavate`, `utriform`, `suburniform`, `pyriform`, `sphaeropedunculate`, `ventricose`, `unknown`
- **SterigmataNumber:** `1`, `2`, `2-4`, `4`, `4-6`, `6`, `8`, `variable`, `unknown`
- **CystidiaPresence:** `abundant`, `frequent`, `scattered`, `rare`, `absent`, `present`, `unknown`
- **CystidiaShape:** `clavate`, `cylindrical`, `fusiform`, `fusiform-ventricose`, `lageniform`, `utriform`, `lecythiform-capitate`, `capitate`, `subcapitate`, `ventricose`, `mucronate`, `rostrate`, `flexuous`, `sphaeropedunculate`, `metuloid`, `lamprocystidia`, `gloeocystidia`, `macrocystidia`, `hooked-with-crystals`, `versiform`, `cystidioles`, `unknown`
- **HyphalSystem:** `monomitic`, `dimitic`, `trimitic`, `monomitic-with-gloeohyphae`, `dimitic-with-skeletals`, `dimitic-with-binding`, `amphimitic`, `unknown`
- **ClampConnections:** `present-throughout`, `present-at-septa`, `present-on-basidia-only`, `present-medallion-type`, `absent`, `rare`, `unknown`
- **TramaType:** `regular-parallel`, `subregular`, `irregular-interwoven`, `bilateral-divergent`, `inverse-convergent`, `sarcodimitic`, `with-sphaerocytes`, `boletoid`, `unknown`
- **PileipellisType:** `cutis`, `ixocutis`, `trichoderm`, `ixotrichoderm`, `hymeniderm`, `epithelium`, `palisadoderm`, `ixolattice`, `cellular`, `euderm`, `unknown`
- **SetaePresence:** `hymenial-setae-present`, `tramal-setae-present`, `setal-hyphae-present`, `absent`, `unknown`
- **CrystalsPresence:** `calcium-oxalate-present`, `crystalline-encrustations-present`, `acanthocyte-crystals-present`, `rhomboid-crystals`, `star-crystals`, `absent`, `unknown`
- **AscusType:** `operculate`, `inoperculate`, `bitunicate`, `unitunicate-thin-walled`, `prototunicate`, `fissitunicate`, `not-applicable`, `unknown`
- **MountingMedium:** `water`, `KOH-3pct`, `KOH-5pct`, `KOH-10pct`, `ammonia`, `Melzers`, `Lugol`, `Congo-red`, `cotton-blue-lactophenol`, `cresyl-blue`, `phloxine`, `ammoniacal-Congo-red`, `not-recorded`

### Chemistry, toxins & medicinal

- **ToxicityClass:** `nontoxic`, `gi_irritant_only`, `mildly_poisonous`, `poisonous`, `deadly_poisonous`, `psychoactive_only`, `allergenic_only`, `unknown`
- **Toxidrome:** `amatoxin_hepatotoxic`, `gyromitrin_monomethylhydrazine`, `orellanine_nephrotoxic`, `muscarinic_cholinergic`, `isoxazole_pantherina_muscaria`, `psilocybin_hallucinogenic`, `coprine_disulfiram_like`, `gastrointestinal_irritant`, `rhabdomyolysis_tricholoma_equestre`, `erythromelalgia_acromelic`, `encephalopathy_pleurocybella`, `shiitake_dermatitis_flagellate`, `hemolytic_paxillus`, `immune_hemolytic_paxillus_syndrome`, `polyporic_morel_neurologic`, `none`, `unknown`
- **OnsetCategory:** `rapid_under_2h`, `intermediate_2_6h`, `delayed_6_24h`, `very_delayed_24h_plus`, `variable`, `unknown` — *>6h delayed onset is the danger flag.*
- **TargetOrgan:** `liver`, `kidney`, `gastrointestinal`, `central_nervous_system`, `peripheral_nervous_system`, `autonomic_nervous_system`, `cardiovascular`, `skeletal_muscle`, `blood_hematologic`, `skin`, `respiratory`
- **ToxinCompoundClass:** `amatoxin`, `phallotoxin`, `virotoxin`, `orellanine`, `gyromitrin`, `muscarine`, `ibotenic_acid`, `muscimol`, `coprine`, `illudin`, `bolesatine`, `lectin`, `cyclopeptide`, `psilocybin_tryptamine`, `other`
- **Antidote** *(class, never dose):* `silibinin_IV`, `milk_thistle_silymarin`, `N_acetylcysteine`, `penicillin_G_high_dose`, `activated_charcoal`, `atropine`, `pyridoxine_B6`, `hemodialysis`, `plasmapheresis`, `liver_transplant`, `supportive_only`, `benzodiazepines`, `none_known`
- **ToxinThermolability:** `heat_stable`, `heat_labile_destroyed_by_cooking`, `partially_reduced_by_cooking`, `volatile_removed_by_parboiling`, `mixed`, `unknown`
- **PsychoactiveStatus:** `none`, `tryptamine_psychedelic`, `isoxazole_deliriant`, `muscarinic`, `ergoline`, `other`, `unconfirmed`
- **MedicinalCompoundClass:** `beta_glucan`, `triterpenoid`, `statin`, `alkaloid`, `terpene`, `polysaccharide_protein_complex`, `sterol`, `amino_acid_derivative`, `phenolic`, `nucleoside`, `lectin`
- **MedicinalEvidenceGrade:** `traditional_use_only`, `in_vitro_only`, `preclinical_in_vitro_animal`, `early_human_trials`, `rct_supported`, `approved_drug_or_adjuvant`, `insufficient_disputed`
- **BioaccumulatorFlag:** `none_notable`, `cadmium_hyperaccumulator`, `mercury_accumulator`, `lead_accumulator`, `arsenic_accumulator`, `radiocesium_accumulator`, `multi_metal_accumulator`, `unknown`
- **BioaccumElement:** `cadmium`, `lead`, `mercury`, `arsenic`, `copper`, `zinc`, `selenium`, `radiocesium_Cs137`, `radiopotassium_K40`, `vanadium`
- **BioconcentrationFactor:** `low`, `moderate`, `high`, `hyperaccumulator`
- **AllergenProfile:** `none_reported`, `ingestion_gi_intolerance_idiosyncratic`, `shiitake_lentinan_dermatitis`, `spore_inhalation_hypersensitivity_pneumonitis`, `spore_inhalation_allergic_rhinitis`, `contact_dermatitis`, `lyophyllum_mushroom_workers_lung`, `alcohol_sensitization`, `unknown`
- **BluingReaction:** `none`, `blue_psilocin_indicative`, `blue_variegatic_boletoid`, `red_browning`, `yellow_staining`, `black_staining`, `green_staining`, `other`, `unknown`
- **MacrochemicalReagent** *(shared with microscopy):* `KOH`, `NH4OH`, `FeSO4`, `Melzer`, `Lugol`, `phenol`, `aniline`, `guaiac`, `NaOH`, `sulfovanillin`, `Schaeffers-reaction`
- **PigmentClass:** `pulvinic_acid`, `terphenylquinone`, `anthraquinone`, `betalain_muscaflavin`, `melanin`, `carotenoid`, `azulene`, `styrylpyrone`, `betalactam`
- **LegalScheduleStatus:** `unscheduled`, `us_schedule_I_psilocybin`, `controlled_varies_by_jurisdiction`, `decriminalized_local`, `legal_medical_research`, `unknown`

### Edibility

- **EdibilityClass:** `choice_edible`, `edible`, `edible_with_caution`, `edible_when_cooked`, `conditionally_edible`, `inedible`, `unpalatable`, `poisonous`, `deadly_poisonous`, `psychoactive`, `medicinal_only`, `allergenic`, `mycorrhizal_uncultivated`, `unknown`, `untested` — *pick the most conservative applicable value. Supersedes the legacy edible/inedible/toxic/psychoactive/unknown enum.*
- **EdibilityConfidence:** `well_established`, `documented`, `reported`, `anecdotal`, `disputed`, `unverified`
- **NoviceSafetyRating:** `safe_for_beginners`, `intermediate_only`, `expert_only`, `avoid_no_exceptions`
- **LookalikeRiskLevel:** `none_known`, `low`, `moderate`, `high`, `extreme`
- **PreparationStep:** `thorough_cooking`, `parboiling`, `multiple_boil_drain`, `leaching_water`, `drying`, `fermentation`, `peeling`, `deveiling`, `soaking`, `blanching`, `none`
- **AlcoholInteraction:** `none_known`, `disulfiram_like_coprine`, `reported_intolerance`, `unknown`
- **ConfusionDirection:** `toxic_mistaken_for_this`, `this_mistaken_for_edible`, `mutual`
- **TasteRating:** `choice`, `excellent`, `good`, `fair`, `mediocre`, `poor`, `unpalatable`, `inedibly_bitter`, `not_applicable`
- **FlavorProfile:** `umami`, `nutty`, `meaty`, `earthy`, `sweet`, `mild`, `peppery`, `sour`, `bitter`, `astringent`, `seafood_like`, `chicken_like`, `apricot`, `anise`, `almond`, `garlic`, `fruity`, `smoky`, `metallic`
- **AromaDescriptor:** `mild`, `mealy_farinaceous`, `anise_licorice`, `almond_marzipan`, `apricot`, `fruity`, `fishy`, `phenolic_chemical`, `iodine`, `coal_tar`, `spermatic`, `fenugreek_maple`, `garlic`, `radish`, `chlorine_bleach`, `spicy`, `sweet`, `sickly_sweet`, `earthy`, `mushroomy`, `foul_putrid`, `carbolic`, `cucumber`
- **TextureCooked:** `meaty`, `chewy`, `tender`, `silky`, `crisp`, `slimy`, `gelatinous`, `creamy`, `stringy`, `melts`, `stays_firm`, `becomes_tough`
- **CulinaryUse:** `saute`, `grill`, `roast`, `fry`, `stew_braise`, `soup_stock`, `sauce`, `stuffing`, `pickling`, `raw_salad`, `powder_seasoning`, `tea_infusion`, `tincture`, `meat_substitute`, `stir_fry`, `tempura`, `duxelles`, `confit`
- **PreservationMethod:** `drying`, `freezing`, `pickling`, `salting`, `fermentation`, `canning`, `oil_preservation`, `powdering`, `duxelles_freeze`, `refrigeration_short_term`, `dehydration_then_powder`
- **CommercialFoodStatus:** `widely_cultivated`, `commercially_foraged`, `specialty_market`, `gourmet_premium`, `subsistence_local`, `not_commercial`, `forbidden_for_sale`

### Ecology

- **TrophicMode:** `ectomycorrhizal`, `arbuscular_mycorrhizal`, `ericoid_mycorrhizal`, `orchid_mycorrhizal`, `saprotroph`, `wood_decay_saprotroph`, `litter_saprotroph`, `soil_saprotroph`, `dung_saprotroph_coprophilous`, `biotrophic_parasite`, `necrotrophic_parasite`, `hemibiotrophic_parasite`, `mycoparasite`, `entomopathogen`, `nematophagous`, `endophyte`, `lichenized`, `epiphyte`, `facultative_parasite`, `unknown`
- **DecayType:** `white_rot`, `brown_rot`, `soft_rot`, `not_wood_decay`, `unknown`
- **SubstrateType:** `soil`, `leaf_litter`, `humus`, `deadwood_logs`, `deadwood_branches`, `standing_dead_wood`, `living_wood`, `living_bark`, `tree_roots`, `buried_wood`, `woodchip_mulch`, `dung_herbivore`, `dung_carnivore`, `grass_sward`, `moss`, `sphagnum`, `other_fungi`, `insect_host`, `other_invertebrate`, `mammal_keratin`, `lichen`, `leaf_surface_living`, `needle_litter`, `burnt_ground_charcoal`, `compost_straw`, `seeds_cones_nuts`, `fruit`, `fern`, `peat`, `rock_lithic`, `freshwater`, `marine_substrate`, `artificial_manmade`, `nest_material`
- **HostRelationship:** `ectomycorrhizal`, `arbuscular_mycorrhizal`, `ericoid_mycorrhizal`, `orchid_mycorrhizal`, `biotrophic_parasite`, `necrotrophic_parasite`, `mycoparasite`, `endophyte`, `saprotroph_of`, `lichen_photobiont`, `entomopathogen`, `commensal`, `unknown`
- **HostSpecificity:** `obligate`, `preferential`, `facultative`, `generalist`, `monophagous_single_host`, `oligophagous_few_hosts`, `host_independent`, `unknown`
- **HostBreadthClass:** `angiosperm_only`, `gymnosperm_only`, `both`, `monocot_only`, `non_plant`, `unknown`
- **HabitatType:** `tropical_moist_forest`, `tropical_dry_forest`, `temperate_broadleaf_forest`, `temperate_coniferous_forest`, `mixed_forest`, `boreal_taiga`, `montane_forest`, `cloud_forest`, `mangrove`, `woodland_savanna`, `scrubland_heathland`, `unimproved_grassland`, `improved_grassland_pasture`, `alpine_tundra`, `arctic_tundra`, `wetland_marsh`, `bog_mire`, `riparian`, `dune_coastal`, `desert_arid`, `agricultural_land`, `urban_parkland`, `garden_lawn`, `plantation`, `cave`, `freshwater_aquatic`, `marine_coastal`, `disturbed_ruderal`
- **ClimateClass:** `tropical`, `subtropical`, `temperate`, `boreal`, `montane`, `arctic_alpine`, `mediterranean`, `arid_semiarid`, `cosmopolitan`, `unknown`
- **SoilPreference:** `calcareous`, `acidic`, `neutral`, `sandy`, `clay`, `loam`, `peat`, `chalk`, `serpentine`, `nutrient_poor_oligotrophic`, `nutrient_rich_eutrophic`, `disturbed`, `saline`, `gravelly_rocky`, `organic_rich`
- **MoisturePreference:** `xeric_dry`, `mesic`, `hygrophilous_wet`, `aquatic_freshwater`, `marine`, `riparian`, `unknown`
- **FruitingSeason:** `early_spring`, `spring`, `late_spring`, `early_summer`, `summer`, `late_summer`, `early_autumn`, `autumn`, `late_autumn`, `winter`, `year_round`, `aseasonal` — *for tropical/rainfall-driven taxa use `year_round`/`aseasonal` and record cues in `fruitingTriggers`.*
- **PhenologyHemisphere:** `northern`, `southern`, `both_recorded`, `equatorial_aseasonal`
- **FruitingTriggers:** `autumn_rains`, `spring_rains`, `monsoon`, `temperature_drop`, `temperature_shock`, `first_frost`, `warming_thaw`, `fire`, `flooding`, `host_senescence`, `host_death`, `drought_break`, `diurnal_temp_swing`, `humidity_spike`
- **FruitingPosition:** `epigeous_above_ground`, `hypogeous_below_ground`, `semihypogeous`, `on_substrate_surface`, `internal_to_host`, `aquatic_submerged`
- **EcologicalRole:** `primary_decomposer`, `keystone_decomposer`, `lignin_degrader`, `cellulose_degrader`, `nutrient_cycler`, `nitrogen_facilitator`, `mycorrhizal_network_hub`, `primary_succession_pioneer`, `soil_aggregation`, `carbon_sequestration`, `pathogen_population_regulator`, `food_source_for_fauna`, `habitat_engineer`
- **IndicatorSpeciesRole:** `old_growth_forest_indicator`, `ancient_woodland_indicator`, `unimproved_grassland_indicator`, `ph_indicator`, `pollution_sensitive`, `disturbance_tolerant_weedy`, `ecosystem_health_indicator`, `none`, `unknown`
- **IucnStatus:** `EX`, `EW`, `CR`, `EN`, `VU`, `NT`, `LC`, `DD`, `NE`, `not_assessed`
- **Abundance:** `very_common`, `common`, `frequent`, `occasional`, `uncommon`, `rare`, `very_rare`, `extremely_rare_few_records`, `data_deficient`

### Distribution

- **NativeStatus:** `native`, `introduced_naturalized`, `introduced_casual`, `invasive`, `cryptogenic_origin_unknown`, `cosmopolitan`, `unknown`
- **DistributionPattern:** `cosmopolitan`, `holarctic`, `palearctic_endemic`, `nearctic_endemic`, `neotropical`, `paleotropical`, `pantropical`, `austral_southern`, `amphi_atlantic`, `amphi_pacific`, `bipolar`, `regional_endemic`, `narrow_endemic`, `disjunct`, `unknown`
- **BiogeographicRealm:** `Palearctic`, `Nearctic`, `Neotropical`, `Afrotropical`, `Indomalayan`, `Australasian`, `Oceanian`, `Antarctic`, `Marine`

### Cultivation

- **CultivationDifficulty:** `beginner`, `intermediate`, `advanced`, `expert`, `not-cultivable`, `experimental`
- **CultivationMethod:** `PF-tek`, `monotub`, `bulk-substrate`, `log-cultivation`, `stump-cultivation`, `bottle-culture`, `bag-culture`, `tray-tek`, `liquid-culture-only`, `outdoor-bed`, `wood-chip-bed`, `mushroom-bag-block`, `none`
- **AgarMedia:** `MEA`, `PDA`, `PDYA`, `DFA`, `MYA`, `CYM`, `OMYA`, `V8A`, `SDA`, `WA`, `cornmeal-agar`, `compost-extract-agar`
- **SpawnType:** `rye-grain`, `wheat-grain`, `milo-sorghum`, `millet`, `wild-bird-seed-WBS`, `brown-rice-PF`, `popcorn`, `oats`, `sawdust-spawn`, `plug-spawn`, `dowel-spawn`, `grain-master-spawn`, `liquid-culture`
- **BulkSubstrate:** `CVG-coir-vermiculite-gypsum`, `coco-coir`, `horse-manure`, `cow-manure`, `straw-pasteurized`, `supplemented-hardwood-sawdust`, `masters-mix`, `soy-hull-pellets`, `wood-chips`, `compost-phase2`, `logs`, `sugarcane-bagasse`, `cotton-waste`, `spent-coffee-grounds`
- **FreshAirExchangeRate:** `very-low`, `low`, `moderate`, `high`, `very-high`
- **LightRequirement:** `none`, `negligible`, `indirect-low`, `moderate-required-for-pinning`, `high`, `photoperiod-required`
- **PinningTriggers:** `increased-FAE`, `lowered-CO2`, `introduce-light`, `temperature-drop`, `cold-shock`, `RH-increase`, `casing-layer`, `dunk-soak`, `substrate-fully-colonized`, `mechanical-disturbance`, `time-elapsed`, `desiccation-then-rehydrate`
- **ContaminationSusceptibility:** `very-low`, `low`, `moderate`, `high`, `very-high`
- **CommonContaminant:** `Trichoderma-green-mold`, `Cobweb-Dactylium`, `Penicillium`, `Aspergillus`, `bacterial-wet-spot-Bacillus`, `Pseudomonas-bacterial-blotch`, `Neurospora-orange`, `black-pin-mold-Mucor-Rhizopus`, `Verticillium-dry-bubble`, `yeast`, `Lipstick-mold-Sporendonema`
- **SenescenceSusceptibility:** `low`, `moderate`, `high`, `very-high`
- **DegradationSymptom:** `sectoring`, `loss-of-rhizomorphic-growth`, `slowed-colonization`, `reduced-yield`, `fruiting-failure`, `increased-aborts`, `mutation-sectors`, `loss-of-bruising`
- **StorageMethod:** `agar-slant-4C`, `sterile-water-storage`, `grain-master-frozen`, `cryopreservation-LN2-glycerol`, `liquid-culture-fridge`, `spore-syringe`, `sclerotia`, `silica-gel`, `mineral-oil-overlay`, `lyophilization`
- **CommercialViability:** `major-commercial-crop`, `minor-commercial`, `specialty-gourmet`, `medicinal-commercial`, `hobby-only`, `research-only`, `not-cultivated-commercially`

### Genetics

- **MatingSystem:** `homothallic`, `heterothallic`, `pseudohomothallic_amphithallic`, `secondarily-homothallic`, `asexual-only_unknown-teleomorph`, `unknown`
- **MatingTypeArchitecture:** `bipolar_unifactorial`, `tetrapolar_bifactorial`, `bipolar-MAT-only`, `not-applicable`, `unknown`
- **PloidyState:** `haploid (n)`, `diploid (2n)`, `dikaryotic (n+n)`, `polyploid`, `aneuploid`, `variable_life-stage-dependent`, `unknown`
- **GeneticMarker:** `ITS`, `ITS1`, `ITS2`, `LSU-28S`, `SSU-18S`, `5.8S`, `IGS`, `RPB1`, `RPB2`, `TEF1a`, `beta-tubulin`, `CaM`, `ACT`, `GAPDH`, `MCM7`, `mtSSU`, `mtLSU`, `ATP6`, `COI`, `whole-genome`, `other`
- **RecommendedBarcodeMarker:** `ITS`, `ITS+LSU`, `TEF1`, `RPB2`, `TUB2_benA`, `CaM`, `ITS+TEF1`, `multilocus`, `unknown`
- **AssemblyLevel:** `Complete Genome`, `Chromosome`, `Scaffold`, `Contig`
- **IntraspecificVariation:** `low_clonal`, `moderate`, `high`, `cryptic-lineages-present`, `unknown`

### Culture / history

- **NameUsageStatus:** `current`, `preferred`, `alternative`, `obsolete`, `dialectal`, `archaic`, `colloquial`, `trade-name`, `misapplied`
- **UseType:** `food`, `medicine`, `ritual_entheogenic`, `insecticide`, `dye`, `tinder_fire`, `paper_material`, `fermentation`, `poison_weapon`, `veterinary`, `cosmetic`, `ornamental_decorative`, `spiritual-symbol`, `tanning`, `other`
- **PoisoningOutcome:** `no-harm`, `mild`, `moderate`, `severe`, `fatal`, `disputed`, `unknown`
- **MediaReferenceType:** `novel`, `poem`, `short-story`, `film`, `television`, `video-game`, `music`, `comic_graphic`, `painting`, `illustration`, `sculpture`, `photography`, `stamp`, `currency`, `advertising`, `folk-tale`, `religious-text`, `other`
- **CulturalSensitivityFlag:** `none`, `indigenous-knowledge-attributed`, `sacred-restricted`, `attribution-required`, `consult-community`

### Media

- **MediaType:** `image`, `audio`, `video`, `3d_model`, `specimen_scan`, `microscopy_image`, `spore_print_image`, `illustration`, `gif_timelapse`, `spectrum`
- **MediaViewType:** `in-situ`, `studio`, `cap-top`, `cap-underside-gills`, `stipe`, `stipe-base`, `cross-section`, `spore-print`, `microscopy-spores`, `microscopy-basidia`, `microscopy-cystidia`, `microscopy-hyphae`, `microscopy-pileipellis`, `chemical-reaction`, `culture-plate`, `habitat`, `fresh`, `dried-specimen`, `scale-reference`, `illustration`, `phylogenetic-tree`, `distribution-map`, `lookalike-comparison`, `other`
- **LifecycleStage:** `primordium`, `button`, `immature`, `mature`, `senescent`, `decaying`, `dried`, `mycelium`, `sclerotium`, `culture`, `spore`, `teleomorph`, `anamorph`, `unknown`
- **MediaVerificationStatus:** `unverified`, `community-id`, `research-grade`, `expert-verified`, `type-specimen`, `dna-confirmed`, `disputed`, `misidentified-flagged`
- **MediaLicense:** `CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `CC-BY-NC-4.0`, `CC-BY-NC-SA-4.0`, `CC-BY-ND-4.0`, `CC-BY-NC-ND-4.0`, `CC-BY-3.0`, `CC-BY-SA-3.0`, `public-domain`, `PDM-1.0`, `all-rights-reserved`, `GFDL`, `fair-use`, `permission-granted`, `unknown` — *default `unknown` blocks redistribution.*

### Provenance

- **SourceType:** `primary-literature`, `peer-reviewed`, `field-guide`, `authority-database`, `expert-assertion`, `community-consensus`, `machine-inference`, `ai-generated-unverified`, `personal-observation`, `unknown` — *`ai-generated-unverified` and `machine-inference` flagged distinctly per anti-fabrication policy.*
- **ConfidenceLevel:** `confirmed`, `high`, `moderate`, `low`, `speculative`, `disputed`, `unknown`
- **FieldVerificationStatus:** `unverified`, `auto-imported`, `community-reviewed`, `expert-verified`, `needs-review`, `flagged-for-correction`, `deprecated`
- **RecordVerificationLevel:** `unverified`, `auto-generated`, `community-reviewed`, `expert-reviewed`, `authoritative`
- **ContributorRole:** `author`, `editor`, `reviewer`, `photographer`, `translator`, `data-importer`, `expert-verifier`, `moderator`
- **DisputeStatus:** `open`, `under-review`, `resolved`, `wont-fix`, `escalated`
- **ReferenceType:** `journal-article`, `book`, `book-chapter`, `field-guide`, `monograph`, `protologue`, `thesis`, `dataset`, `database-record`, `web-page`, `preprint`, `conference-paper`, `personal-communication`, `herbarium-label`
- **ExternalAuthority:** `MycoBank`, `IndexFungorum`, `GBIF`, `NCBI-Taxonomy`, `GenBank`, `iNaturalist`, `MushroomObserver`, `Wikipedia`, `Wikidata`, `EOL`, `Catalogue-of-Life`, `FungalTraits`, `UNITE`, `BOLD`, `MyCoPortal`, `FungiDB`, `ITIS`, `SpeciesFungorum`, `IRMNG`, `PlutoF`, `FungalNames`, `other`
- **LinkRelationship:** `exact-match`, `current-name`, `synonym`, `basionym`, `occurrence-data`, `sequence-data`, `observation-data`, `type-record`, `related`, `ambiguous-match`
- **RecordLicense:** `CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `ODbL-1.0`, `PDDL-1.0`, `public-domain` — *open-only, per the OSS mission.*

---

## 5. Worked example record

A `reference-quality` record for *Amanita phalloides*. Note the explicit `(verify)` / `(format placeholder)` markers on every external ID and accession — per the anti-fabrication policy, placeholders must never be presented as verified fact.

```json
{
  "recordId": "myco:amanita-phalloides",
  "slug": "amanita-phalloides",
  "recordTier": "reference-quality",
  "scientificName": "Amanita phalloides (Vaill. ex Fr.) Link",
  "canonicalName": "Amanita phalloides",
  "primaryCommonName": "Death Cap",
  "taxonRank": "species",
  "taxonomicStatus": "accepted",
  "acceptedNameUsageId": "myco:amanita-phalloides",
  "authorship": "(Vaill. ex Fr.) Link",
  "basionymAuthorship": "Vaill. ex Fr.",
  "combinationAuthorship": "Link",
  "namePublishedInYear": 1833,
  "nomenclaturalCode": "ICN",
  "nomenclaturalStatus": "legitimate",
  "sanctioningStatus": "none",
  "basionymName": "Agaricus phalloides Vaill. ex Fr.",
  "synonyms": [{"name": "Amanita viridis", "authorship": "Pers.", "synonymType": "heterotypic", "registryId": "IF:198xxx (format placeholder)"}],
  "misappliedNames": [{"name": "Amanita mappa sensu auct. amer.", "appliedBy": "some American authors"}],
  "typeStatus": "epitype",
  "typeLocality": "France",
  "etymology": "phalloides = 'phallus-like', from the resemblance of the young button to a phallus",
  "etymologyRootLanguage": "greek",
  "kingdom": "Fungi",
  "phylum": "Basidiomycota",
  "class": "Agaricomycetes",
  "order": "Agaricales",
  "family": "Amanitaceae",
  "genus": "Amanita",
  "specificEpithet": "phalloides",
  "intermediateRanks": {"subkingdom": "Dikarya", "subphylum": "Agaricomycotina", "subclass": "Agaricomycetidae", "subgenus": "Amanita subg. Lepidella", "section": "Phalloideae"},
  "parentNameUsageId": "myco:amanita",
  "speciesComplex": "Amanita phalloides complex",
  "crypticSpeciesFlag": false,
  "phylogeneticClade": "Amanita sect. Phalloideae",
  "sisterTaxa": ["Amanita virosa", "Amanita verna"],
  "placementConfidence": "high",
  "recentReclassification": "Stable placement in Amanita sect. Phalloideae; the lethal amatoxin-bearing clade",
  "basidiomeType": "agaricoid",
  "growthHabit": "scattered",
  "capDiameter": {"min": 40, "max": 120, "unit": "mm"},
  "capShape": ["convex", "plane"],
  "capColor": ["green", "olive", "yellow"],
  "capSurfaceTexture": ["viscid", "glabrous"],
  "capSurfaceOrnamentation": "volval-patches",
  "hymenophoreType": "lamellate-gills",
  "gillAttachment": "free",
  "gillSpacing": "crowded",
  "gillColor": ["white"],
  "poreSurfaceColor": ["not-applicable"],
  "stipePresent": true,
  "stipeDimensions": {"length": {"min": 60, "max": 150, "unit": "mm"}, "width": {"min": 8, "max": 20, "unit": "mm"}},
  "stipeColor": ["white"],
  "stipeSurfaceTexture": ["fibrillose"],
  "annulusPresence": "present-membranous",
  "cortinaPresence": false,
  "volvaPresence": "saccate-cup",
  "stipeBaseShape": "bulbous",
  "fleshColor": ["white"],
  "fleshColorChangeOnCut": "white, unchanging",
  "latexPresence": false,
  "latexColorFresh": "not-applicable",
  "sporePrintColor": "white",
  "odor": ["honey", "sweet", "sickly_sweet"],
  "taste": "not-tested",
  "bruisingReaction": {"description": "none observed", "color": "none", "speed": "none"},
  "basidiosporeDimensions": {"length": {"min": 8, "max": 11, "unit": "µm"}, "width": {"min": 7, "max": 9, "unit": "µm"}, "lengthMean": 9.5, "widthMean": 8.0},
  "qRatio": {"range": {"min": 1.0, "max": 1.25, "unit": ""}, "mean": 1.1},
  "basidiosporeShape": "subglobose",
  "basidiosporeOrnamentation": "smooth",
  "basidiosporeReactionMelzer": "amyloid",
  "basidiosporeGermPore": "absent",
  "basidiaShape": "clavate",
  "basidiaSterigmataNumber": "4",
  "clampConnections": "present-at-septa",
  "tramaType": "bilateral-divergent",
  "pileipellisType": "ixocutis",
  "measurementProtocol": {"mountingMedium": "KOH-3pct", "n": 30, "fromTissue": "from-spore-print", "ornamentationIncluded": "excluded", "apiculusIncluded": "excluded"},
  "toxicityClass": "deadly_poisonous",
  "primaryToxidrome": "amatoxin_hepatotoxic",
  "secondaryToxidromes": ["gastrointestinal_irritant"],
  "onsetCategory": "delayed_6_24h",
  "onsetTimeRange": {"min": 6, "max": 24, "unit": "h"},
  "toxins": [
    {"name": "alpha-amanitin", "compoundClass": "amatoxin", "pubchemCid": "2169 (verify)", "concentrationDryWt": {"min": 0.2, "max": 0.4, "unit": "mg/g"}, "mechanism": "RNA polymerase II inhibition", "targetOrgan": ["liver", "kidney"], "heatStable": true, "waterSoluble": true},
    {"name": "phalloidin", "compoundClass": "phallotoxin", "mechanism": "actin filament stabilization", "targetOrgan": ["liver"], "heatStable": true}
  ],
  "lethalDoseHuman": "~0.1 mg amatoxin/kg; ingestion of ~30-50 g fresh tissue can be fatal for an adult",
  "targetOrgans": ["liver", "kidney"],
  "antidotes": ["silibinin_IV", "N_acetylcysteine", "penicillin_G_high_dose", "activated_charcoal", "liver_transplant"],
  "toxinThermolability": "heat_stable",
  "psychoactiveStatus": "none",
  "bioaccumulatorFlag": "none_notable",
  "allergenProfile": ["none_reported"],
  "bluingReaction": "none",
  "macrochemicalReactions": [{"reagent": "KOH", "tissue": "cap_surface", "result": "no-reaction"}],
  "legalScheduleStatus": "unscheduled",
  "edibilityClass": "deadly_poisonous",
  "edibilityConfidence": "well_established",
  "edibilityRationale": [
    "Contains heat-stable amatoxins (alpha-amanitin) causing fatal hepatorenal failure",
    "Responsible for the majority of fatal mushroom poisonings worldwide"
  ],
  "noviceSafetyRating": "avoid_no_exceptions",
  "deadlyLookalikeRisk": "high",
  "toxicWhenRaw": true,
  "preparationRequirement": [],
  "alcoholInteraction": "none_known",
  "dangerousLookalikes": [
    {"species": "Volvariella volvacea (paddy straw mushroom)", "toxicity": "edible", "confusionDirection": "this_mistaken_for_edible", "distinguishingFeatures": ["white spore print (Amanita) vs pink (Volvariella)", "presence of a membranous ring", "amyloid spores"], "confusionLikelihood": "high", "region": "SE Asian communities"},
    {"species": "Amanita species eaten young in some cultures (button stage)", "toxicity": "unknown", "confusionDirection": "this_mistaken_for_edible", "distinguishingFeatures": ["excavate base to reveal saccate volva", "white gills and white spore print"], "confusionLikelihood": "high"}
  ],
  "keyDistinguishingTests": [
    "Take a white spore print",
    "Excavate the stipe base to check for a saccate volva",
    "Note free white gills and membranous ring",
    "Amyloid spores in Melzer's reagent"
  ],
  "firstTimeTrialAdvice": "Never consume; deadly poisonous with no safe preparation",
  "tasteRating": "not_applicable",
  "aromaDescriptors": ["sweet", "sickly_sweet"],
  "regionalEdibilityVariation": "Uniformly deadly across its range; no safe regional chemotype or preparation exists",
  "trophicMode": "ectomycorrhizal",
  "trophicModeSecondary": [],
  "decayType": "not_wood_decay",
  "substrateType": ["soil", "tree_roots"],
  "hostAssociations": [
    {"taxon": "Quercus", "rank": "genus", "relationship": "ectomycorrhizal", "specificity": "preferential"},
    {"taxon": "Castanea", "rank": "genus", "relationship": "ectomycorrhizal", "specificity": "facultative"},
    {"taxon": "Pinus", "rank": "genus", "relationship": "ectomycorrhizal", "specificity": "facultative"}
  ],
  "hostBreadthClass": "both",
  "habitatType": ["temperate_broadleaf_forest", "mixed_forest"],
  "climateClass": "temperate",
  "soilPreference": ["acidic", "loam"],
  "moisturePreference": "mesic",
  "fruitingSeason": ["late_summer", "autumn"],
  "phenologyHemisphere": "northern",
  "fruitingTriggers": ["autumn_rains", "temperature_drop"],
  "fruitingPosition": "epigeous_above_ground",
  "ecologicalRole": ["mycorrhizal_network_hub"],
  "indicatorSpeciesRole": "none",
  "iucnStatus": "not_assessed",
  "abundance": "common",
  "habitatNotes": "Ectomycorrhizal, predominantly with oaks and other hardwoods, occasionally conifers; widely naturalized outside its native range with planted host trees.",
  "nativeStatus": "native",
  "nativeRange": "Native to Europe; introduced and naturalized widely with exotic hosts",
  "countryDistribution": ["FR", "GB", "DE", "IT", "SE", "US", "CA", "AU", "NZ"],
  "introducedRange": ["US", "CA", "AU", "NZ"],
  "distributionPattern": "holarctic",
  "biogeographicRealm": ["Palearctic", "Nearctic"],
  "elevationRange": {"min": 0, "max": 1800, "unit": "m"},
  "gbifOccurrenceCount": 42000,
  "inatObservationCount": 38000,
  "rangeExpansionNotes": "Established and spreading in western North America in association with introduced oaks and other hosts.",
  "cultivable": false,
  "cultivationDifficulty": "not-cultivable",
  "primaryCultivationMethod": "none",
  "commercialViability": "not-cultivated-commercially",
  "sclerotiaFormation": false,
  "matingSystem": "heterothallic",
  "matingTypeSystem": "tetrapolar",
  "ploidy": "dikaryotic (n+n)",
  "itsBarcode": {"available": true, "accessions": ["GenBank ITS accession (verify before use)"], "lengthBp": 680},
  "uniteSpeciesHypothesis": "UNITE SH ID (verify)",
  "recommendedBarcodeMarker": "ITS",
  "exTypeSequence": {"available": true, "accessions": [{"marker": "ITS", "accession": "RefSeq NR_ accession (verify)", "typeStatus": "ex-epitype"}]},
  "genome": {"sequenced": true, "assemblyAccessions": ["GCA_ assembly accession (verify)"], "sizeMb": {"min": 30, "max": 40, "unit": "Mb"}, "assemblyLevel": "Scaffold"},
  "intraspecificVariation": "moderate",
  "populationStructure": "European source populations; introduced North American lineages from multiple introduction events",
  "toxinGeneClusters": [{"toxin": "alpha-amanitin", "cluster": "MSDIN ribosomal-peptide family + POPB (prolyl oligopeptidase B)", "present": true}],
  "psilocybinGeneCluster": {"present": false, "genes": []},
  "environmentalSequenceOnly": false,
  "vernacularNames": [
    {"name": "Death Cap", "langCode": "en", "regionCode": "GB", "isPrimary": true, "usageStatus": "current"},
    {"name": "Death Cap", "langCode": "en", "regionCode": "US", "usageStatus": "current"},
    {"name": "Grüner Knollenblätterpilz", "langCode": "de", "usageStatus": "current"},
    {"name": "Amanite phalloïde", "langCode": "fr", "usageStatus": "current"},
    {"name": "Oronja verde", "langCode": "es", "usageStatus": "current"}
  ],
  "originalDescriber": [
    {"name": "Elias Magnus Fries", "role": "sanctioning author", "year": 1821},
    {"name": "Johann Heinrich Friedrich Link", "role": "combining author", "year": 1833}
  ],
  "discoveryNarrative": "Recognized as deadly in European folk culture long before formal description; Link transferred it to Amanita in 1833. Its section, Phalloideae, contains the most lethal mushrooms known.",
  "notablePoisoningCases": [{"caseName": "Pope Clement VII (disputed)", "year": 1534, "summary": "Some historical accounts attribute his death to Amanita phalloides poisoning; the claim is disputed.", "outcome": "fatal", "verified": false}],
  "culturalSignificance": "The archetypal deadly mushroom; responsible for the large majority of fatal mushroom poisonings worldwide.",
  "popularMisconceptions": [{"claim": "Cooking, drying, or parboiling renders it safe to eat", "status": "dangerous false belief", "correction": "Amatoxins are heat-stable; no household preparation detoxifies the mushroom"}],
  "culturalSensitivityFlag": "none",
  "media": [{"mediaId": "med_amaphal_0001", "mediaType": "image", "viewType": "in-situ", "url": "https://media.example.org/amanita-phalloides.jpg (placeholder)", "license": "CC-BY-NC-4.0", "credit": "© Contributor / iNaturalist (CC-BY-NC 4.0)", "verificationStatus": "research-grade", "lifecycleStage": "mature", "isPrimary": true}],
  "primaryImageId": "med_amaphal_0001",
  "hasMicroscopy": false,
  "fieldProvenance": [
    {"field": "edibilityClass", "sourceRefId": "ref_benjamin_1995", "sourceType": "primary-literature", "confidence": "confirmed", "verificationStatus": "expert-verified", "reviewedOn": "2026-05-31"},
    {"field": "toxins", "sourceRefId": "ref_benjamin_1995", "sourceType": "primary-literature", "confidence": "high", "verificationStatus": "expert-verified", "reviewedOn": "2026-05-31"},
    {"field": "itsBarcode.accessions", "sourceType": "authority-database", "confidence": "low", "verificationStatus": "needs-review", "note": "Accession is a format placeholder; must be reconciled against GenBank before publishing."}
  ],
  "references": [{"refId": "ref_benjamin_1995", "type": "book", "title": "Mushrooms: Poisons and Panaceas", "authors": ["Benjamin, D.R."], "year": 1995, "isPrimary": false}],
  "externalLinks": [
    {"authority": "IndexFungorum", "externalId": "IF:198282 (verify)", "relationship": "exact-match"},
    {"authority": "GBIF", "externalId": "5240897 (verify)", "relationship": "exact-match"},
    {"authority": "NCBI-Taxonomy", "externalId": "67723 (verify)", "relationship": "exact-match"},
    {"authority": "MycoBank", "externalId": "MB#198282 (verify)", "relationship": "exact-match"},
    {"authority": "iNaturalist", "externalId": "48634 (verify)", "relationship": "observation-data"},
    {"authority": "Wikidata", "externalId": "Q133795 (verify)", "relationship": "related"}
  ],
  "dataCompletenessScore": 0.82,
  "verificationLevel": "expert-reviewed",
  "lastReviewedDate": "2026-05-31",
  "contributors": [
    {"handle": "mycosci-import", "role": "data-importer"},
    {"handle": "expert-reviewer", "role": "expert-verifier"}
  ],
  "disputeFlags": [],
  "recordLicense": "CC-BY-SA-4.0",
  "schemaVersion": "1.0.0"
}
```

---

## 6. TypeScript types

```ts
// ============ Shared primitives ============
/** All quantitative measurements use min/max + explicit unit. For a single value, set min === max. unit '' means dimensionless (e.g. Q ratio). */
export interface NumericRange { min: number; max: number; unit: string; }
export interface GeoPoint { lat: number; lon: number; obscured?: boolean; }
export interface BoundingBox { minLat: number; maxLat: number; minLon: number; maxLon: number; }
export interface RankName { rank: string; name: string; }

// ============ Cross-cutting provenance (sparse: only for asserted fields) ============
export interface FieldProvenance {
  /** dotted path to the field, e.g. 'edibilityClass' or 'toxins' or 'basidiosporeDimensions.length' */
  field: string;
  sourceRefId?: string;            // FK into Reference.refId or ExternalLink
  sourceType: SourceType;
  confidence: ConfidenceLevel;
  verificationStatus: FieldVerificationStatus;
  verifiedBy?: string;
  reviewedOn?: string;             // ISO date
  note?: string;
}
export interface Reference {
  refId: string; type: ReferenceType; title: string;
  doi?: string; url?: string; authors?: string[]; year?: number;
  containerTitle?: string; pages?: string; isbn?: string; isPrimary?: boolean; accessedDate?: string;
}
export interface ExternalLink {
  authority: ExternalAuthority; externalId: string;
  url?: string; relationship?: LinkRelationship; lastSynced?: string;
}
export interface Contributor { handle: string; role: ContributorRole; contributedOn?: string; }
export interface DisputeFlag { field: string; reason: string; status: DisputeStatus; raisedBy?: string; }

// ============ Naming / classification nested ============
export interface Synonym { name: string; authorship?: string; synonymType: SynonymType; registryId?: string; year?: number; }
export interface MisappliedName { name: string; appliedBy?: string; }
export interface IntermediateRanks {
  subkingdom?: string; subphylum?: string; subclass?: string; superorder?: string;
  suborder?: string; subfamily?: string; tribe?: string; subgenus?: string; section?: string; series?: string;
}
export interface AnamorphTeleomorphLink { linkedName: string; relation: 'anamorph' | 'teleomorph'; code?: string; }

// ============ Morphology nested ============
export interface StipeDimensions { length?: NumericRange; width?: NumericRange; }
export interface BruisingReaction { description?: string; color: BruisingColor; speed: BruisingSpeed; }
export interface GlebaDescription { description?: string; colorAtMaturity: ColorPrimary; }

// ============ Microscopy nested ============
export interface SporeDimensions { length: NumericRange; width: NumericRange; lengthMean?: number; widthMean?: number; extremesNote?: string; }
export interface QRatio { range: NumericRange; mean?: number; }
export interface CystidiaSet { presence: CystidiaPresence; shapes: CystidiaShape[]; size?: { length: NumericRange; width: NumericRange }; wallType?: string; }
export interface AscosporeFeatures { shape: SporeShape | 'not-applicable'; size?: NumericRange; ornamentation?: SporeOrnamentation; }
export interface MeasurementProtocol {
  mountingMedium: MountingMedium; magnification?: string; n?: number; numberCollections?: number;
  fromTissue?: 'from-spore-print' | 'from-hymenium' | 'from-gill-section' | 'from-mature-region' | 'mixed' | 'not-recorded';
  ornamentationIncluded?: 'included' | 'excluded' | 'reported-both' | 'not-applicable' | 'not-recorded';
  apiculusIncluded?: 'included' | 'excluded' | 'not-recorded';
  extremesConvention?: string; observer?: string; voucherSpecimenId?: string;
}

// ============ Chemistry nested ============
export interface Compound {
  name: string; compoundClass?: string; pubchemCid?: string; chebiId?: string; casNumber?: string;
  concentrationDryWt?: NumericRange; percentDryWt?: NumericRange;
  mechanism?: string; targetOrgan?: TargetOrgan[]; heatStable?: boolean; waterSoluble?: boolean;
  claimedActivity?: string; evidenceGrade?: MedicinalEvidenceGrade;
}
export interface BioaccumEntry { element: BioaccumElement; concentration?: NumericRange; bioconcentrationFactor?: BioconcentrationFactor; notes?: string; }
export interface SpotTest { reagent: MacrochemicalReagent; tissue: string; result: string; }
export interface Pigment { name: string; pigmentClass: PigmentClass; color?: string; role?: string; }

// ============ Edibility nested ============
export interface PrepStep { step: PreparationStep; detail?: string; removesHazard?: string; }
export interface Lookalike {
  species: string; toxicity: EdibilityClass; confusionDirection: ConfusionDirection;
  distinguishingFeatures: string[]; confusionLikelihood: LookalikeRiskLevel; region?: string;
}

// ============ Ecology / distribution nested ============
export interface HostAssociation { taxon: string; rank: string; relationship: HostRelationship; specificity: HostSpecificity; }
export interface LegalProtection { jurisdiction: string; protection: string; }

// ============ Genetics nested ============
export interface ItsBarcode { available: boolean; accessions: string[]; lengthBp?: number; refSequenceUrl?: string; }
export interface MarkerAccession { marker: GeneticMarker; accessions: string[]; }
export interface ExTypeAccession { marker: GeneticMarker; accession: string; typeStatus: TypeStatus; }
export interface ExTypeSequence { available: boolean; accessions: ExTypeAccession[]; }
export interface Genome {
  sequenced: boolean; assemblyAccessions: string[]; sizeMb?: NumericRange; gcContent?: NumericRange;
  geneCount?: number; assemblyLevel?: AssemblyLevel; buscoCompleteness?: NumericRange;
}
export interface GeneCluster { toxin: string; cluster: string; present: boolean; }
export interface PsilocybinGeneCluster { present: boolean; genes: string[]; }

// ============ Culture / history nested ============
export interface VernacularName {
  name: string; langCode: string; regionCode?: string; script?: string;
  isPrimary?: boolean; usageStatus: NameUsageStatus; transliteration?: string; ipa?: string; source?: string;
}
export interface IndigenousName { name: string; culture: string; langCode?: string; glossMeaning?: string; source?: string; }
export interface Describer { name: string; role: string; year?: number; }
export interface HistoricalFigure { name: string; role: string; contribution?: string; era?: string; }
export interface FolkloreEntry { tradition: string; motif?: string; summary: string; region?: string; }
export interface TraditionalUse { useType: UseType; culture: string; description: string; era?: string; evidenceLevel?: MedicinalEvidenceGrade; }
export interface PoisoningCase { caseName: string; year?: number; summary: string; victims?: number; outcome: PoisoningOutcome; verified: boolean; references?: string[]; }
export interface CultureReference { work: string; author?: string; year?: number; mediaType: MediaReferenceType; context?: string; }
export interface Misconception { claim: string; status: string; correction: string; }

// ============ Cultivation nested ============
export interface Strain { name: string; traits?: string; }

// ============ Media nested ============
export interface MediaAsset {
  mediaId: string; mediaType: MediaType; viewType: MediaViewType; url: string;
  thumbnailUrl?: string; caption?: string; altText?: string; credit?: string;
  photographer?: string; license: MediaLicense; licenseUrl?: string; rightsHolder?: string;
  sourcePlatform?: ExternalAuthority; sourceId?: string; observationUrl?: string;
  lifecycleStage?: LifecycleStage; isPrimary?: boolean; captureDate?: string; captureLocation?: GeoPoint;
  microscopyMagnification?: string; scaleBarMicrons?: NumericRange; stain?: MountingMedium;
  verificationStatus?: MediaVerificationStatus; voucherSpecimenId?: string; order?: number;
}

// ============ Canonical species record ============
export interface SpeciesRecord {
  // --- identity (core) ---
  recordId: string; slug: string; recordTier: RecordTier;
  scientificName: string; canonicalName: string; primaryCommonName?: string;
  taxonRank: TaxonRank; taxonomicStatus: TaxonomicStatus; acceptedNameUsageId?: string;

  // --- naming ---
  authorship?: string; basionymAuthorship?: string; combinationAuthorship?: string;
  namePublishedInYear?: number; nomenclaturalCode?: NomenclaturalCode; nomenclaturalStatus?: NomenclaturalStatus;
  sanctioningStatus?: SanctioningStatus; basionymName?: string;
  synonyms?: Synonym[]; misappliedNames?: MisappliedName[]; orthographicVariants?: string[];
  typeStatus?: TypeStatus; typeSpecimenCitation?: string; typeHerbariumCode?: string; typeLocality?: string;
  protologueCitation?: string; etymology?: string; etymologyRootLanguage?: EtymologyRoot;
  anamorphTeleomorphLink?: AnamorphTeleomorphLink;

  // --- classification ---
  kingdom?: string; phylum?: string; class?: string; order?: string; family?: string; genus?: string;
  specificEpithet?: string; infraspecificEpithet?: string; infraspecificRankMarker?: InfraspecificRankMarker;
  intermediateRanks?: IntermediateRanks; classificationPath?: RankName[]; parentNameUsageId?: string;
  speciesComplex?: string; crypticSpeciesFlag?: boolean; phylogeneticClade?: string; sisterTaxa?: string[];
  placementConfidence?: PlacementConfidence; recentReclassification?: string;

  // --- morphology (genus-dependent, mostly nullable) ---
  basidiomeType?: BasidiomeType; growthHabit?: GrowthHabit;
  capDiameter?: NumericRange; capShape?: CapShape[]; capColor?: ColorPrimary[]; capSurfaceTexture?: SurfaceTexture[];
  capSurfaceOrnamentation?: CapOrnamentation; hymenophoreType?: HymenophoreType;
  gillAttachment?: GillAttachment; gillSpacing?: GillSpacing; gillColor?: ColorPrimary[];
  poreSurfaceColor?: ColorPrimary[]; poreDensity?: NumericRange; toothLength?: NumericRange;
  stipePresent?: boolean; stipeDimensions?: StipeDimensions; stipeColor?: ColorPrimary[]; stipeSurfaceTexture?: SurfaceTexture[];
  annulusPresence?: AnnulusPresence; cortinaPresence?: boolean; volvaPresence?: VolvaPresence;
  stipeBaseShape?: StipeBaseShape; basalMycelium?: BasalMycelium;
  fleshColor?: ColorPrimary[]; fleshColorChangeOnCut?: string;
  latexPresence?: boolean; latexColorFresh?: LatexColor; latexColorChange?: string;
  sporePrintColor?: SporePrintColor; odor?: OdorDescriptor[]; taste?: TasteDescriptor;
  bruisingReaction?: BruisingReaction; glebaDescription?: GlebaDescription;
  autodigestionDeliquescence?: boolean; luminescence?: boolean;
  basidiomeDevelopmentType?: DevelopmentType; fruitingBodyTexture?: FruitbodyTexture;

  // --- microscopy ---
  basidiosporeDimensions?: SporeDimensions; qRatio?: QRatio; basidiosporeShape?: SporeShape;
  basidiosporeOrnamentation?: SporeOrnamentation; basidiosporeReactionMelzer?: AmyloidReaction; basidiosporeGermPore?: GermPore;
  basidiaShape?: BasidiaShape; basidiaSterigmataNumber?: SterigmataNumber;
  cheilocystidia?: CystidiaSet; pleurocystidia?: CystidiaSet;
  hyphalSystem?: HyphalSystem; clampConnections?: ClampConnections; tramaType?: TramaType; pileipellisType?: PileipellisType;
  setaePresence?: SetaePresence; crystalsPresence?: CrystalsPresence;
  ascusType?: AscusType; ascosporeFeatures?: AscosporeFeatures; measurementProtocol?: MeasurementProtocol;

  // --- chemistry ---
  toxicityClass?: ToxicityClass; primaryToxidrome?: Toxidrome; secondaryToxidromes?: Toxidrome[];
  onsetCategory?: OnsetCategory; onsetTimeRange?: NumericRange; toxins?: Compound[];
  lethalDoseHuman?: string; targetOrgans?: TargetOrgan[]; antidotes?: Antidote[]; toxinThermolability?: ToxinThermolability;
  psychoactiveStatus?: PsychoactiveStatus; psychoactiveCompounds?: Compound[];
  medicinalCompounds?: Compound[]; medicinalEvidenceGrade?: MedicinalEvidenceGrade;
  nutritionalComposition?: Record<string, unknown>;
  bioaccumulatorFlag?: BioaccumulatorFlag; bioaccumulationProfile?: BioaccumEntry[];
  allergenProfile?: AllergenProfile[]; bluingReaction?: BluingReaction;
  macrochemicalReactions?: SpotTest[]; pigmentChemistry?: Pigment[]; legalScheduleStatus?: LegalScheduleStatus;

  // --- edibility ---
  edibilityClass?: EdibilityClass; edibilityConfidence?: EdibilityConfidence; edibilityRationale?: string[];
  noviceSafetyRating?: NoviceSafetyRating; deadlyLookalikeRisk?: LookalikeRiskLevel; toxicWhenRaw?: boolean;
  preparationRequirement?: PrepStep[]; alcoholInteraction?: AlcoholInteraction; dangerousLookalikes?: Lookalike[];
  keyDistinguishingTests?: string[]; firstTimeTrialAdvice?: string; individualIdiosyncrasyRisk?: boolean;
  tasteRating?: TasteRating; flavorProfile?: FlavorProfile[]; aromaDescriptors?: AromaDescriptor[];
  textureCooked?: TextureCooked[]; culinaryUses?: CulinaryUse[]; preservationMethods?: PreservationMethod[];
  commercialFoodStatus?: CommercialFoodStatus; regionalEdibilityVariation?: string; specialPopulationCaution?: string;

  // --- ecology ---
  trophicMode?: TrophicMode; trophicModeSecondary?: TrophicMode[]; decayType?: DecayType;
  substrateType?: SubstrateType[]; hostAssociations?: HostAssociation[]; hostBreadthClass?: HostBreadthClass;
  habitatType?: HabitatType[]; climateClass?: ClimateClass; soilPreference?: SoilPreference[]; soilPhRange?: NumericRange;
  moisturePreference?: MoisturePreference; fruitingSeason?: FruitingSeason[]; phenologyHemisphere?: PhenologyHemisphere;
  fruitingTriggers?: FruitingTriggers[]; fruitingPosition?: FruitingPosition; ecologicalRole?: EcologicalRole[];
  indicatorSpeciesRole?: IndicatorSpeciesRole; iucnStatus?: IucnStatus; abundance?: Abundance;
  legalProtection?: LegalProtection[]; habitatNotes?: string;

  // --- distribution ---
  nativeStatus?: NativeStatus; nativeRange?: string; countryDistribution?: string[]; introducedRange?: string[];
  distributionPattern?: DistributionPattern; biogeographicRealm?: BiogeographicRealm[]; elevationRange?: NumericRange;
  occurrenceCentroid?: GeoPoint; occurrenceBoundingBox?: BoundingBox;
  gbifOccurrenceCount?: number; inatObservationCount?: number; rangeExpansionNotes?: string;

  // --- cultivation ---
  cultivable?: boolean; cultivationDifficulty?: CultivationDifficulty; primaryCultivationMethod?: CultivationMethod;
  agarMediaRecommended?: AgarMedia[]; spawnTypes?: SpawnType[]; bulkSubstrates?: BulkSubstrate[];
  colonizationTempRange?: NumericRange; fruitingTempRange?: NumericRange; fruitingHumidityRange?: NumericRange;
  fruitingCO2Range?: NumericRange; freshAirExchangeRate?: FreshAirExchangeRate; lightRequirement?: LightRequirement;
  pinningTriggers?: PinningTriggers[]; totalCycleTime?: NumericRange; biologicalEfficiency?: NumericRange;
  contaminationSusceptibility?: ContaminationSusceptibility; commonContaminants?: CommonContaminant[];
  senescenceSusceptibility?: SenescenceSusceptibility; degradationSymptoms?: DegradationSymptom[];
  longTermStorageMethods?: StorageMethod[]; sclerotiaFormation?: boolean; recommendedStrains?: Strain[];
  commercialViability?: CommercialViability; logCultivationSuitable?: boolean; legalCultivationNote?: string;

  // --- genetics ---
  matingSystem?: MatingSystem; matingTypeSystem?: MatingTypeArchitecture; ploidy?: PloidyState; chromosomeCount?: number;
  itsBarcode?: ItsBarcode; uniteSpeciesHypothesis?: string; otherMarkers?: MarkerAccession[];
  recommendedBarcodeMarker?: RecommendedBarcodeMarker; exTypeSequence?: ExTypeSequence; genome?: Genome;
  intraspecificVariation?: IntraspecificVariation; populationStructure?: string;
  toxinGeneClusters?: GeneCluster[]; psilocybinGeneCluster?: PsilocybinGeneCluster;
  mlstScheme?: string; environmentalSequenceOnly?: boolean;

  // --- culture / history ---
  vernacularNames?: VernacularName[]; indigenousNames?: IndigenousName[]; originalDescriber?: Describer[];
  discoveryNarrative?: string; historicalFigures?: HistoricalFigure[]; folkloreAndMythology?: FolkloreEntry[];
  traditionalUses?: TraditionalUse[]; notablePoisoningCases?: PoisoningCase[]; referencesInCulture?: CultureReference[];
  culturalSignificance?: string; popularMisconceptions?: Misconception[]; culturalSensitivityFlag?: CulturalSensitivityFlag;

  // --- media ---
  media?: MediaAsset[]; primaryImageId?: string; hasMicroscopy?: boolean;

  // --- provenance & data quality (core) ---
  fieldProvenance?: FieldProvenance[]; references?: Reference[]; externalLinks?: ExternalLink[];
  dataCompletenessScore?: number; verificationLevel?: RecordVerificationLevel; lastReviewedDate?: string;
  contributors?: Contributor[]; disputeFlags?: DisputeFlag[]; recordLicense?: RecordLicense; schemaVersion?: string;
}

// ============ Enum string-union types (see §4 for full value lists) ============
// (Declared as string unions in implementation; abbreviated here.)
export type RecordTier = 'stub'|'imported'|'in-progress'|'curated'|'featured'|'reference-quality';
export type TaxonRank = string; export type TaxonomicStatus = string; export type NomenclaturalCode = string;
export type NomenclaturalStatus = string; export type SanctioningStatus = string; export type TypeStatus = string;
export type SynonymType = string; export type InfraspecificRankMarker = string; export type EtymologyRoot = string;
export type PlacementConfidence = string; export type BasidiomeType = string; export type GrowthHabit = string;
export type CapShape = string; export type SurfaceTexture = string; export type CapOrnamentation = string;
export type ColorPrimary = string; export type HymenophoreType = string; export type GillAttachment = string;
export type GillSpacing = string; export type AnnulusPresence = string; export type VolvaPresence = string;
export type StipeBaseShape = string; export type BasalMycelium = string; export type LatexColor = string;
export type SporePrintColor = string; export type OdorDescriptor = string; export type TasteDescriptor = string;
export type BruisingColor = string; export type BruisingSpeed = string; export type DevelopmentType = string;
export type FruitbodyTexture = string; export type SporeShape = string; export type SporeOrnamentation = string;
export type AmyloidReaction = string; export type GermPore = string; export type BasidiaShape = string;
export type SterigmataNumber = string; export type CystidiaPresence = string; export type CystidiaShape = string;
export type HyphalSystem = string; export type ClampConnections = string; export type TramaType = string;
export type PileipellisType = string; export type SetaePresence = string; export type CrystalsPresence = string;
export type AscusType = string; export type MountingMedium = string; export type ToxicityClass = string;
export type Toxidrome = string; export type OnsetCategory = string; export type TargetOrgan = string;
export type Antidote = string; export type ToxinThermolability = string; export type PsychoactiveStatus = string;
export type MedicinalEvidenceGrade = string; export type BioaccumulatorFlag = string; export type BioaccumElement = string;
export type BioconcentrationFactor = string; export type AllergenProfile = string; export type BluingReaction = string;
export type MacrochemicalReagent = string; export type PigmentClass = string; export type LegalScheduleStatus = string;
export type EdibilityClass = string; export type EdibilityConfidence = string; export type NoviceSafetyRating = string;
export type LookalikeRiskLevel = string; export type PreparationStep = string; export type AlcoholInteraction = string;
export type ConfusionDirection = string; export type TasteRating = string; export type FlavorProfile = string;
export type AromaDescriptor = string; export type TextureCooked = string; export type CulinaryUse = string;
export type PreservationMethod = string; export type CommercialFoodStatus = string; export type TrophicMode = string;
export type DecayType = string; export type SubstrateType = string; export type HostRelationship = string;
export type HostSpecificity = string; export type HostBreadthClass = string; export type HabitatType = string;
export type ClimateClass = string; export type SoilPreference = string; export type MoisturePreference = string;
export type FruitingSeason = string; export type PhenologyHemisphere = string; export type FruitingTriggers = string;
export type FruitingPosition = string; export type EcologicalRole = string; export type IndicatorSpeciesRole = string;
export type IucnStatus = string; export type Abundance = string; export type NativeStatus = string;
export type DistributionPattern = string; export type BiogeographicRealm = string; export type CultivationDifficulty = string;
export type CultivationMethod = string; export type AgarMedia = string; export type SpawnType = string;
export type BulkSubstrate = string; export type FreshAirExchangeRate = string; export type LightRequirement = string;
export type PinningTriggers = string; export type ContaminationSusceptibility = string; export type CommonContaminant = string;
export type SenescenceSusceptibility = string; export type DegradationSymptom = string; export type StorageMethod = string;
export type CommercialViability = string; export type MatingSystem = string; export type MatingTypeArchitecture = string;
export type PloidyState = string; export type GeneticMarker = string; export type RecommendedBarcodeMarker = string;
export type AssemblyLevel = string; export type IntraspecificVariation = string; export type NameUsageStatus = string;
export type UseType = string; export type PoisoningOutcome = string; export type MediaReferenceType = string;
export type CulturalSensitivityFlag = string; export type MediaLicense = string; export type RecordLicense = string;
export type MediaType = string; export type MediaViewType = string; export type LifecycleStage = string;
export type MediaVerificationStatus = string; export type ReferenceType = string; export type ExternalAuthority = string;
export type LinkRelationship = string; export type SourceType = string; export type ConfidenceLevel = string;
export type FieldVerificationStatus = string; export type RecordVerificationLevel = string; export type ContributorRole = string;
export type DisputeStatus = string;
```

---

## 7. Provenance & confidence model

Rather than bloat every field with source/confidence wrappers, provenance is a single **sparse** `fieldProvenance[]` array keyed by dotted field path. Only asserted, non-trivial, or safety-relevant fields get an entry; everything else inherits the record-level `verificationLevel`. A stub may have zero or one provenance entries.

Each entry carries:

- `field` — dotted path (`edibilityClass`, `toxins`, `basidiosporeDimensions.length`)
- `sourceRefId` — FK into `references[]` (or an external link)
- `sourceType` — `primary-literature` … `ai-generated-unverified`
- `confidence` — `confirmed` … `disputed`
- `verificationStatus` — `expert-verified`, `needs-review`, etc.
- `verifiedBy`, `reviewedOn`, `note`

**Why it matters.** This makes per-claim citation badges and "low / disputed" caution banners possible without doubling the field count, and keeps stub JSON tiny.

**Anti-fabrication, enforced in data.** `SourceType` deliberately includes `ai-generated-unverified` and `machine-inference` as distinct flags. Any field whose only provenance is `ai-generated-unverified` **must not be presented as fact**. Safety fields (edibility/toxicity) require a `primary-literature` / `peer-reviewed` / `authority-database` source before `verificationLevel` can exceed `community-reviewed`.

**Pragmatic v1 scope.** Per-field provenance on a community wiki is aspirational. For v1, implement record-level `verificationLevel` + `references[]` universally, and `fieldProvenance` **only** on `edibilityClass` / `toxicityClass` / edibility rationale and any disputed field. Expand as real contributor behavior justifies.

**De-duplication decisions** (so two fields never claim the same fact):

1. Common names live once in `culture.vernacularNames`; `identity.primaryCommonName` is a denormalized English display string.
2. All external DB IDs collapse into one `provenance.externalLinks[]`. Genetics keeps only sequence/assembly accessions (those are sequence records, not taxon-concept IDs).
3. Macroscopic spore-print color owned by `morphology.sporePrintColor`; microscopy keeps chart-coded/individual-spore reactions.
4. `ecology.trophicMode` is canonical; cultivation reads it for cultivability gating.
5. Toxin identity owned by `chemistry.toxins[]`; edibility carries only the actionable classification + rationale.
6. `genetics.matingSystem` canonical; cultivation references it.
7. One `classification.phylum` (molecular placement folded in).
8. Raw nutrition owned by chemistry; edibility references it.
9. `MacrochemicalReagent` vocab shared by chemistry + microscopy.

**Hierarchy is stored once.** `parentNameUsageId` is canonical. `classificationPath` and the flat rank strings are **derived at build time** (the flat strings as a denormalized output for search). Storing all three as authored fields invites drift — don't.

---

## 8. Exploration & UX

The species page and the catalog-wide discovery surfaces are driven by **one typed field registry** (group, tier, type, enumRef, safetyRelevant, unit, label). `species/[slug].astro` walks the JSON twin and the registry — no hand-authored sections. New schema fields appear automatically, in the right group, at the right tier. This eliminates the per-species MDX drift problem.

### 8.1 Species page information architecture

Progressively disclosed, instrument-grade. Three reading modes via a header segmented control — **Field** (core + safetyRelevant only), **Detailed** (+ standard), **Expert** (+ deep) — persist the choice.

1. **Safety & ID Header (sticky, above the fold).** Resolves "can this kill me / what is it" in under a second. `scientificName` + authorship, `primaryCommonName`, `edibilityClass` as the dominant color-coded badge, a hazard sub-line (`toxicityClass` + `primaryToxidrome` + `onsetCategory`, with delayed onset flagged), `deadlyLookalikeRisk` + `noviceSafetyRating` chips, a synonym banner if `taxonomicStatus` is synonym/misapplied, the `verificationLevel` trust badge, a `disputeFlags` caution ribbon, and the hero image with a media `verificationStatus` pill. Collapses to a slim sticky bar (name + edibility badge + persistent poison-control affordance) on scroll.
2. **At-a-Glance Identity Strip.** The 6–8 core triage facts hoisted from deep groups: `sporePrintColor`, `capColor` + `capDiameter`, `hymenophoreType` + `gillAttachment`, `volvaPresence` + `annulusPresence` (warning-tinted), `trophicMode` + `fruitingSeason`, short `nativeRange`. Each chip is a facet link.
3. **Hero Media Gallery.** `media[]` ordered by `viewType` into a diagnostic set (in-situ, cap-top, cap-underside-gills, stipe-base/volva, cross-section, spore-print), with `lifecycleStage` labels, always-visible license + credit, and a per-image `verificationStatus` badge. Stubs show a dignified illustrated placeholder + "contribute a photo" CTA.
4. **Identification & Lookalikes (inline comparison).** `dangerousLookalikes[]` as side-by-side comparison cards; `keyDistinguishingTests[]` as a Steps checklist; cryptic-species warning from `crypticSpeciesFlag`/`speciesComplex`; red myth-busting cards from `popularMisconceptions[]`. Selecting a lookalike opens a two-column diff auto-highlighting differing rows (spore print, ring, volva). `confusionDirection: toxic_mistaken_for_this` gets top billing.
5. **Morphology (macroscopic) — beginner default.** Gated by `basidiomeType`/`hymenophoreType` so only relevant subfields render. Anatomical SVG with hover-to-field hotspots; safety parts (volva, annulus) glow. Empty subfields collapse rather than showing N/A noise.
6. **Microscopy & Anatomy — expert disclosure (collapsed).** Spore dimensions as a scale-bar visualization with `measurementProtocol` shown as a caveat ("KOH-3pct, n=30"). Hidden entirely on stubs.
7. **Edibility & Preparation.** `edibilityRationale[]`, `toxicWhenRaw` + `preparationRequirement[]` — **validity gated by `chemistry.toxinThermolability`** (heat-stable toxins void any "cook it" claim, surfaced as a hard warning). Culinary fields suppressed for deadly/psychoactive taxa, which lead with a non-dismissible caution Aside.
8. **Chemistry, Toxins & Medicinal — expert disclosure.** Compound table; onset timeline rendered on a horizontal ingestion→symptom axis; `antidotes[]` wrapped in a mandatory "educational only — call poison control" Aside; `medicinalCompounds[]` gated hard by `medicinalEvidenceGrade`.
9. **Classification & Phylogeny.** Clickable breadcrumb tree; mini cladogram for curated tier; `placementConfidence` drives a "taxonomy in flux" note.
10. **Naming & Nomenclature — expert disclosure.** Full ICN layer; synonyms each searchable; etymology gets a "meaning of the name" delight callout.
11. **Ecology & Habitat.** Host chips, a 12-month phenology bar normalized to the user's hemisphere, GBIF range overlay on curated tier.
12. **Distribution & Biogeography.** Choropleth from `countryDistribution`, native vs introduced tinted; occurrence counts labeled as documentation density, not abundance.
13. **Cultivation & Lab — conditional.** Phase-grouped gauge/range "cockpit" tiles (inoculation → colonization → pinning → fruiting). Uncultivable taxa collapse to an explainer. Senescence/storage foregrounded as the gene-science differentiator.
14. **Genetics & Molecular — expert disclosure.** Accession chips deep-link to NCBI/UNITE; `exTypeSequence` gets a gold-standard badge; placeholder accessions explicitly labeled.
15. **Ethnomycology, History & Culture.** Multilingual name list, poisoning-case timeline, `culturalSensitivityFlag` can redact `indigenousNames` behind an attribution notice.
16. **Provenance, Sources & Data Quality (footer + inline).** Bibliography, authority chips, a completeness ring from `dataCompletenessScore`, an "Improve this record" CTA, and per-field source/confidence dots from `fieldProvenance` (with `ai-generated-unverified` styled distinctly).

### 8.2 Catalog-wide discovery features

- **Facet Console** — left-rail faceted search over a prebuilt index (Pagefind/Orama for curated, sharded JSON manifest for the long tail). Groups ordered by intent (Safety, Where/When, Looks, Lifestyle, For growers), with safety facets pinned to the top. Exact build-time counts; URL-encoded shareable state.
- **Safety-first "Is it safe?" quick filter** — composes the safety enums. The **inverse** "know your killers" gallery is safe-by-construction; the affirmative "beginner-safe edibles" preset is gated (see §9).
- **MycoGram visual feed** — masonry image grid, infinite scroll, always-visible attribution + license, per-image `verificationStatus` badge, chip filters over the same index.
- **Multi-access identification key ("Find My Mushroom")** — answer observable traits in any order; live candidate count; entropy-ranked "most discriminating next question"; persistent red banner while any deadly candidate remains; ends in "consistent with X, Y, Z — confirm with these tests," never a bare verdict.
- **Side-by-side comparison** — pin 2–4 taxa; transposed field table with diffs highlighted; safetyRelevant rows float to the top; one-click "compare with its deadly lookalikes."
- **Taxonomy tree browser** — lazy-expanded kingdom→species tree backed by `parentNameUsageId`, completeness heat tint, synonym→accepted redirect.
- **Distribution & phenology atlas** — country choropleth + radial phenology dial; a "what's fruiting near me, now" board composing season × region × edibility, hemisphere auto-flipped.
- **Color & sensory visual key** — swatch-based entry for non-experts (`capColor`, `sporePrintColor`, `gillColor`, `bruisingReaction`), feeding the ID key.
- **Grower's lens** — filter `cultivable`, `cultivationDifficulty`, method, substrate, and parameter ranges; trophic gate honored.
- **Molecular / dark-taxa explorer** — filter by `itsBarcode.available`, `genome.sequenced`, `exTypeSequence.available`, `environmentalSequenceOnly`, `psilocybinGeneCluster.present`; deep-links to external authorities.

### 8.3 Faceted search dimensions

`edibilityClass`, `noviceSafetyRating`, `deadlyLookalikeRisk`, `toxicityClass`, `primaryToxidrome`, `onsetCategory`, `psychoactiveStatus`, `bioaccumulatorFlag`, `trophicMode`, `substrateType`, `hostAssociations.taxon`, `habitatType`, `climateClass`, `fruitingSeason`, `phenologyHemisphere`, `countryDistribution`, `biogeographicRealm`, `distributionPattern`, `nativeStatus`, `elevationRange`, `basidiomeType`, `hymenophoreType`, `capColor`, `sporePrintColor`, `gillAttachment`, `annulusPresence`, `volvaPresence`, `latexPresence`, `bruisingReaction`, `odor`, `basidiosporeReactionMelzer`, `cultivable`, `cultivationDifficulty`, `primaryCultivationMethod`, `bulkSubstrates`, `abundance`, `iucnStatus`, `phylum`, `class`, `order`, `family`, `genus`, `taxonRank`, `taxonomicStatus`, `recordTier`, `verificationLevel`, `hasMicroscopy`, `primaryImageId`, `itsBarcode.available`, `genome.sequenced`, `psilocybinGeneCluster.present`, `matingSystem`, `dataCompletenessScore`.

---

## 9. Safety policy

These are not guidelines — they are **load-bearing rules**, enforced where possible as CI lints over the data (`npm run build` is the gate, CLAUDE.md §8).

1. **Unknown/absent edibility renders as active CAUTION, not neutral.** Every stub (the overwhelming majority of the catalog) has no edibility data. Unknown must read as amber/warning — "unknown, treat as potentially toxic, do not consume" — never as neutral grey, which reads as "probably fine." This is the single highest-risk presentation decision.
2. **Never auto-classify edible.** A green/`edible` affirmation requires ALL of: `edibilityConfidence >= documented` AND a backing reference in `fieldProvenance` AND `verificationLevel >= expert-reviewed`. **Build FAILS** on a green badge lacking a backing reference. Reserve green exclusively for `edibilityConfidence >= well_established` with a primary/authority source.
3. **Preparation vs thermolability is a hard invariant.** Refuse to **build** a record asserting "cooking removes hazard" when the named toxin is `heat_stable`. CI lint, build FAIL — the lethal contradiction must never enter the dataset.
4. **The ID key must never use absence of evidence to exclude a deadly taxon.** Treat null/unknown morphology as "cannot exclude." A data-poor stub Amanita must never drop out of a deadly-candidate set because `volvaPresence` is unrecorded. The persistent deadly-candidate banner is load-bearing. Document and test this invariant.
5. **Gate the affirmative "safe edibles" filter behind real review.** Require `edibilityConfidence >= well_established`, `verificationLevel >= expert-reviewed`, zero open `disputeFlags`, AND a non-dismissible "verify with a local expert, never eat on app advice alone" interstitial. Until expert review is real (not aspirational), ship only the inverse "know your killers" gallery.
6. **Defer Toxidrome Triage (symptoms→species).** People in an active poisoning will misuse it; onset/toxidrome overlap will mislead. If ever built, it must lead with and repeat a poison-control number, never present a ranked species verdict, and be framed strictly as post-hoc education with medical oversight. Recommend deferring entirely.
7. **No dosing in the data model.** `antidotes[]` stores antidote **class, never a dose** — dosing is a clinical decision. Reframe `lethalDoseHuman` as hazard context only; it must never read as a "safe sub-lethal amount." Keep antidotes behind the "educational only — call poison control" Aside.
8. **Safety-critical hero images must be high-trust.** The hero/primary image on any `deadly_poisonous` or `choice_edible` record requires `dna-confirmed` or `expert-verified` media. `community-id` images may appear in the gallery but must not be the primary triage image for safety-critical taxa. A misID'd image is a first-class safety hazard.
9. **Synonym resolution must be conservative.** Indexing `synonyms` / `misappliedNames` / `orthographicVariants` / `acceptedNameUsageId` so a search under an old name reaches the correct (possibly deadly) taxon is a safety feature. But if a name is **ambiguous** (maps to multiple accepted taxa, e.g. `sensu auct.`), do NOT silently route to one — show a disambiguation page with the toxic candidate foregrounded. A confident wrong redirect is worse than a disambiguation.
10. **Lookalike reciprocity is checked at build time.** If A lists B as a lookalike, warn unless B lists A — the lookalike graph must be effectively symmetric so a user landing on either side sees the danger.

---

## 10. Open questions & phased rollout

### Grounding reality

The raw source is `data/species.csv` / `data/taxonomy.csv`: essentially *name + 7 ranks*, a few hundred species, with a small number of hand-written MDX profiles. **Every one of the ~250 non-identity fields starts empty.** This schema describes the target, not today. Right-size accordingly — and correct the CLAUDE.md "904 MDX files" claim against what is actually on disk.

### Phase 1 — Core only (ship now)

- Implement the ~25 **core** fields for **all** records: identity, the seven Linnaean rank strings, `parentNameUsageId`, the safety triad (`edibilityClass`/`edibilityConfidence`/`toxicityClass`, defaulting to `unknown` / `unknown`), and the provenance backbone (`verificationLevel`, `references`, `recordLicense`).
- Build the data layer: ingest the CSV → sharded `public/data/species/{first-letter}.json` with `tier: stub`. Derive `classificationPath` and flat ranks at build time from `parentNameUsageId`.
- Stand up `species/[slug].astro` with `getStaticPaths` for curated + client-fetch fallback for stubs (CLAUDE.md §3).
- Stand up the single prebuilt index + Facet Console over core fields.
- Ship the safety rules from §9 that are pure presentation/lint: **unknown = caution**, never-auto-classify, lookalike reciprocity lint, synonym resolution.
- Do **not** build renderers or indexes for `deep` fields. Treat `fieldProvenance` as safety-fields-only.

### Phase 2 — Standard tier (curation target)

- Curate the "loved" hundreds into `curated`/`featured`: key morphology, ecology, distribution, sensory, `dangerousLookalikes`, media with license + verification.
- Add the inline lookalike diff, the multi-access ID key (with the §9 invariants), MycoGram, the phenology/range atlas.
- Enable per-field provenance dots on curated records.

### Phase 3 — Deep tier & moonshots (as demand justifies)

- Microscopy protocol metadata, gene clusters, genome, development ontogeny — only on `reference-quality` records, possibly as a separate "monograph" extension document fetched on demand.
- Cultivation cockpit and senescence visualizer for the handful of cultivable species.
- Open-data export and any backend-dependent features (community ID queue, public API) — these touch the §2 non-goals; frame as static "submit → GitHub issue / iNat link" MVPs first.

### Open questions

- **Non-macrofungi.** The morphology/edibility/cultivation apparatus assumes macrofungi. Lichens, yeasts, molds, rusts/smuts, and aquatic fungi are a large fraction of 80–100k taxa and would render as 90%-empty macrofungus profiles. **Decision needed:** scope v1 explicitly to macrofungi (and say so), or add a minimal lichen/microfungal branch (thallus type, photobiont, growth form). Do not silently ship empty profiles.
- **Regional edibility.** A single global `edibilityClass` + free-text `regionalEdibilityVariation` cannot drive a "safe to eat in my region" query and will be quietly wrong for chemotype-variable taxa (Tricholoma equestre, Gyromitra). Do we add a structured per-region override?
- **Taxon-concept versioning.** No `taxonConceptAccordingTo` (secundum) field — two records can disagree about what "Amanita X" means across Index Fungorum churn. Add structured concept-accordance?
- **Image-to-claim binding.** The hotspot/diff UX assumes images correspond to fields, but nothing binds "this photo shows the volva" to `volvaPresence`. Add optional `mediaEvidence: ['volvaPresence', ...]` before building those features.
- **Spore color in mount.** Add `microscopy.sporeColorInMount` (hyaline vs pigmented in KOH) — a primary keying character distinct from print color (key reserved in §3.5).
- **Phenology for the tropics.** `FruitingSeason` is temperate-calendar-centric; rainfall-driven tropical fruiting is modeled only via `year_round`/`aseasonal` + `fruitingTriggers`. Sufficient, or do we need a rainfall-phenology model?

---

## 11. Improvements / ambitious ideas backlog

| Idea | Impact | Effort |
|---|---|---|
| Field-registry-driven rendering instead of per-species MDX (one route walks the JSON twin) | High | L |
| Hoist all ~80 safetyRelevant fields into the header regardless of group order | High | M |
| Unknown/absent edibility renders as active CAUTION (one-line rule, largest safety payoff) | High | S |
| Conservative edibility gate wired to confidence + provenance (impossible to ship unsourced green) | High | S |
| Preparation-vs-thermolability contradiction as a build-FAIL lint | High | S |
| Synonym / misapplied / ambiguous landing resolver | High | S |
| Build-time data integrity lints (lookalike reciprocity, edible-needs-reference, resolvable acceptedNameUsageId, ai-only-source on safety field) | High | M |
| Make every safetyRelevant field a first-class, color-consistent facet + global EdibilityClass color legend | High | S |
| Synonym-aware search index resolution | High | S |
| `basidiomeType`/`hymenophoreType` field gating (kill N/A noise) | Medium | S |
| Inline lookalike diff view (auto-highlight differing rows) | High | M |
| Multi-access ID key with "cannot exclude on missing data" invariant | High | L |
| Anatomical SVG with safety-part glow | High | L |
| Spore-scale visualization with measurement-protocol caveat | Medium | M |
| Per-field provenance dots as a site-wide signature (ai-generated styled distinctly) | High | M |
| Completeness ring + targeted "improve this field" CTAs (stub→curated funnel) | Medium | M |
| Collapse three hierarchy representations to `parentNameUsageId` + build-time derivation | High | S |
| Trim enums to a starter core vocabulary with a documented extension process | Medium | M |
| Cultivation cockpit (phase-grouped gauge tiles) — curated tier only | Medium-High | M |
| Onset-timeline + toxin time-axis graphic | Medium-High | S |
| Phenology + range strip (hemisphere auto-flip) | Medium-High | M |
| Distribution/phenology atlas catalog-wide "in season near me" board | High | M |
| Unify Explore on ONE prebuilt index with view-toggles (grid/list/map/table/tree) | High | M |
| Image-to-claim binding (`mediaEvidence[]`) before hotspot/diff features | Medium | M |
| Replace free-text `lethalDoseHuman` / antidote dosing with hazard-context-only fields | Medium | S |
| BATSHIT: dichotomous-key generator computed from the corpus for any clade | High | L |
| BATSHIT: "what did I find?" reverse-lookup from observed characters | High | L |
| BATSHIT: "specimen bench" side-by-side diff of N records | High | L |
| BATSHIT: senescence/drift visualizer on cultivation records (gene-science pillar) | Medium | L |
| BATSHIT: toxin-mechanism micro-explainer popovers (with permanent poison-control disclaimer) | Medium | M |
| BATSHIT: open-data export (CSV / Darwin Core / JSON) + public dataset download | High | M |
| BATSHIT: "Phenology Now" geolocated in-season-near-me board | High | M |
| BATSHIT: Toxidrome Triage education mode — **defer pending medical oversight** (§9) | High (risky) | M |
| BATSHIT: community "mystery board" crowd-ID queue — needs backend; static MVP first | Medium | L |