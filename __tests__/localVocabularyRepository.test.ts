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

describe('definitions', () => {
  it('explains the object in the language the learner already speaks', () => {
    expect(
      localVocabularyRepository.findByLabel('chair', {
        nativeLanguage: 'pt-BR',
        learningLanguage: 'en-US',
      }).definition,
    ).toBe('Móvel com assento e encosto para uma pessoa.');
  });

  it('follows the native language, not the one being studied', () => {
    expect(
      localVocabularyRepository.findByLabel('chair', {
        nativeLanguage: 'es',
        learningLanguage: 'pt-BR',
      }).definition,
    ).toBe('Mueble con asiento y respaldo para una persona.');
  });

  it('defines every label the detector can emit', () => {
    const undefined_ = detectorLabels.filter(
      label =>
        localVocabularyRepository.findByLabel(label, {
          nativeLanguage: 'pt-BR',
          learningLanguage: 'en-US',
        }).definition.length === 0,
    );

    expect(undefined_).toEqual([]);
  });
});

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

describe('labels outside the catalog', () => {
  it('names the object and leaves the pronunciation empty', () => {
    // Vision recognizes about 1300 labels on iOS and this catalog curates 80,
    // so an uncurated label is a normal card rather than a broken one.
    expect(
      localVocabularyRepository.findByLabel('drinking glass', {
        nativeLanguage: 'pt-BR',
        learningLanguage: 'en-US',
      }),
    ).toEqual({
      word: 'Drinking Glass',
      pronunciation: '',
      pronunciationHint: 'DRINKING GLASS',
      definition: 'Objeto reconhecido pelo modelo visual.',
      meaning: 'Objeto reconhecido pelo modelo visual.',
      translations: [],
      example: 'I can see a Drinking Glass.',
    });
  });
});
