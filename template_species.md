---
title: "{{common_names}} ({{genus}} {{species}})"
description: "{{description}}"
---


# *{{genus}} {{species}}*

<CardGrid stagger>
  <Card title="Quick Facts" icon="sparkles">
    - <Badge text="{{edibility_status}}" variant="{{variant}}" />
    - **Cap**: {{cap_summary}}
    - **Ridges**: {{gill_summary}}
    - **Spore Print**: {{spore_print_color}}
  </Card>
  <Card title="Habitat Snapshot" icon="map">
    - **Substrate**: {{substrate}}
    - **Habitat**: {{habitat}}
    - **Range**: {{geographic_distribution}}
    - **Season**: {{fruiting_season}}
  </Card>
</CardGrid>

<Aside type="caution" title="Safety Note">
  {{safety_note}}
</Aside>

## 1. Scientific Taxonomy

| Rank                | Name                     |
|---------------------|--------------------------|
| Kingdom             | Fungi                    |
| Division / Phylum   | {{division}}             |
| Class               | {{class}}                |
| Order               | {{order}}                |
| Family              | {{family}}               |
| Genus               | *{{genus}}*              |
| Species             | *{{species}}*            |
| Authority           | {{taxonomic_authority}}  |
| Synonyms            | {{synonyms}}             |

## 2. Discovery & Naming

- **Discoverer / Describer:** {{discoverer}}  
- **Year Described:** {{description_year}}  
- **Type Locality:** {{type_locality}}  
- **Type Specimen ID:** {{type_specimen_id}}  
- **Etymology:** {{etymology}}  
- **Historical Notes:** {{historical_notes}}  

## 3. Morphological Characteristics

<Tabs syncKey="morphology">
  <TabItem label="Macroscopic" icon="eye">

  ### Cap
  - **Shape:** {{cap_shape}}  
  - **Size:** {{cap_size}} cm  
  - **Color:** {{cap_color}}  
  - **Surface:** {{cap_surface}}  

  ### Ridges / False Gills
  - **Type:** {{gill_type}}  
  - **Attachment:** {{gill_attachment}}  
  - **Color:** {{gill_color}}  

  ### Stem
  - **Present:** {{stem_present}}  
  - **Dimensions:** {{stem_dimensions}} cm  
  - **Characteristics:** {{stem_characteristics}}  

  ### Flesh
  - **Color & Changes:** {{flesh_characteristics}}  
  - **Odor:** {{odor}}  
  - **Taste:** {{taste}}  

  ### Spore Print
  - **Color:** {{spore_print_color}}  

  </TabItem>

  <TabItem label="Microscopic" icon="microscope">
  - **Spore Dimensions:** {{spore_dimensions}} µm  
  - **Spore Shape:** {{spore_shape}}  
  - **Ornamentation:** {{spore_ornamentation}}  
  - **Basidia / Cystidia:** {{basidia_cystidia}}  
  </TabItem>
</Tabs>

## 4. Chemical Profile

- **Toxic Compounds:** {{toxic_compounds}}  
- **Medicinal Compounds:** {{medicinal_compounds}}  
- **Nutritional Snapshot:** {{nutritional_summary}}  
- **Secondary Metabolites:** {{secondary_metabolites}}  
- **Chemical Tests:** {{chemical_reactions}}  

## 5. DNA & Genetics

| Marker     | Accession         |
|------------|-------------------|
| ITS        | {{its_accession}} |
| LSU        | {{lsu_accession}} |
| SSU        | {{ssu_accession}} |
| Additional | {{other_markers}} |

- **Genome Assembly:** {{genome_reference}}  
- **Voucher Specimen:** {{voucher_specimen}}  

## 6. Ecology & Habitat

- **Habitat:** {{habitat}}  
- **Substrate:** {{substrate}}  
- **Symbiosis / Trophic Type:** {{trophic_type}}  
- **Ecological Role:** {{ecological_role}}  
- **Distribution:** {{geographic_distribution}}  
- **Altitude Range:** {{altitude_range}}  
- **Population Status:** {{population_status}}  

## 7. Environmental Tolerances

- **Temperature Range:** {{temperature_range}} °C  
- **Moisture Needs:** {{moisture_requirements}}  
- **pH Range:** {{ph_range}}  
- **Light:** {{light_requirements}}  
- **USDA Zones:** {{usda_zones}}  

## 8. Culinary Information

<Aside type="tip" title="Culinary Overview">
  {{culinary_overview}}
</Aside>

- **Common Uses:** {{culinary_uses}}  
- **Preparation Requirements:** {{preparation_requirements}}  
- **Flavor & Texture:** {{flavor_texture}}  
- **Nutritional Value:** {{nutritional_value}}  
- **Cautions:** {{culinary_cautions}}  

## 9. Toxicity & Safety

<Card title="Toxicity Details" icon="shield">
  **Status:** {{toxicity_status}}  
  **Toxins:** {{toxin_compounds}}  
  **Symptoms:** {{poisoning_symptoms}}  
  **Treatment:** {{treatment}}  
</Card>

## 10. Cultural & Historical Significance

- **Common Names:** {{common_names}}  
- **Folklore & Mythology:** {{folklore}}  
- **Traditional Uses:** {{traditional_uses}}  
- **Historic References:** {{historic_references}}  

## 11. Dispersal & Restoration

- **Spore Dispersal:** {{spore_dispersal}}  
- **Reproduction Mode:** {{reproduction_mode}}  
- **Cultivation Difficulty:** {{cultivation_difficulty}}  
- **Restoration Protocols:** {{restoration_protocols}}  
- **Conservation Notes:** {{conservation_notes}}  

## 12. Similar Species & Misidentifications

| Look-alike            | Key Differences       | Risk             |
|-----------------------|-----------------------|------------------|
| {{similar_species_1}} | {{differences_1}}     | {{risk_1}}       |
| {{similar_species_2}} | {{differences_2}}     | {{risk_2}}       |

## 13. Conservation Status

- **IUCN:** {{iucn_status}}  
- **Regional Status:** {{regional_status}}  
- **Threats:** {{threats}}  
- **Population Trend:** {{population_trend}}  
- **Actions:** {{conservation_actions}}  

## 14. Field Identification Rubric

<Steps>
1. {{id_step1}}  
2. {{id_step2}}  
3. {{id_step3}}  
4. {{id_step4}}  
</Steps>

<Aside type="note" title="Diagnostic Summary">
  {{diagnostic_summary}}
</Aside>

## 15. References

- {{reference1}}  
- {{reference2}}  
- {{reference3}}  

<LinkButton href="#top" variant="minimal" icon="arrow-up" iconPlacement="start">Back to top</LinkButton>
