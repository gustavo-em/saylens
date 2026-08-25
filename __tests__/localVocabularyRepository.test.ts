import { localVocabularyRepository } from '../src/features/learning/infrastructure/vocabulary/localVocabularyRepository';

describe('localVocabularyRepository', () => {
  it('combines the language being learned with the learner native language', () => {
    expect(
      localVocabularyRepository.findByLabel('bottle', {
        nativeLanguage: 'en-US',
        learningLanguage: 'es',
      }),
    ).toMatchObject({
      word: 'Botella',
      meaning: 'Bottle',
      pronunciationHint: 'bo-TÊ-ia',
    });
  });

  it('returns Portuguese learning content with Spanish explanations', () => {
    expect(
      localVocabularyRepository.findByLabel('chair', {
        nativeLanguage: 'es',
        learningLanguage: 'pt-BR',
      }),
    ).toMatchObject({ word: 'Cadeira', meaning: 'Silla' });
  });
});

/**
 * Every label EfficientDet-Lite0 can emit, taken from the label map bundled in
 * the model asset. A detector label without curated content falls back to a
 * generic card, so this list guards the coverage.
 */
const detectorLabels = [
  'person',
  'bicycle',
  'car',
  'motorcycle',
  'airplane',
  'bus',
  'train',
  'truck',
  'boat',
  'traffic light',
  'fire hydrant',
  'stop sign',
  'parking meter',
  'bench',
  'bird',
  'cat',
  'dog',
  'horse',
  'sheep',
  'cow',
  'elephant',
  'bear',
  'zebra',
  'giraffe',
  'backpack',
  'umbrella',
  'handbag',
  'tie',
  'suitcase',
  'frisbee',
  'skis',
  'snowboard',
  'sports ball',
  'kite',
  'baseball bat',
  'baseball glove',
  'skateboard',
  'surfboard',
  'tennis racket',
  'bottle',
  'wine glass',
  'cup',
  'fork',
  'knife',
  'spoon',
  'bowl',
  'banana',
  'apple',
  'sandwich',
  'orange',
  'broccoli',
  'carrot',
  'hot dog',
  'pizza',
  'donut',
  'cake',
  'chair',
  'couch',
  'potted plant',
  'bed',
  'dining table',
  'toilet',
  'tv',
  'laptop',
  'mouse',
  'remote',
  'keyboard',
  'cell phone',
  'microwave',
  'oven',
  'toaster',
  'sink',
  'refrigerator',
  'book',
  'clock',
  'vase',
  'scissors',
  'teddy bear',
  'hair drier',
  'toothbrush',
] as const;

describe('detector label coverage', () => {
  it('curates learning content for every label the model can emit', () => {
    const uncurated = detectorLabels.filter(label => {
      const entry = localVocabularyRepository.findByLabel(label, {
        nativeLanguage: 'pt-BR',
        learningLanguage: 'en-US',
      });

      return !/^\/.+\/$/.test(entry.pronunciation);
    });

    expect(uncurated).toEqual([]);
  });

  it('is keyed by the label the detector actually emits', () => {
    // The detector reports "dining table"; a "table" key would never match.
    expect(
      localVocabularyRepository.findByLabel('dining table', {
        nativeLanguage: 'pt-BR',
        learningLanguage: 'en-US',
      }),
    ).toMatchObject({
      word: 'Table',
      meaning: 'Mesa',
      pronunciationHint: 'TÊI-bâl',
    });
  });
});
