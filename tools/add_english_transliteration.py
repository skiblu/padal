#!/usr/bin/env python3
"""
Add English Transliteration to Tamil Markdown Files

This script reads existing Tamil markdown files and adds an English transliteration
section without modifying the Tamil content or header matter.

Usage:
    python add_english_transliteration.py content/thiruvaasagam/*.md
    python add_english_transliteration.py content/ayyappa/*.md --dry-run
    python add_english_transliteration.py content/thiruvaasagam/chapter_01.md

Options:
    --dry-run       Preview changes without modifying files
    --verbose       Show detailed processing info
"""

import argparse
import re
import sys
from pathlib import Path
from typing import Optional, Tuple

try:
    from aksharamukha import transliterate
except ImportError:
    print("⚠️  aksharamukha not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "aksharamukha"])
    from aksharamukha import transliterate


class EnglishTransliterator:
    """Convert Tamil text to English transliteration."""
    
    @staticmethod
    def transliterate_ta_to_en(tamil_text: str) -> str:
        """
        Tamil → English (Normalized Azhagi-style)
        Fully vowel-aware, consonant-aware transliteration
        suitable for lyrics & devotional text
        """
        try:
            iso = transliterate.process('Tamil', 'ISO', tamil_text)
            txt = iso
            
            # Normalize base string
            txt = txt.lower()
            
            # Map Vowels (complete Tamil set)
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
            
            # Consonants
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
            
            # Cleanup Rules
            fixes = [
                ('thth', 'th'),
                ('ddh', 'dh'),
                ('mm', 'm'),
                ('nn', 'n'),
                ('rr', 'r'),
                ('ll', 'l'),
                ('iyae', 'iyae'),
                ('iya', 'iya'),
            ]
            
            for a, b in fixes:
                txt = txt.replace(a, b)
            
            # Capitalize each word
            return " ".join(word.capitalize() for word in txt.split())
        
        except Exception as e:
            print(f"⚠️  Transliteration failed: {e}")
            return tamil_text
    
    @staticmethod
    def add_line_breaks(lines) -> list:
        """Re-add trailing backslashes for Liquid formatting."""
        formatted = []
        
        for i, line in enumerate(lines):
            if not line.strip():
                formatted.append(line)
                continue
            
            # Add backslash only if immediate next line has content
            clean = line.rstrip().rstrip('\\')
            
            if i < len(lines) - 1 and lines[i + 1].strip():
                formatted.append(clean + '\\')
            else:
                formatted.append(clean)
        
        return formatted


class MarkdownProcessor:
    """Process Jekyll markdown files to add English transliteration."""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.transliterator = EnglishTransliterator()
    
    def extract_sections(self, content: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
        """
        Extract YAML front-matter, Tamil text block, and remaining content.
        Returns: (front_matter, tamil_content, rest_of_content, existing_english_block)
        """
        
        # Extract YAML front-matter
        fm_match = re.match(r'^(---\n.*?\n---)\n', content, re.DOTALL)
        front_matter = None
        remaining = content
        
        if fm_match:
            front_matter = fm_match.group(1)
            remaining = content[len(fm_match.group(0)):]
        
        # Extract Tamil capture block
        tamil_match = re.search(
            r'{%\s*capture\s+text\s*%}(.*?){%\s*endcapture\s*%}',
            remaining,
            re.DOTALL
        )
        tamil_content = None
        tamil_block = None
        
        if tamil_match:
            tamil_content = tamil_match.group(1)
            tamil_block = tamil_match.group(0)
        
        # Check for existing English block
        english_match = re.search(
            r'{%\s*capture\s+text_en\s*%}(.*?){%\s*endcapture\s*%}',
            remaining,
            re.DOTALL
        )
        existing_english = None
        
        if english_match:
            existing_english = english_match.group(0)
        
        return front_matter, tamil_content, tamil_block, existing_english
    
    def format_english_block(self, tamil_content: str) -> str:
        """Convert Tamil content to English transliteration and format as Liquid block."""
        
        # Split lines and process each one
        tamil_lines = tamil_content.split('\n')
        english_lines = []
        
        for line in tamil_lines:
            if line.strip():
                # Clean up any existing backslashes and transliterate
                clean_line = line.rstrip().rstrip('\\')
                english_line = self.transliterator.transliterate_ta_to_en(clean_line)
                english_lines.append(english_line)
            else:
                english_lines.append('')
        
        # Apply line break formatting (add backslashes)
        formatted_lines = self.transliterator.add_line_breaks(english_lines)
        formatted = '\n'.join(formatted_lines)
        
        return f'{{% capture text_en %}}\n{formatted}\n{{% endcapture %}}'
    
    def process_file(self, filepath: Path, dry_run: bool = False) -> bool:
        """
        Process a single markdown file to add English transliteration.
        Returns True if file was modified or would be modified.
        """
        
        try:
            content = filepath.read_text(encoding='utf-8')
        except Exception as e:
            print(f"  ✗ Error reading {filepath}: {e}")
            return False
        
        front_matter, tamil_content, tamil_block, existing_english = self.extract_sections(content)
        
        if not tamil_content:
            if self.verbose:
                print(f"  ⊘ No Tamil content found in {filepath.name}")
            return False
        
        if existing_english:
            if self.verbose:
                print(f"  ⊘ English version already exists in {filepath.name}")
            return False
        
        # Generate English block
        english_block = self.format_english_block(tamil_content)
        
        # Reconstruct file content
        new_content = content
        
        # Replace or add English block after Tamil block
        if tamil_block:
            insertion_point = content.find(tamil_block) + len(tamil_block)
            new_content = (
                content[:insertion_point] +
                '\n\n' +
                english_block +
                content[insertion_point:]
            )
        
        if dry_run:
            print(f"  Would modify: {filepath.name}")
            return True
        else:
            try:
                filepath.write_text(new_content, encoding='utf-8')
                print(f"  ✓ Updated: {filepath.name}")
                return True
            except Exception as e:
                print(f"  ✗ Error writing {filepath.name}: {e}")
                return False
    
    def process_files(self, file_patterns: list, dry_run: bool = False) -> Tuple[int, int]:
        """Process multiple files matching patterns."""
        
        files_to_process = []
        
        # Expand glob patterns
        for pattern in file_patterns:
            pattern_path = Path(pattern)
            if '*' in pattern:
                files_to_process.extend(sorted(Path.cwd().glob(pattern)))
            else:
                files_to_process.append(pattern_path)
        
        if not files_to_process:
            print("❌ No files found matching pattern")
            return 0, 0
        
        print(f"\n📝 Processing {len(files_to_process)} file(s)...\n")
        
        successful = 0
        skipped = 0
        
        for filepath in files_to_process:
            if not filepath.exists():
                print(f"  ✗ File not found: {filepath}")
                continue
            
            if filepath.suffix != '.md':
                if self.verbose:
                    print(f"  ⊘ Skipping non-markdown: {filepath.name}")
                continue
            
            if self.process_file(filepath, dry_run=dry_run):
                successful += 1
            else:
                skipped += 1
        
        return successful, skipped


def main():
    parser = argparse.ArgumentParser(
        description='Add English transliteration to Tamil markdown files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        'files',
        nargs='+',
        help='Markdown files to process (supports glob patterns)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without modifying files'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Verbose output'
    )
    
    args = parser.parse_args()
    
    processor = MarkdownProcessor(verbose=args.verbose)
    successful, skipped = processor.process_files(args.files, dry_run=args.dry_run)
    
    print(f"\n✅ Summary: {successful} modified, {skipped} skipped/no changes")
    
    if args.dry_run:
        print("(Use without --dry-run to actually modify files)")
    
    return 0 if successful > 0 or skipped == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
