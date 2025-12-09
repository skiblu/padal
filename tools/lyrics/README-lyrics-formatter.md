# Lyrics Formatting Tool

Automated tool to format and transliterate Tamil/English lyrics for the padal website.

## Features

1. ✅ Accepts Tamil or English lyrics as input (plain text or existing Jekyll markdown)
2. ✅ Auto-transliterates between Tamil and English scripts (line-by-line)
3. ✅ Adds backslashes at end of lines (proper formatting)
4. ✅ Generates `lyrics_ta` and `lyrics_en` keyword headers
5. ✅ Auto-generates title from English lyrics
6. ✅ Outputs complete Jekyll markdown with liquid templates
7. ✅ Overwrites input file by default (use `git diff` to review)
8. ✅ Extracts lyrics from existing Jekyll markdown files automatically

## Installation

```bash
cd tools/lyrics
pip3 install -r ../requirements.txt
```

Or the script will auto-install dependencies on first run.

## Usage

### From Plain Text File (Recommended)

Create a plain text file with just the lyrics:

**my_lyrics.txt:**
```
ஓடி ஓடி உட்கலந்த ஜோதி
ஓங்காரம் என்று உரைத்த நாத சுருதி
```

Then run:
```bash
python3 format_lyrics.py --lang ta --section Shivan --file my_lyrics.txt 
```

This will **overwrite** `my_lyrics.txt` with complete formatted markdown.

### From Existing Jekyll Markdown

You can also process existing markdown files. The script will:
1. Extract Tamil lyrics from `{% capture text %}` block
2. Re-transliterate to English
3. Regenerate the complete file

```bash
python3 format_lyrics.py --file /path/to/existing.md --lang ta --section Shivan
```

Then review changes:
```bash
git diff /path/to/existing.md
```

## Options

- `--input, -i`: Lyrics text directly as command line argument
- `--file, -f`: Path to file containing lyrics (plain text or Jekyll markdown)
- `--lang, -l`: Source language (`en` or `ta`) - **REQUIRED**
- `--section, -s`: Section name (default: empty, examples: Ayyappa, Murugan, Shivan)
- `--output, -o`: Output file path (if omitted, overwrites input file)
- `--print-only, -p`: Print to console only, don't write to file

## Default Behavior

**Important**: The script **overwrites the input file** by default!

- If you use `--file lyrics.txt`, it will update `lyrics.txt` in place
- Use `git diff` to review changes before committing
- Use `--print-only` to preview without modifying files
- Use `--output new_file.md` to save to a different file

## Examples

### Example 1: Create New Song from Tamil Lyrics

**Step 1**: Create `shivan_song.txt`:
```
ஓடி ஓடி உட்கலந்த ஜோதி
ஓங்காரம் என்று உரைத்த நாத சுருதி
```

**Step 2**: Process it:
```bash
python3 format_lyrics.py --file shivan_song.txt --lang ta --section Shivan
```

**Step 3**: Review:
```bash
cat shivan_song.txt  # Now contains complete markdown
```

**Output** (shivan_song.txt):
```markdown
---
section: Shivan
nav_order: 50
youtube_id: 
audio_id: 
audio_length: 
title: Odi Odi Utkalanta Jothi
lyrics_en: Odi, Utkalanta, Jothi, Ongkaaram, Enru, Uraitta, Naata, Suruthi
lyrics_ta: ஓடி, உடகலநத, ஜோதி, ஓஙகாரம, என்ற, உரைத்த, நாத, சுருதி
---
{% capture text %}
ஓடி ஓடி உட்கலந்த ஜோதி\
ஓங்காரம் என்று உரைத்த நாத சுருதி
{% endcapture %}
{% include lang-filter.html lang="ta" text=text %}

{% capture text_en %}
Odi Odi Utkalanta Jothi\
Ongkaaram Enru Uraitta Naata Suruthi
{% endcapture %}
{% include lang-filter.html lang="en" text=text_en %}
```

### Example 2: Update Existing Jekyll Markdown

```bash
# Process existing file
python3 format_lyrics.py --file /path/to/existing_song.md --lang ta --section Murugan

# Review changes
git diff /path/to/existing_song.md

# If satisfied, commit
git add /path/to/existing_song.md
git commit -m "Update lyrics transliteration"
```

### Example 3: Preview Without Modifying

```bash
python3 format_lyrics.py --file lyrics.txt --lang ta --section Ayyappa --print-only
```

## How It Works

1. **Input Detection**:
   - Plain text → Uses as-is
   - Jekyll markdown → Extracts lyrics from `{% capture text %}` block

2. **Line-by-Line Transliteration**: 
   - Preserves exact line structure
   - Each Tamil line → corresponding English line
   - Empty lines remain empty
   - Uses `aksharamukha` library (with `indic-transliteration` as fallback)

3. **Formatting**: 
   - Adds `\` at end of lines not followed by empty lines
   - Removes duplicate backslashes
   - Preserves stanza breaks (empty lines)

4. **Metadata Generation**:
   - `lyrics_ta`: First 10 keywords from Tamil text
   - `lyrics_en`: First 10 keywords from English text
   - `title`: Generated from first line of **English** lyrics, title-cased

5. **Output**: 
   - Complete Jekyll markdown with proper liquid template syntax
   - Overwrites input file by default

## Transliteration Libraries

The script uses two transliteration engines:

1. **Aksharamukha** (primary): Better for Tamil-to-Roman conversion
2. **Indic Transliteration** (fallback): Alternative engine if primary fails

Both handle:
- Tamil script → Roman/ISO transliteration
- Roman/ITRANS → Tamil script

## Notes

- The script automatically installs missing dependencies on first run
- Empty lines in lyrics are preserved (no backslash added)
- Last line of each stanza doesn't get a backslash
- Keywords are automatically extracted (filters out words < 3 characters)
- Title is auto-generated but can be manually edited later

## Troubleshooting

**ImportError**: Script will auto-install dependencies. If it fails:
```bash
pip install aksharamukha indic-transliteration
```

**Transliteration Issues**: The libraries work best with:
- Proper spacing between words
- Standard Tamil Unicode characters
- Roman text in ITRANS or ISO format

## Quick Reference

```bash
# Create new song from Tamil lyrics
python3 format_lyrics.py -f lyrics.txt -l ta -s Shivan

# Update existing markdown file
python3 format_lyrics.py -f existing.md -l ta -s Murugan

# Preview without saving
python3 format_lyrics.py -f lyrics.txt -l ta -p

# Save to different file
python3 format_lyrics.py -f lyrics.txt -l ta -s Ayyappa -o new_song.md

# Review changes
git diff path/to/file.md
```

## Workflow Tips

1. **Always use git**: Commit before running the script so you can review changes
2. **Preview first**: Use `--print-only` to see output before modifying files
3. **Title from English**: Titles are auto-generated from English transliteration
4. **Section is optional**: Leave blank and add later in Jekyll front matter
5. **Line-by-line**: Script preserves line breaks exactly, no manual formatting needed
