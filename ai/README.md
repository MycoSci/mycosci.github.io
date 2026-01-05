# MycoSci AI - Mushroom Detection

## Structure

```
ai/
├── data/           # Training datasets (gitignored)
├── models/         # Exported models for deployment
├── training/       # Training scripts and notebooks
└── scripts/        # Data collection and preprocessing
```

## Training Pipeline

1. **Data Collection** - Source from iNaturalist/GBIF APIs
2. **Preprocessing** - Resize, augment, label
3. **Training** - MobileNetV3 fine-tuning
4. **Export** - TensorFlow.js, TFLite, CoreML

## Model Specs

- **Input**: 224x224 RGB
- **Architecture**: MobileNetV3Large
- **Output**: ~500-900 species classification
- **Target Size**: ~20MB (TF.js), ~8MB (TFLite quantized)
