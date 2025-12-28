#!/usr/bin/env python3
"""
Tamil Lyrics → English Transliteration Tool

Usage:
    python format_lyrics.py --input "lyrics text in Tamil"
    python format_lyrics.py --file input.txt

Requirements:
    pip install aksharamukha
"""

import argparse
import re
import sys
from typing import List

#
# Library setup
#
try:
    from aksharamukha import transliterate
except ImportError:
    print("⚠️  aksharamukha not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "aksharamukha"])
    from aksharamukha import transliterate


#
# Text helpers
#
def extract_lyrics_from_markdown(markdown_content: str) -> str:
    """Extract Tamil lyrics from Jekyll markdown if present."""
    pattern = r'{%\s*capture\s+text\s*%}(.*?){%\s*endcapture\s*%}'
    match = re.search(pattern, markdown_content, re.DOTALL)

    if match:
        lyrics = match.group(1).strip()
        return lyrics.replace('\\', '')

    return markdown_content


def add_line_breaks(lines: List[str]) -> List[str]:
    """Re-add trailing backslashes for Liquid formatting."""
    formatted = []

    for i, line in enumerate(lines):
        if not line.strip():
            formatted.append(line)
            continue

        last = (i == len(lines) - 1)
        next_blank = (not last and not lines[i + 1].strip())

        clean = line.rstrip().rstrip('\\')

        if not last and not next_blank:
            formatted.append(clean + '\\')
        else:
            formatted.append(clean)

    return formatted


#
# Transliteration
#
def transliterate_ta_to_en(tamil_text: str) -> str:
    """
    Tamil → English (Normalized Azhagi-style)
    Fully vowel-aware, consonant-aware transliteration
    suitable for lyrics & devotional text
    """

    try:
        iso = transliterate.process('Tamil', 'ISO', tamil_text)

        txt = iso

        #
        # 1️⃣ Normalize base string
        #
        txt = txt.lower()


        #
        # 2️⃣ Map Vowels (complete Tamil set)
        #
        vowel_map = [
            ('ai', 'ai'),
            ('au', 'au'),

            ('ā', 'aa'),
            ('ī', 'ee'),
            ('ū', 'oo'),
            ('ē', 'ae'),
            ('ō', 'oa'),

            ('a', 'a'),
            ('i', 'i'),
            ('u', 'u'),
            ('e', 'e'),
            ('o', 'o')
        ]

        for o, n in vowel_map:
            txt = txt.replace(o, n)


        #
        # 3️⃣ Consonants
        #
        cons_map = [
            ('ṅ', 'ng'),
            ('ñ', 'ny'),

            ('ṭ', 't'),   # retroflex hard
            ('ḍ', 'd'),
            ('ṇ', 'n'),

            ('t', 'th'),  # dental
            ('d', 'dh'),

            ('c', 's'),   # ச-series → s
            ('j', 'j'),

            ('p', 'p'),
            ('b', 'b'),
            ('m', 'm'),

            ('y', 'y'),
            ('r', 'r'),
            ('ṟ', 'r'),

            ('l', 'l'),
            ('ḷ', 'zh'),

            ('v', 'v'),

            ('ś', 'sh'),
            ('ṣ', 'sh'),
            ('s', 's'),

            ('h', 'h')
        ]

        for o, n in cons_map:
            txt = txt.replace(o, n)


        #
        # 4️⃣ Cleanup Rules
        #
        fixes = [
            ('thth', 'th'),
            ('ddh', 'dh'),
            ('mm', 'm'),
            ('nn', 'n'),
            ('rr', 'r'),
            ('ll', 'l'),

            # readable long vowel sequences
            ('iyae', 'iyae'),
            ('iya', 'iya'),
        ]

        for a, b in fixes:
            txt = txt.replace(a, b)


        #
        # 5️⃣ Capitalize each word
        #
        return " ".join(word.capitalize() for word in txt.split())

    except Exception as e:
        print(f"⚠️ Transliteration failed: {e}")
        return tamil_text

#
# Metadata helpers
#
def extract_keywords(text: str, max_words: int = 10) -> str:
    words = re.sub(r'[^\w\s]', '', text).split()
    keywords = [w for w in words[:max_words * 2] if len(w) > 2][:max_words]
    return ', '.join(keywords)


def generate_title(text: str) -> str:
    first = text.split('\n')[0].strip()
    first = re.sub(r'[^\w\s]', '', first)
    return ' '.join(w.capitalize() for w in first.split())


#
# Formatting
#
def format_lyrics_section(text: str, lang: str) -> str:
    lines = add_line_breaks(text.split('\n'))
    formatted = '\n'.join(lines)

    if lang == 'ta':
        return f'{{% capture text %}}\n{formatted}\n{{% endcapture %}}\n{{% include lang-filter.html lang="ta" text=text %}}'
    else:
        return f'{{% capture text_en %}}\n{formatted}\n{{% endcapture %}}\n{{% include lang-filter.html lang="en" text=text_en %}}'


#
# Core processing
#
def process_lyrics(tamil_text: str) -> dict:
    tamil_text = tamil_text.strip()

    english_lines = []
    for line in tamil_text.split('\n'):
        english_lines.append(
            transliterate_ta_to_en(line) if line.strip() else ''
        )

    english_text = '\n'.join(english_lines)

    lyrics_ta = extract_keywords(tamil_text.replace('\n', ' '))
    lyrics_en = extract_keywords(english_text.replace('\n', ' '))
    title = generate_title(english_text)

    return {
        'tamil': tamil_text,
        'english': english_text,
        'lyrics_ta': lyrics_ta,
        'lyrics_en': lyrics_en,
        'title': title
    }


#
# Markdown generation
#
def generate_markdown(data: dict, section: str = "") -> str:
    tamil_block = format_lyrics_section(data['tamil'], 'ta')
    english_block = format_lyrics_section(data['english'], 'en')

    return f"""---
section: {section}
nav_order: 50
youtube_id:
audio_id:
audio_length:
title: {data['title']}
lyrics_en: {data['lyrics_en']}
lyrics_ta: {data['lyrics_ta']}
---
{tamil_block}

{english_block}
"""


#
# CLI
#
def main():
    parser = argparse.ArgumentParser(description='Tamil → English Transliteration Formatter')

    parser.add_argument('--input', '-i', help='Tamil lyrics text')
    parser.add_argument('--file', '-f', help='File containing Tamil lyrics')
    parser.add_argument('--section', '-s', default='', help='Section name')
    parser.add_argument('--output', '-o', help='Output markdown file')
    parser.add_argument('--print-only', '-p', action='store_true')

    args = parser.parse_args()

    if args.input:
        text = args.input
        src_file = None
    elif args.file:
        with open(args.file, 'r', encoding='utf-8') as f:
            raw = f.read()

        if '{%' in raw and 'capture' in raw:
            print("📄 Extracting lyrics from Jekyll markdown…\n")
            text = extract_lyrics_from_markdown(raw)
        else:
            text = raw

        src_file = args.file
    else:
        print("❌ Provide --input or --file")
        return 1

    print("\n🎵 Transliteration Tamil → English…\n")

    data = process_lyrics(text)
    md = generate_markdown(data, args.section)

    if args.print_only or not (args.output or src_file):
        print("=" * 80)
        print(md)
        print("=" * 80)
    else:
        path = args.output or src_file
        with open(path, 'w', encoding='utf-8') as f:
            f.write(md)
        print(f"✅ Saved: {path}")

    print("\n📊 Summary")
    print(f"Title: {data['title']}")
    print(f"Tamil Keywords: {data['lyrics_ta']}")
    print(f"English Keywords: {data['lyrics_en']}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
