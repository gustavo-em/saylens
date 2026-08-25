export type CollectionId =
  | 'kitchen'
  | 'living-room'
  | 'bedroom'
  | 'bathroom'
  | 'street'
  | 'animals'
  | 'sports';

export interface Collection {
  id: CollectionId;
  /** Detector labels that belong here. A label may sit in more than one. */
  labels: readonly string[];
}

/**
 * The collections are the app's content: nothing is authored lesson by lesson,
 * a room is simply the set of labels the detector can find in it.
 */
export const collections: readonly Collection[] = [
  {
    id: 'kitchen',
    labels: [
      'bottle',
      'cup',
      'fork',
      'knife',
      'spoon',
      'bowl',
      'microwave',
      'oven',
      'toaster',
      'sink',
      'refrigerator',
      'banana',
      'apple',
      'sandwich',
      'orange',
      'broccoli',
      'carrot',
      'pizza',
      'donut',
      'cake',
    ],
  },
  {
    id: 'living-room',
    labels: [
      'couch',
      'chair',
      'tv',
      'remote',
      'book',
      'clock',
      'vase',
      'laptop',
      'mouse',
      'keyboard',
    ],
  },
  {
    id: 'bedroom',
    labels: [
      'bed',
      'book',
      'clock',
      'laptop',
      'backpack',
      'tie',
      'handbag',
      'suitcase',
    ],
  },
  {
    id: 'bathroom',
    labels: ['toilet', 'sink', 'toothbrush', 'scissors'],
  },
  {
    id: 'street',
    labels: [
      'person',
      'car',
      'bicycle',
      'motorcycle',
      'bus',
      'train',
      'truck',
      'boat',
      'airplane',
      'bench',
      'umbrella',
    ],
  },
  {
    id: 'animals',
    labels: [
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
    ],
  },
  {
    id: 'sports',
    labels: ['frisbee', 'skis', 'snowboard', 'kite', 'skateboard', 'surfboard'],
  },
];

export interface CollectionProgress {
  collection: Collection;
  found: readonly string[];
  missing: readonly string[];
}

export function getCollectionProgress(
  collection: Collection,
  foundLabels: readonly string[],
): CollectionProgress {
  const found = new Set(foundLabels);

  return {
    collection,
    found: collection.labels.filter(label => found.has(label)),
    missing: collection.labels.filter(label => !found.has(label)),
  };
}

export function getCollectionsProgress(
  foundLabels: readonly string[],
): CollectionProgress[] {
  return collections.map(collection =>
    getCollectionProgress(collection, foundLabels),
  );
}
