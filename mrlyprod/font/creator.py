import os
from datetime import datetime
from fontTools.fontBuilder import FontBuilder
from fontTools.misc.timeTools import timestampSinceEpoch
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.removeOverlaps import removeOverlaps
from typing import Dict, List, Optional, Tuple

class Creator:

    def __init__(self, font_name: str, pixel_size: int = 100, units_per_em: int = 1000, style_name: str = "Regular"):
        self.font_name = font_name
        self.pixel_size = pixel_size
        self.units_per_em = units_per_em
        self.characters: Dict[str, List[str]] = {}
        self.glyph_metrics: Dict[str, Dict[str, int]] = {}
        self.font_info = {
            "familyName": font_name,
            "styleName": style_name,
            "version": "1.0",
            "uniqueFontIdentifier": f"{font_name}-{style_name}",
            "psName": f"{font_name}-{style_name}",
            "ascender": int(units_per_em * 0.8),
            "descender": int(units_per_em * -0.2),
            "capHeight": int(units_per_em * 0.7),
            "xHeight": int(units_per_em * 0.5),
        }

    def add_character(self, char: str, pattern: List[str], left_margin: int = 0, right_margin: int = 0, baseline_offset: int = 0) -> None:
        if not pattern:
            raise ValueError("Pattern cannot be empty")
        width = len(pattern[0])
        if not all(len(row) == width for row in pattern):
            raise ValueError("All pattern rows must have the same length")
        self.characters[char] = pattern
        total_width = left_margin + width + right_margin
        self.glyph_metrics[char] = {
            "width": total_width * self.pixel_size,
            "left_margin": left_margin * self.pixel_size,
            "right_margin": right_margin * self.pixel_size,
            "pattern_width": width,
            "pattern_height": len(pattern),
            "baseline_offset": baseline_offset * self.pixel_size
        }

    def add_characters_from_dict(self, char_dict: Dict[str, List[str]]) -> None:
        for char, pattern in char_dict.items():
            self.add_character(char, pattern)

    def pattern_to_path(self, pattern: List[str], baseline_offset: int = 0) -> List[Tuple[str, Tuple]]:
        path_commands = []
        height = len(pattern)
        for row_idx, row in enumerate(pattern):
            y = (height - row_idx - 1) * self.pixel_size + baseline_offset
            for col_idx, pixel in enumerate(row):
                if pixel == "1":
                    x = col_idx * self.pixel_size
                    path_commands.extend([
                        ("moveTo", (x, y)),
                        ("lineTo", (x, y + self.pixel_size)),
                        ("lineTo", (x + self.pixel_size, y + self.pixel_size)),
                        ("lineTo", (x + self.pixel_size, y)),
                        ("closePath", ())
                    ])
        return path_commands

    def create_glyph_outline(self, char: str):
        if char not in self.characters:
            raise ValueError(f"Character {char} not found")
        pattern = self.characters[char]
        metrics = self.glyph_metrics[char]
        pen = TTGlyphPen(None)
        path_commands = self.pattern_to_path(pattern, metrics["baseline_offset"])
        offset_x = metrics["left_margin"]
        for command, coords in path_commands:
            if command == "moveTo":
                pen.moveTo((coords[0] + offset_x, coords[1]))
            elif command == "lineTo":
                pen.lineTo((coords[0] + offset_x, coords[1]))
            elif command == "closePath":
                pen.closePath()
        return pen.glyph()

    def build_font(self, output_path: str) -> None:
        if not self.characters:
            raise ValueError("No characters defined")
        glyph_order = [".notdef"] + sorted(self.characters.keys())
        char_map = {}
        for char in self.characters:
            char_map[ord(char)] = char
        glyphs = {}
        pen = TTGlyphPen(None)
        pen.moveTo((self.pixel_size // 2, self.pixel_size // 2))
        pen.lineTo((self.pixel_size * 2.5, self.pixel_size // 2))
        pen.lineTo((self.pixel_size * 2.5, self.pixel_size * 2.5))
        pen.lineTo((self.pixel_size // 2, self.pixel_size * 2.5))
        pen.closePath()
        glyphs[".notdef"] = pen.glyph()
        for char in self.characters:
            glyphs[char] = self.create_glyph_outline(char)
        horizontal_metrics = {}
        horizontal_metrics[".notdef"] = (self.pixel_size * 3, self.pixel_size // 2)
        for char in self.characters:
            metrics = self.glyph_metrics[char]
            horizontal_metrics[char] = (metrics["width"], metrics["left_margin"])
        fb = FontBuilder(self.units_per_em, isTTF=True)
        fb.setupGlyf(glyphs)
        fb.font.setGlyphOrder(glyph_order)
        fb.setupHorizontalMetrics(horizontal_metrics)
        fb.setupCharacterMap(char_map)
        fb.setupNameTable({
            "familyName": self.font_info["familyName"],
            "styleName": self.font_info["styleName"],
            "uniqueFontIdentifier": self.font_info["uniqueFontIdentifier"],
            "fullName": f"{self.font_info["familyName"]} {self.font_info["styleName"]}",
            "psName": self.font_info["psName"],
            "version": self.font_info["version"],
        })
        fb.setupHorizontalHeader(
            ascent=self.font_info["ascender"],
            descent=self.font_info["descender"]
        )
        fb.setupOS2(
            sTypoAscender=self.font_info["ascender"],
            sTypoDescender=self.font_info["descender"],
            usWinAscent=self.font_info["ascender"],
            usWinDescent=abs(self.font_info["descender"]),
            usWeightClass=400,
            usWidthClass=5,
            fsType=0,
            achVendID="PXFT",
            fsSelection=64,
            fsFirstCharIndex=min(ord(c) for c in self.characters),
            fsLastCharIndex=min(max(ord(c) for c in self.characters), 0xFFFF),
            sxHeight=self.font_info["xHeight"],
            sCapHeight=self.font_info["capHeight"],
            ulCodePageRange1=1,
            ulCodePageRange2=0
        )
        fb.setupPost(
            italicAngle=0.0,
            underlinePosition=-100,
            underlineThickness=50,
            isFixedPitch=True,
            minMemType42=0,
            maxMemType42=0,
            minMemType1=0,
            maxMemType1=0,
        )
        fb.font["post"].formatType = 3.0
        fb.setupMaxp()
        gasp = newTable("gasp")
        gasp.gaspRange = {0xFFFF: 0x000F}
        fb.font["gasp"] = gasp
        font = fb.font
        font["head"].created = timestampSinceEpoch(datetime.now().timestamp())
        removeOverlaps(font)
        font.save(output_path)
        print(f"Font saved to: {output_path}")

    def create_web_fonts(self, base_name: str, output_dir: str = ".") -> None:
        os.makedirs(output_dir, exist_ok=True)
        ttf_path = os.path.join(output_dir, f"{base_name}.ttf")
        self.build_font(ttf_path)
        font = TTFont(ttf_path)
        woff_path = os.path.join(output_dir, f"{base_name}.woff")
        font.flavor = "woff"
        font.save(woff_path)
        print(f"WOFF font saved to: {woff_path}")
        try:
            woff2_path = os.path.join(output_dir, f"{base_name}.woff2")
            font.flavor = "woff2"
            font.save(woff2_path)
            print(f"WOFF2 font saved to: {woff2_path}")
        except ImportError:
            print("WOFF2 support not available. Install brotli: pip install brotli")
