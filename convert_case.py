#!/usr/bin/env python3
"""
Convert English transliterations from ALL CAPS to proper case (first letter capital, rest lowercase)
in sarana_gosham_1008.md file.
"""

import re

file_path = "/Users/san/DEV/padal/content/ayyappa/sarana_gosham_1008.md"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the English section
in_english_section = False
modified = False

for i, line in enumerate(lines):
    # Detect English section start
    if '{% capture text_en %}' in line:
        in_english_section = True
        continue
    
    # Detect English section end
    if in_english_section and ('{% endcapture %}' in line or '`Swamiyae' in line):
        in_english_section = False
        continue
    
    # Process lines in English section
    if in_english_section:
        # Match lines like "594. THEVIDDAAMAL INIPPAVANE"
        match = re.match(r'^(\d+\.\s+)([A-Z\s!?]+)$', line.strip())
        if match:
            number = match.group(1)
            text = match.group(2)
            
            # Convert to proper case: first letter capital, rest lowercase
            # Handle special cases like "!" and "?"
            words = text.split()
            converted_words = []
            for word in words:
                if word in ['!', '?', '-']:
                    converted_words.append(word)
                else:
                    # Capitalize first letter, lowercase the rest
                    converted_words.append(word.capitalize())
            
            new_line = number + ' '.join(converted_words) + '\n'
            if new_line != line:
                lines[i] = new_line
                modified = True
                print(f"Converted line {i+1}: {line.strip()} -> {new_line.strip()}")

# Write back to file
if modified:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"\nFile updated successfully!")
else:
    print("No changes needed.")
