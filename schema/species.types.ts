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

// ============ Enum string-union types (see enums[] for full value lists) ============
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
