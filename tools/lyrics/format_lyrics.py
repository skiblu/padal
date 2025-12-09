#!/usr/bin/env python3
"""
Lyrics Formatter and Transliteration Tool

This script formats Tamil/English lyrics and generates transliterations
between Tamil and English scripts.

Usage:
    python format_lyrics.py --input "lyrics text" --lang en
    python format_lyrics.py --input "lyrics text" --lang ta
    python format_lyrics.py --file input.txt --lang en

Requirements:
    pip install aksharamukha indic-transliteration
"""

import argparse
import re
import sys
from typing import List, Tuple

try:
    from aksharamukha import transliterate
except ImportError:
    print("⚠️  aksharamukha not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "aksharamukha"])
    from aksharamukha import transliterate

try:
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate as indic_transliterate
except ImportError:
    print("⚠️  indic-transliteration not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "indic-transliteration"])
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate as indic_transliterate


def extract_lyrics_from_markdown(markdown_content: str, lang: str) -> str:
    """Extract lyrics text from Jekyll markdown file."""
    import re
    
    if lang == 'ta':
        # Extract Tamil lyrics between {% capture text %} and {% endcapture %}
        pattern = r'{%\s*capture\s+text\s*%}(.*?){%\s*endcapture\s*%}'
    else:  # en
        # Extract English lyrics between {% capture text_en %} and {% endcapture %}
        pattern = r'{%\s*capture\s+text_en\s*%}(.*?){%\s*endcapture\s*%}'
    
    match = re.search(pattern, markdown_content, re.DOTALL)
    
    if match:
        lyrics = match.group(1).strip()
        # Remove backslashes used for line breaks
        lyrics = lyrics.replace('\\', '')
        return lyrics
    
    # If no match, assume it's plain text or return as-is
    return markdown_content


def clean_text(text: str) -> str:
    """Remove extra whitespace and normalize text, preserving line breaks."""
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Remove extra spaces within the line
        line = re.sub(r' +', ' ', line)
        # Remove spaces around punctuation
        line = re.sub(r'\s*([,।\.])\s*', r'\1', line)
        cleaned_lines.append(line.strip())
    
    # Join back with newlines, removing any completely empty lines at start/end
    result = '\n'.join(cleaned_lines)
    return result.strip()


def transliterate_ta_to_en(tamil_text: str) -> str:
    """Transliterate Tamil to English (readable phonetic romanization)."""
    try:
        # Use aksharamukha with ISO output
        result = transliterate.process('Tamil', 'ISO', tamil_text)
        
        # Make it more readable by converting to simple phonetics
        replacements = {
            'ā': 'aa', 'ī': 'ee', 'ū': 'oo', 'ē': 'e', 'ō': 'o',
            'ḷ': 'l', 'ṇ': 'n', 'ṟ': 'r', 'ṭ': 't', 'ḍ': 'd',
            'ṅ': 'ng', 'ñ': 'ny', 'ś': 'sh', 'ṣ': 'sh',
            'ḥ': 'h', 'ṁ': 'm',
        }
        
        for old, new in replacements.items():
            result = result.replace(old, new)
        
        # Additional cleanup for better readability
        # Convert consecutive vowels for proper pronunciation
        result = result.replace('aa', 'aa')  # keep long a
        result = result.replace('ii', 'ee')  # convert to ee
        result = result.replace('uu', 'oo')  # convert to oo
        
        # Capitalize first letter of each word
        words = result.split()
        result = ' '.join(word.capitalize() if word else word for word in words)
        
        return result
    except Exception as e:
        print(f"⚠️  Aksharamukha failed: {e}, trying simple mapping...")
        # Fallback to simple character-by-character mapping
        return simple_tamil_to_english(tamil_text)


def simple_tamil_to_english(tamil_text: str) -> str:
    """Simple Tamil to English phonetic mapping for better readability."""
    # Basic Tamil character to English mapping
    vowel_map = {
        'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo',
        'எ': 'e', 'ஏ': 'e', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'o', 'ஔ': 'au'
    }
    
    consonant_base = {
        'க': 'k', 'ங': 'ng', 'ச': 'ch', 'ஞ': 'ny', 'ட': 't', 'ண': 'n',
        'த': 'th', 'ந': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r',
        'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n'
    }
    
    # For now, use the library but with better post-processing
    try:
        result = transliterate.process('Tamil', 'ISO', tamil_text)
        
        # Simplify the output
        result = (result
                  .replace('ā', 'aa').replace('ī', 'ee').replace('ū', 'oo')
                  .replace('ē', 'ay').replace('ō', 'o')
                  .replace('ḷ', 'l').replace('ṇ', 'n').replace('ṟ', 'r')
                  .replace('ṭ', 't').replace('ḍ', 'd')
                  .replace('ṅ', 'ng').replace('ñ', 'ny').replace('ṁ', 'm')
                  .replace('ḥ', 'h').replace('ś', 'sh').replace('ṣ', 'sh'))
        
        # Add spaces between repeated syllables (e.g., "otioti" -> "oti oti")
        import re
        # Find repeated sequences of 3-5 characters
        result = re.sub(r'(\w{3,5})\1', r'\1 \1', result)
        
        return result
    except:
        # Ultimate fallback - just return cleaned up original
        return tamil_text


def transliterate_en_to_ta(english_text: str) -> str:
    """Transliterate English to Tamil script."""
    try:
        # Normalize English input for better transliteration
        text = english_text.lower()
        # Try aksharamukha
        result = transliterate.process('ISO', 'Tamil', text)
        return result
    except Exception as e:
        print(f"⚠️  Aksharamukha failed: {e}, trying indic-transliteration...")
        try:
            # Fallback to indic-transliteration
            result = indic_transliterate(text, sanscript.ITRANS, sanscript.TAMIL)
            return result
        except Exception as e2:
            print(f"❌ Transliteration failed: {e2}")
            return english_text


def add_line_breaks(lines: List[str]) -> List[str]:
    """Add backslashes at end of lines if not followed by empty line."""
    formatted_lines = []
    
    for i, line in enumerate(lines):
        # Skip if line is already empty
        if not line.strip():
            formatted_lines.append(line)
            continue
        
        # Check if next line exists and is not empty
        is_last_line = (i == len(lines) - 1)
        next_line_empty = (not is_last_line and not lines[i + 1].strip())
        
        # Add backslash if this is not the last line and next line is not empty
        # Remove any existing backslash first to avoid doubling
        clean_line = line.rstrip().rstrip('\\')
        
        if not is_last_line and not next_line_empty and line.strip():
            formatted_lines.append(clean_line + '\\')
        else:
            formatted_lines.append(clean_line)
    
    return formatted_lines


def extract_keywords(text: str, max_words: int = 10) -> str:
    """Extract first few meaningful words for lyrics_* headers."""
    # Remove special characters and split
    words = re.sub(r'[^\w\s]', '', text).split()
    # Take first max_words, filter out very short words
    keywords = [w for w in words[:max_words * 2] if len(w) > 2][:max_words]
    return ', '.join(keywords)


def generate_title(text: str) -> str:
    """Generate title from first line of lyrics."""
    # Get first line
    first_line = text.split('\n')[0].strip()
    # Remove special characters
    title = re.sub(r'[^\w\s]', '', first_line)
    # Title case
    title = ' '.join(word.capitalize() for word in title.split())
    return title


def format_lyrics_section(text: str, lang: str) -> str:
    """Format lyrics with proper liquid template tags."""
    lines = text.split('\n')
    formatted_lines = add_line_breaks(lines)
    formatted_text = chr(10).join(formatted_lines)
    
    if lang == 'ta':
        return f'{{% capture text %}}\n{formatted_text}\n{{% endcapture %}}\n{{% include lang-filter.html lang="ta" text=text %}}'
    else:  # en
        return f'{{% capture text_en %}}\n{formatted_text}\n{{% endcapture %}}\n{{% include lang-filter.html lang="en" text=text_en %}}'


def process_lyrics(input_text: str, source_lang: str) -> dict:
    """
    Process lyrics and generate both Tamil and English versions.
    
    Args:
        input_text: The lyrics text
        source_lang: 'en' or 'ta' indicating source language
    
    Returns:
        dict with 'tamil', 'english', 'lyrics_ta', 'lyrics_en', 'title'
    """
    # Don't clean text here - preserve line breaks
    input_text = input_text.strip()
    
    if source_lang == 'ta':
        tamil_text = input_text
        print("📝 Transliterating Tamil to English...")
        # Transliterate line by line to preserve structure
        tamil_lines = tamil_text.split('\n')
        english_lines = []
        for line in tamil_lines:
            if line.strip():
                transliterated = transliterate_ta_to_en(line)
                # Clean up extra spaces in transliterated line
                transliterated = re.sub(r' +', ' ', transliterated).strip()
                english_lines.append(transliterated)
            else:
                english_lines.append('')
        english_text = '\n'.join(english_lines)
    else:  # en
        english_text = input_text
        print("📝 Transliterating English to Tamil...")
        # Transliterate line by line to preserve structure
        english_lines = english_text.split('\n')
        tamil_lines = []
        for line in english_lines:
            if line.strip():
                transliterated = transliterate_en_to_ta(line)
                tamil_lines.append(transliterated)
            else:
                tamil_lines.append('')
        tamil_text = '\n'.join(tamil_lines)
    
    # Generate metadata from cleaned versions
    lyrics_ta = extract_keywords(tamil_text.replace('\n', ' '))
    lyrics_en = extract_keywords(english_text.replace('\n', ' '))
    # Always use English text for title
    title = generate_title(english_text)
    
    return {
        'tamil': tamil_text,
        'english': english_text,
        'lyrics_ta': lyrics_ta,
        'lyrics_en': lyrics_en,
        'title': title
    }


def generate_markdown(data: dict, section: str = "Ayyappa") -> str:
    """Generate complete markdown file content."""
    
    tamil_formatted = format_lyrics_section(data['tamil'], 'ta')
    english_formatted = format_lyrics_section(data['english'], 'en')
    
    markdown = f"""---
section: {section}
nav_order: 50
youtube_id: 
audio_id: 
audio_length: 
title: {data['title']}
lyrics_en: {data['lyrics_en']}
lyrics_ta: {data['lyrics_ta']}
---
{tamil_formatted}

{english_formatted}
"""
    
    return markdown


def main():
    parser = argparse.ArgumentParser(
        description='Format and transliterate Tamil/English lyrics',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # From command line text (Tamil)
  python format_lyrics.py --input "தரிசனம் கண்டேன்" --lang ta
  
  # From command line text (English)
  python format_lyrics.py --input "Dharisanam kanden" --lang en
  
  # From file
  python format_lyrics.py --file lyrics.txt --lang ta
  
  # Specify section
  python format_lyrics.py --file lyrics.txt --lang ta --section Murugan
        '''
    )
    
    parser.add_argument('--input', '-i', type=str,
                        help='Lyrics text directly as command line argument')
    parser.add_argument('--file', '-f', type=str,
                        help='Path to file containing lyrics')
    parser.add_argument('--lang', '-l', required=True, choices=['en', 'ta'],
                        help='Source language: en (English) or ta (Tamil)')
    parser.add_argument('--section', '-s', default='',
                        help='Section name (default: empty, e.g., Ayyappa, Murugan, Shivan)')
    parser.add_argument('--output', '-o', type=str,
                        help='Output file path (optional, defaults to overwriting input file)')
    parser.add_argument('--print-only', '-p', action='store_true',
                        help='Print to console instead of writing to file')
    
    args = parser.parse_args()
    
    # Get input text
    if args.input:
        input_text = args.input
        input_file = None
    elif args.file:
        try:
            with open(args.file, 'r', encoding='utf-8') as f:
                file_content = f.read()
            
            # Check if it's a markdown file with Jekyll tags
            if '{%' in file_content and 'capture' in file_content:
                print("📄 Detected Jekyll markdown file, extracting lyrics...\n")
                input_text = extract_lyrics_from_markdown(file_content, args.lang)
            else:
                input_text = file_content
            
            input_file = args.file
        except FileNotFoundError:
            print(f"❌ File not found: {args.file}")
            return 1
    else:
        print("❌ Either --input or --file must be provided")
        parser.print_help()
        return 1
    
    print(f"\n🎵 Processing lyrics (source: {args.lang.upper()})...\n")
    
    # Process lyrics
    data = process_lyrics(input_text, args.lang)
    
    # Generate markdown
    markdown_content = generate_markdown(data, args.section)
    
    # Determine output file
    if args.print_only:
        # Print to console only
        print("=" * 80)
        print(markdown_content)
        print("=" * 80)
    elif args.output:
        # Use specified output file
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        print(f"✅ Markdown saved to: {args.output}\n")
    elif input_file:
        # Overwrite the input file
        with open(input_file, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        print(f"✅ Markdown updated: {input_file}\n")
        print(f"💡 Use 'git diff {input_file}' to review changes\n")
    else:
        # No file to write to, print to console
        print("=" * 80)
        print(markdown_content)
        print("=" * 80)
    
    # Print summary
    print("\n📊 Summary:")
    print(f"   Title: {data['title']}")
    print(f"   Tamil Keywords: {data['lyrics_ta']}")
    print(f"   English Keywords: {data['lyrics_en']}")
    print(f"   Section: {args.section}")
    print()
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
