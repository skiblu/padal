#!/usr/bin/env python3
"""
Script to convert Tamil song lyrics files to lang-filter pattern.
Adds Tamil (ta) and English pronunciation (en) blocks.
"""

import os
import re
from pathlib import Path

# Tamil to English transliteration map (basic)
TAMIL_TO_ENGLISH = {
    'அ': 'A', 'ஆ': 'Aa', 'இ': 'I', 'ஈ': 'Ee', 'உ': 'U', 'ஊ': 'Oo',
    'எ': 'E', 'ஏ': 'Ae', 'ஐ': 'Ai', 'ஒ': 'O', 'ஓ': 'O', 'ஔ': 'Au',
    'க': 'Ka', 'ங': 'Nga', 'ச': 'Sa', 'ஞ': 'Nya', 'ட': 'Da', 'ண': 'Na',
    'த': 'Tha', 'ந': 'Na', 'ப': 'Pa', 'ம': 'Ma', 'ய': 'Ya', 'ர': 'Ra',
    'ல': 'La', 'வ': 'Va', 'ழ': 'Zha', 'ள': 'La', 'ற': 'Ra', 'ன': 'Na'
}

def has_lang_filter(content):
    """Check if file already has lang-filter pattern."""
    return '{% capture text %}' in content and 'lang="ta"' in content

def should_skip_file(filepath):
    """Check if file should be skipped."""
    filename = os.path.basename(filepath)
    skip_files = ['index.md', 'favourites.md', 'feedback.md', 'notify.md']
    return filename in skip_files

def transliterate_tamil_to_english(tamil_text):
    """
    Basic transliteration of Tamil text to English pronunciation.
    This is a simplified version - manual review recommended.
    """
    # For now, return placeholder - manual transliteration recommended
    return "[English transliteration needed]"

def convert_file_to_lang_filter(filepath):
    """Convert a single file to lang-filter pattern."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if has_lang_filter(content):
        return False, "Already converted"
    
    if should_skip_file(filepath):
        return False, "Skipped (index/utility file)"
    
    # Split frontmatter and content
    parts = content.split('---', 2)
    if len(parts) < 3:
        return False, "No frontmatter found"
    
    frontmatter = parts[1]
    body = parts[2].strip()
    
    if not body:
        return False, "Empty content"
    
    # Wrap Tamil content
    tamil_block = f"{{% capture text %}}\n{body}\n{{% endcapture %}}\n{{% include lang-filter.html lang=\"ta\" text=text %}}"
    
    # Add placeholder English block
    english_block = f"\n\n{{% capture text_en %}}\n\\  \n[English pronunciation to be added]\n{{% endcapture %}}\n{{% include lang-filter.html lang=\"en\" text=text_en %}}"
    
    new_content = f"---{frontmatter}---\n{tamil_block}{english_block}\n"
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True, "Converted successfully"

def process_directory(root_dir):
    """Process all markdown files in directory and subdirectories."""
    content_dir = Path(root_dir) / 'content'
    
    stats = {
        'total': 0,
        'converted': 0,
        'already_done': 0,
        'skipped': 0,
        'failed': 0
    }
    
    for md_file in content_dir.rglob('*.md'):
        stats['total'] += 1
        print(f"Processing: {md_file.relative_to(content_dir)}")
        
        try:
            success, message = convert_file_to_lang_filter(md_file)
            
            if success:
                stats['converted'] += 1
                print(f"  ✓ {message}")
            else:
                if "Already converted" in message:
                    stats['already_done'] += 1
                elif "Skipped" in message:
                    stats['skipped'] += 1
                print(f"  - {message}")
                
        except Exception as e:
            stats['failed'] += 1
            print(f"  ✗ Error: {e}")
    
    print("\n" + "="*60)
    print("CONVERSION SUMMARY:")
    print(f"Total files: {stats['total']}")
    print(f"Converted: {stats['converted']}")
    print(f"Already done: {stats['already_done']}")
    print(f"Skipped: {stats['skipped']}")
    print(f"Failed: {stats['failed']}")
    print("="*60)
    print("\nNOTE: English transliterations need to be added manually.")
    print("Look for '[English pronunciation to be added]' placeholder.")

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        root_dir = sys.argv[1]
    else:
        root_dir = '/Users/san/DEV/padal'
    
    print(f"Processing files in: {root_dir}/content/\n")
    process_directory(root_dir)
