///
/// VisionTaxonomy.swift
/// SayLensObjectDetector
///
/// Vision names 1303 things, and the app's dictionary describes 80 of them,
/// 72 of which Vision has a name for. This table is the bridge: it turns those
/// Vision identifiers into the labels the rest of the app already speaks, so a
/// chair recognised on iOS reaches the same vocabulary card as a chair
/// recognised on Android.
///
/// Every identifier here was taken from `VNClassifyImageRequest`'s own
/// taxonomy, so none of them is a guess. Eight of the app's labels have no
/// Vision equivalent at all: baseball glove, hair drier, parking meter,
/// remote, stop sign, tennis racket, toothbrush, and wine glass.
///
/// Anything outside this table still reaches the learner. It arrives under its
/// Vision identifier and gets the generic card, which is the honest answer for
/// a word the dictionary does not carry yet.
///

import Foundation

enum VisionTaxonomy {
  /// Vision identifier to the label the app's dictionary is keyed by.
  static let labelsByIdentifier: [String: String] = [
    "adult": "person",
    "adult_cat": "cat",
    "airplane": "airplane",
    "apple": "apple",
    "armchair": "chair",
    "baby": "person",
    "backpack": "backpack",
    "ball": "sports ball",
    "banana": "banana",
    "baseball_bat": "baseball bat",
    "bear": "bear",
    "bed": "bed",
    "bench": "bench",
    "bicycle": "bicycle",
    "bird": "bird",
    "birthday_cake": "cake",
    "boat": "boat",
    "book": "book",
    "bottle": "bottle",
    "bowl": "bowl",
    "bowtie": "tie",
    "brick_oven": "oven",
    "broccoli": "broccoli",
    "bulldog": "dog",
    "bus": "bus",
    "cake": "cake",
    "cake_regular": "cake",
    "car": "car",
    "carrot": "carrot",
    "cat": "cat",
    "chair": "chair",
    "chair_other": "chair",
    "cheesecake": "cake",
    "chihuahua": "dog",
    "child": "person",
    "clock": "clock",
    "computer_keyboard": "keyboard",
    "computer_mouse": "mouse",
    "cow": "cow",
    "cup": "cup",
    "decorative_plant": "potted plant",
    "doberman": "dog",
    "dog": "dog",
    "donut": "donut",
    "elephant": "elephant",
    "firetruck": "truck",
    "folding_chair": "chair",
    "fork": "fork",
    "frisbee": "frisbee",
    "german_shepherd": "dog",
    "giraffe": "giraffe",
    "hamburger": "sandwich",
    "high_chair": "chair",
    "horse": "horse",
    "hotdog": "hot dog",
    "houseboat": "boat",
    "hummingbird": "bird",
    "hydrant": "fire hydrant",
    "kitchen_oven": "oven",
    "kitchen_sink": "sink",
    "kite": "kite",
    "kitten": "cat",
    "knife": "knife",
    "laptop": "laptop",
    "microwave": "microwave",
    "motorcycle": "motorcycle",
    "mug": "cup",
    "necktie": "tie",
    "oranges": "orange",
    "oven": "oven",
    "people": "person",
    "phone": "cell phone",
    "pizza": "pizza",
    "plant": "potted plant",
    "poodle": "dog",
    "purse": "handbag",
    "refrigerator": "refrigerator",
    "retriever": "dog",
    "rowboat": "boat",
    "sailboat": "boat",
    "sandwich": "sandwich",
    "scissors": "scissors",
    "semi_truck": "truck",
    "sheep": "sheep",
    "skateboard": "skateboard",
    "skateboarding": "skateboard",
    "ski_equipment": "skis",
    "skiing": "skis",
    "snowboard": "snowboard",
    "snowboarding": "snowboard",
    "sofa": "couch",
    "spoon": "spoon",
    "stuffed_animals": "teddy bear",
    "suitcase": "suitcase",
    "surfboard": "surfboard",
    "table": "dining table",
    "television": "tv",
    "terrier": "dog",
    "toaster": "toaster",
    "toaster_oven": "toaster",
    "toilet_seat": "toilet",
    "traffic_light": "traffic light",
    "train": "train",
    "train_real": "train",
    "truck": "truck",
    "umbrella": "umbrella",
    "vase": "vase",
    "wine_bottle": "bottle",
    "zebra": "zebra",
  ]

  static func appLabel(for identifier: String) -> String? {
    labelsByIdentifier[identifier]
  }

  /// The identifier as it should reach JavaScript: a known object under its
  /// dictionary label, an unknown one under its own name.
  static func resolve(identifier: String) -> String {
    appLabel(for: identifier) ?? identifier
  }
}
