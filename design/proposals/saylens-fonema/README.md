# SayLens — Fonema concept

## Idea

In phonetic notation a sound is written between two slashes. The mark keeps that
device but inverts the emphasis: the disc is the hero — the object you pointed
the camera at — and the slashes flank it as the sound it makes. Say and Lens both
land in one form.

## Craft

The first version of this mark was symmetrical and mostly empty, which is why it
read as a placeholder. What changed:

- **Rhythm.** The two slashes are different lengths (460 and 520 px) and sit at
  different heights (centres at y=540 and y=484). The composition rises left to
  right instead of mirroring, and the asymmetry also kills the `M`-ligature read
  the symmetrical version had.
- **Hierarchy.** One accent, two neutrals — the same ratio the earlier Wordstack
  concept used. The indigo disc is now r=170 rather than r=104, so it reads as
  the subject and the slashes as support.
- **Frame.** The mark spans 869 px of the 1024 grid (85%), which is what makes it
  sit confidently in the icon rather than floating in it.

## Palette

- Night: `#070E18`
- Signal indigo: `#4153FB` (disc)
- Warm white: `#F7F4EE` (slashes)

Theme-native — uses the accent already in `src/app/theme/theme.ts`. No theme work.

## Geometry

- Master grid: 1024 × 1024
- Slash weight: 108 px (10.5%), fully rounded caps, 15° from vertical
- Slash centres: (195, 540) and (829, 484)
- Disc radius: 170 px (33.2% diameter)
- Minimum gap between slash and disc: 84 px (8.2%) — holds as ~2.4 px at 29 px

## Where this is weak

- It can read as a bullet between two marks, or as a slider handle between
  two rails. Worth a cold first-read test.
- The IPA reference is invisible to anyone who has not seen phonetic
  transcription, which is most of the audience. It rewards those who catch it
  and costs nothing to those who do not, but the mark cannot lean on it publicly.
- Ownable form, borrowed colour: the indigo is still the default AI-product blue.

## Status

Concept for evaluation. Not production. Before shipping: trademark screening,
cold first-read testing with 5+ people, iOS dark/tinted appearances, Android
adaptive foreground and monochrome exports, physical device testing.
