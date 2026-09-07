#!/usr/bin/env python3
"""Render Lesingo Wordstack assets from vector geometry for every platform slot.

Each output is rendered directly from SVG geometry at its target dimensions.
No PNG is used as the source for another size.
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SIPS = "/usr/bin/sips"

DARK = "#070E18"
DARK_APPEARANCE = "#03070D"
# The field on the dark appearance: the same violet, taken down so it does
# not glare on a dark home screen.
INDIGO_DARK_FIELD = "#482CBA"
BLUE = "#5E41D2"
BLUE_DARK_APPEARANCE = "#6F54DE"
CREAM = "#F7F4EE"

# The three word bars, and the transform that stands them up. Both come from
# src/assets/lesingo-mark.svg, which is what the app itself draws: full pills
# rather than the half-capped paths of the first concept sheet, and a steep
# -38 degrees rather than the -7 that sheet documents.
BARS = (
    (374, 286, 272, 120),
    (336, 454, 412, 120),
    (342, 622, 272, 120),
)
BAR_RADIUS = 60
MARK_TRANSFORM = "translate(512,512) rotate(-38) scale(1.25) translate(-542,-514)"
# The rotated, scaled mark's own bounding box, for the tight crops.
MARK_BOUNDS = "128 128 768 768"
# Android draws the adaptive foreground on a canvas larger than the tile it
# shows, so the mark is pulled in to sit inside the safe zone.
ADAPTIVE_SCALE = 0.744


def svg_document(
    size: int,
    *,
    background: str | None,
    colors: tuple[str, str, str],
    round_background: bool = False,
    tight_mark: bool = False,
    mark_scale: float = 1.0,
) -> str:
    view_box = MARK_BOUNDS if tight_mark else "0 0 1024 1024"
    if background is None:
        field = ""
    elif round_background:
        field = f'<circle cx="512" cy="512" r="512" fill="{background}"/>'
    else:
        field = f'<rect width="1024" height="1024" fill="{background}"/>'

    if len(colors) != len(BARS):
        raise ValueError(f"expected {len(BARS)} bar colours, got {len(colors)}")

    bars = "".join(
        f'<rect x="{x}" y="{y}" width="{width}" height="{height}" '
        f'rx="{BAR_RADIUS}" fill="{color}"/>'
        for (x, y, width, height), color in zip(BARS, colors)
    )
    transform = MARK_TRANSFORM
    if mark_scale != 1.0:
        transform = (
            f"translate(512,512) scale({mark_scale}) translate(-512,-512) "
            f"{MARK_TRANSFORM}"
        )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" '
        f'height="{size}" viewBox="{view_box}">'
        f'{field}<g transform="{transform}">{bars}</g></svg>'
    )


def render(svg: str, output: Path, *, opaque: bool) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="lesingo-brand-") as temp_dir:
        source = Path(temp_dir) / "source.svg"
        rendered = Path(temp_dir) / "rendered.png"
        source.write_text(svg, encoding="utf-8")
        subprocess.run(
            [SIPS, "-s", "format", "png", str(source), "--out", str(rendered)],
            check=True,
            stdout=subprocess.DEVNULL,
        )
        with Image.open(rendered) as image:
            target = image.convert("RGB" if opaque else "RGBA")
            target.save(output, format="PNG", optimize=True)


def render_full_icon(
    output: Path,
    size: int,
    *,
    # The icon is the mark as the app itself draws it: the near-black field of
    # the launch screen, the top bar in the brand violet, the other two in
    # cream. Flattening all three bars to cream over a violet field made the
    # icon and the splash two different marks.
    background: str = DARK,
    colors: tuple[str, str, str] = (BLUE, CREAM, CREAM),
    round_background: bool = False,
    opaque: bool = True,
) -> None:
    render(
        svg_document(
            size,
            background=background,
            colors=colors,
            round_background=round_background,
        ),
        output,
        opaque=opaque,
    )


def render_mark(
    output: Path,
    size: int,
    *,
    colors: tuple[str, str, str],
    tight: bool = False,
    mark_scale: float = 1.0,
) -> None:
    render(
        svg_document(
            size,
            background=None,
            colors=colors,
            tight_mark=tight,
            mark_scale=mark_scale,
        ),
        output,
        opaque=False,
    )


def generate_ios() -> None:
    app_icon = ROOT / "ios/Lesingo/Images.xcassets/AppIcon.appiconset"
    for size in (40, 58, 60, 80, 87, 120, 180, 1024):
        render_full_icon(app_icon / f"Icon-{size}.png", size)

    render_full_icon(
        app_icon / "Icon-1024-dark.png",
        1024,
        background=DARK_APPEARANCE,
        colors=(BLUE_DARK_APPEARANCE, CREAM, CREAM),
    )
    render_full_icon(
        app_icon / "Icon-1024-tinted.png",
        1024,
        background="#171717",
        colors=("#F7F4EE", "#F7F4EE", "#F7F4EE"),
    )

    launch = ROOT / "ios/Lesingo/Images.xcassets/LaunchLogo.imageset"
    for scale, size in ((1, 96), (2, 192), (3, 288)):
        render_mark(
            launch / f"launch-logo@{scale}x.png",
            size,
            colors=(CREAM, CREAM, CREAM),
            tight=True,
        )


def generate_android() -> None:
    res = ROOT / "android/app/src/main/res"
    densities = {
        "mdpi": (48, 108),
        "hdpi": (72, 162),
        "xhdpi": (96, 216),
        "xxhdpi": (144, 324),
        "xxxhdpi": (192, 432),
    }

    for density, (legacy_size, adaptive_size) in densities.items():
        mipmap = res / f"mipmap-{density}"
        drawable = res / f"drawable-{density}"

        render_full_icon(mipmap / "ic_launcher.png", legacy_size)
        render_full_icon(
            mipmap / "ic_launcher_round.png",
            legacy_size,
            round_background=True,
            opaque=False,
        )
        render_full_icon(mipmap / "lesingo_source.png", legacy_size)

        render_mark(
            drawable / "ic_lesingo_foreground.png",
            adaptive_size,
            colors=(BLUE, CREAM, CREAM),
            mark_scale=ADAPTIVE_SCALE,
        )
        render_mark(
            drawable / "ic_lesingo_monochrome.png",
            adaptive_size,
            colors=("#000000", "#000000", "#000000"),
            mark_scale=ADAPTIVE_SCALE,
        )


def main() -> None:
    generate_ios()
    generate_android()
    print("Generated Lesingo brand assets from vector geometry.")


if __name__ == "__main__":
    main()
