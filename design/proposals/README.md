# SayLens — identity proposals

## How this folder got here

A first concept, `saylens-wordstack`, was rejected for its form: it needs a
legend to mean anything, its first read is UI chrome (hamburger menu, list,
align-text control), the −7° tilt reads as a misalignment rather than intent, and
nothing in it is optical, leaving half the name unrepresented.

Three replacements were then drawn — and were worse. They were conceptually
defensible and visually inert: symmetrical where Wordstack had rhythm, flat
single-colour where Wordstack had one accent against two neutrals, and floating
in the frame where Wordstack filled it. Being right about the concept is not the
same as being any good at the craft.

What is in this folder now is the third pass, drawn against what Wordstack was
actually doing well, and kept in the app's own palette so the three compete on
form rather than on colour arguments.

## The three candidates

| | Fonema | Vogal | Etiqueta |
|---|---|---|---|
| Idea | the object as a disc between two phonetic slashes | the shape of a mouth on an open vowel, which is also an aperture | every object gets a label; the disc is the object inside it |
| Composition | rises left to right; slashes differ in length and height | two-tone ring, counter off centre | diagonal tag, accent disc for the hole |
| Hierarchy | disc is hero, slashes support | indigo over cream, flush split | cream body, indigo disc |
| Theme cost | none | none | none |
| 29 px | holds cleanly | holds cleanly | fails — cream blob with a dot |
| Ownable | yes | no | no |

## Ranking

**1. Fonema.** The only one that is both distinctive and correct about the
product, and the only one that carries Say and Lens in a single form without a
story attached. It is also the one that gained the most from the craft pass —
the disc becoming the hero is what turned it from a placeholder into a mark.
Its risk is a cold first read as a slider or a bullet, which is testable quickly.

**2. Vogal.** The strongest small-size performance and the weakest idea. It reads
as the letter `O` before it reads as a mouth, and the two-tone split invites a
second wrong read as a progress ring. Viable as a fallback, not as a first choice.

**3. Etiqueta — recommend dropping.** Redrawn twice and still fails at 29 px,
and the tag-with-a-hole silhouette reads as e-commerce regardless of palette. The
idea underneath it, labelling the world, is the most emotionally accurate of the
three and deserves to be carried into a different form. See its README.

## What none of these have solved

All three keep the near-black navy ground from the current theme, so on a home
screen they will still sit in the same family as every other dark-first utility
app. If standing out on the home screen matters more than matching the in-app
theme, test a light or saturated-ground variant of the chosen direction before
locking. `mark-mono.svg` in each folder is the starting point.

## Files

Each folder has `mark.svg` (transparent master), `mark-mono.svg`, `icon.svg`, and
`icon-1024/60/40/29.png`. Every PNG is rendered natively at its own pixel size
from the vector, never downscaled from the 1024 master.

`NAMING.md` covers the separate question of the product name.

## Status

All concepts, none production. No shipped iOS or Android icon, no theme file, and
no app source has been modified by this work.
