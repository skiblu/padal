#!/usr/bin/env python3
"""
validate_content_metadata.py

Scans all *.md files in content/** directories and validates:
1. Files with "section" id
2. Files missing youtube_id
3. Files missing audio_id and/or audio_length
4. Audio file availability and duration validation

Usage:
    python3 tools/validate_content_metadata.py
    python3 tools/validate_content_metadata.py --check-audio
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import urllib.request
import urllib.error
from mutagen.mp3 import MP3
from datetime import datetime
import argparse

# Base paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
CONTENT_DIR = PROJECT_ROOT / "content"

# Configurable constants
AUDIO_BASE_URL = "https://assets.bhaktipadal.in/audio"
REPORT_OUTPUT_DIR = SCRIPT_DIR / "reports"


def parse_frontmatter(content: str) -> Dict[str, str]:
    """Extract YAML frontmatter from markdown content"""
    frontmatter = {}
    
    # Match YAML frontmatter between --- delimiters
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not match:
        return frontmatter
    
    yaml_content = match.group(1)
    
    # Parse simple key: value pairs
    for line in yaml_content.split('\n'):
        line = line.strip()
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            frontmatter[key] = value
    
    return frontmatter


def scan_markdown_files() -> List[Tuple[Path, Dict[str, str]]]:
    """Scan all .md files in content/** and extract frontmatter"""
    print("📂 Scanning markdown files...")
    files_with_metadata = []
    
    if not CONTENT_DIR.exists():
        print(f"Error: Content directory not found: {CONTENT_DIR}")
        return files_with_metadata
    
    # Recursively find all .md files
    file_count = 0
    for md_file in CONTENT_DIR.rglob("*.md"):
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            frontmatter = parse_frontmatter(content)
            
            # Only include files with section id
            if 'section' in frontmatter and frontmatter['section']:
                files_with_metadata.append((md_file, frontmatter))
                file_count += 1
                if file_count % 10 == 0:
                    print(f"   Found {file_count} files with section id...", end='\r')
        
        except Exception as e:
            print(f"Warning: Error reading {md_file}: {e}")
    
    print(f"   ✓ Found {len(files_with_metadata)} files with section id    ")
    return files_with_metadata


def report_missing_youtube_id(files_with_metadata: List[Tuple[Path, Dict[str, str]]]):
    """Report files missing youtube_id"""
    print("\n🎥 Checking YouTube IDs...")
    missing_youtube = []
    
    for file_path, metadata in files_with_metadata:
        youtube_id = metadata.get('youtube_id', '').strip()
        if not youtube_id:
            missing_youtube.append(file_path)
    
    print(f"   ✓ Found {len(missing_youtube)} files without YouTube ID")
    return missing_youtube


def report_missing_audio_metadata(files_with_metadata: List[Tuple[Path, Dict[str, str]]]):
    """Report files missing audio_id and/or audio_length"""
    print("🎵 Checking audio metadata...")
    missing_audio_id = []
    missing_audio_length = []
    missing_both = []
    
    for file_path, metadata in files_with_metadata:
        audio_id = metadata.get('audio_id', '').strip()
        audio_length = metadata.get('audio_length', '').strip()
        
        has_audio_id = bool(audio_id)
        has_audio_length = bool(audio_length)
        
        if not has_audio_id and not has_audio_length:
            missing_both.append(file_path)
        elif not has_audio_id:
            missing_audio_id.append(file_path)
        elif not has_audio_length:
            missing_audio_length.append(file_path)
    
    total = len(missing_both) + len(missing_audio_id) + len(missing_audio_length)
    print(f"   ✓ Found {total} files with missing audio metadata")
    
    return {
        'missing_both': missing_both,
        'missing_audio_id': missing_audio_id,
        'missing_audio_length': missing_audio_length
    }


def check_section_folder_mismatch(files_with_metadata: List[Tuple[Path, Dict[str, str]]]):
    """Check if section id matches parent folder name"""
    print("📁 Checking section/folder name matches...")
    mismatches = []
    
    for file_path, metadata in files_with_metadata:
        section = metadata.get('section', '').strip().lower().replace(' ', '')
        parent_folder = file_path.parent.name.lower().replace(' ', '')
        
        if section != parent_folder:
            mismatches.append({
                'file': file_path,
                'section': metadata.get('section', ''),
                'folder': file_path.parent.name
            })
    
    print(f"   ✓ Found {len(mismatches)} section/folder mismatches")
    return mismatches


def check_missing_lyrics(files_with_metadata: List[Tuple[Path, Dict[str, str]]]):
    """Check for files missing lyrics_en and/or lyrics_ta"""
    print("📝 Checking lyrics availability...")
    missing_lyrics_en = []
    missing_lyrics_ta = []
    missing_both = []
    
    for file_path, metadata in files_with_metadata:
        lyrics_en = metadata.get('lyrics_en', '').strip()
        lyrics_ta = metadata.get('lyrics_ta', '').strip()
        
        has_lyrics_en = bool(lyrics_en)
        has_lyrics_ta = bool(lyrics_ta)
        
        if not has_lyrics_en and not has_lyrics_ta:
            missing_both.append(file_path)
        elif not has_lyrics_en:
            missing_lyrics_en.append(file_path)
        elif not has_lyrics_ta:
            missing_lyrics_ta.append(file_path)
    
    total = len(missing_both) + len(missing_lyrics_en) + len(missing_lyrics_ta)
    print(f"   ✓ Found {total} files with missing lyrics")
    
    return {
        'missing_both': missing_both,
        'missing_lyrics_en': missing_lyrics_en,
        'missing_lyrics_ta': missing_lyrics_ta
    }


def check_nav_order_not_50(files_with_metadata: List[Tuple[Path, Dict[str, str]]]):
    """Check files with nav_order not equal to 50"""
    print("🔢 Checking nav_order values...")
    non_50_nav_order = []
    
    for file_path, metadata in files_with_metadata:
        nav_order = metadata.get('nav_order', '').strip()
        
        # Check if nav_order exists and is not 50
        if nav_order and nav_order != '50':
            non_50_nav_order.append({
                'file': file_path,
                'nav_order': nav_order
            })
    
    print(f"   ✓ Found {len(non_50_nav_order)} files with nav_order ≠ 50")
    return non_50_nav_order


def get_mp3_duration(file_path: str) -> Optional[float]:
    """Get duration of MP3 file in seconds"""
    try:
        audio = MP3(file_path)
        return audio.info.length
    except Exception as e:
        print(f"    Error reading MP3 duration: {e}")
        return None


def download_and_verify_audio(files_with_metadata: List[Tuple[Path, Dict[str, str]]]):
    """Download audio files and verify duration matches metadata"""
    print("\n🔊 Validating audio files...")
    files_with_audio = []
    
    # Filter files that have both audio_id and audio_length
    for file_path, metadata in files_with_metadata:
        audio_id = metadata.get('audio_id', '').strip()
        audio_length = metadata.get('audio_length', '').strip()
        section = metadata.get('section', '').strip()
        
        if audio_id and audio_length and section:
            files_with_audio.append((file_path, metadata))
    
    if not files_with_audio:
        print("   ℹ️  No files with audio metadata to validate")
        return {
            'validated_ok': [],
            'download_errors': [],
            'duration_mismatches': []
        }
    
    print(f"   Processing {len(files_with_audio)} audio files...")
    
    # Create temp directory for downloads
    temp_dir = Path("/tmp/padal_audio_validation")
    temp_dir.mkdir(exist_ok=True)
    
    download_errors = []
    duration_mismatches = []
    validated_ok = []
    
    for idx, (file_path, metadata) in enumerate(files_with_audio, 1):
        audio_id = metadata['audio_id']
        section = metadata['section']
        expected_length = metadata['audio_length']
        
        # Construct URL
        audio_url = f"{AUDIO_BASE_URL}/{section}/{audio_id}.mp3"
        temp_file = temp_dir / f"{audio_id}.mp3"
        
        rel_path = file_path.relative_to(PROJECT_ROOT)
        
        # Progress indicator
        print(f"   [{idx}/{len(files_with_audio)}] {rel_path.name}...", end='\r')
        
        try:
            # Download file with timeout and proper headers
            req = urllib.request.Request(
                audio_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                with open(temp_file, 'wb') as out_file:
                    out_file.write(response.read())
            
            # Get actual duration
            actual_duration = get_mp3_duration(str(temp_file))
            
            if actual_duration is None:
                download_errors.append({
                    'file': str(rel_path),
                    'url': audio_url,
                    'error': 'Could not read MP3 duration'
                })
                continue
            
            # Parse expected duration (format: "MM:SS" or "M:SS")
            try:
                parts = expected_length.split(':')
                if len(parts) == 2:
                    expected_seconds = int(parts[0]) * 60 + int(parts[1])
                elif len(parts) == 3:
                    expected_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                else:
                    expected_seconds = float(expected_length)
            except ValueError:
                download_errors.append({
                    'file': str(rel_path),
                    'url': audio_url,
                    'error': f'Invalid duration format: {expected_length}'
                })
                continue
            
            # Compare durations (allow 1 second tolerance)
            difference = abs(actual_duration - expected_seconds)
            
            if difference > 1.0:
                duration_mismatches.append({
                    'file': str(rel_path),
                    'url': audio_url,
                    'expected': expected_seconds,
                    'actual': round(actual_duration),
                    'difference': round(difference, 2),
                    'expected_formatted': expected_length
                })
            else:
                validated_ok.append({
                    'file': str(rel_path),
                    'url': audio_url,
                    'duration': round(actual_duration)
                })
            
            # Clean up temp file
            temp_file.unlink()
        
        except urllib.error.HTTPError as e:
            download_errors.append({
                'file': str(rel_path),
                'url': audio_url,
                'error': f'HTTP {e.code} - {e.reason}'
            })
        
        except urllib.error.URLError as e:
            download_errors.append({
                'file': str(rel_path),
                'url': audio_url,
                'error': f'URL Error: {e.reason}'
            })
        
        except TimeoutError as e:
            download_errors.append({
                'file': str(rel_path),
                'url': audio_url,
                'error': 'Download timeout (30s)'
            })
        
        except Exception as e:
            download_errors.append({
                'file': str(rel_path),
                'url': audio_url,
                'error': str(e)
            })
    
    # Clean up temp directory
    try:
        temp_dir.rmdir()
    except:
        pass
    
    print(f"   ✓ Validated {len(validated_ok)} OK, {len(duration_mismatches)} mismatches, {len(download_errors)} errors" + " "*20)
    
    return {
        'validated_ok': validated_ok,
        'download_errors': download_errors,
        'duration_mismatches': duration_mismatches
    }


def generate_html_report(data: Dict) -> str:
    """Generate beautiful HTML report"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bhakti Padal - Quality Check Report</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        .header {{
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .header h1 {{
            color: #2d3748;
            font-size: 32px;
            margin-bottom: 10px;
        }}
        .header .subtitle {{
            color: #718096;
            font-size: 14px;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }}
        .stat-card {{
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }}
        .stat-card.success {{ border-left-color: #48bb78; }}
        .stat-card.warning {{ border-left-color: #ed8936; }}
        .stat-card.error {{ border-left-color: #f56565; }}
        .stat-card.info {{ border-left-color: #4299e1; }}
        .stat-card .label {{
            color: #718096;
            font-size: 14px;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .stat-card .value {{
            color: #2d3748;
            font-size: 36px;
            font-weight: bold;
        }}
        .section {{
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .section h2 {{
            color: #2d3748;
            font-size: 24px;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
        }}
        .section.empty {{
            text-align: center;
            color: #48bb78;
            font-size: 18px;
            padding: 40px;
        }}
        .section.empty::before {{
            content: "✓";
            display: block;
            font-size: 48px;
            margin-bottom: 10px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }}
        th {{
            background: #f7fafc;
            color: #2d3748;
            font-weight: 600;
            text-align: left;
            padding: 12px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        td {{
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            color: #4a5568;
            font-size: 14px;
        }}
        tr:hover {{
            background: #f7fafc;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }}
        .badge.success {{
            background: #c6f6d5;
            color: #22543d;
        }}
        .badge.error {{
            background: #fed7d7;
            color: #742a2a;
        }}
        .badge.warning {{
            background: #feebc8;
            color: #7c2d12;
        }}
        .url {{
            color: #667eea;
            text-decoration: none;
            font-size: 13px;
            word-break: break-all;
        }}
        .url:hover {{
            text-decoration: underline;
        }}
        .file-path {{
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #2d3748;
        }}
        .diff {{
            font-weight: 600;
            color: #f56565;
        }}
        .footer {{
            text-align: center;
            color: white;
            margin-top: 30px;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🕉️ Bhakti Padal - Quality Check Report</h1>
            <p class="subtitle">Generated on {timestamp}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Total Files Scanned</div>
                <div class="value">{data['total_files']}</div>
            </div>
            <div class="stat-card success">
                <div class="label">Audio Validated OK</div>
                <div class="value">{data['audio_results']['validated_ok_count']}</div>
            </div>
            <div class="stat-card warning">
                <div class="label">Missing YouTube ID</div>
                <div class="value">{data['missing_youtube_count']}</div>
            </div>
            <div class="stat-card error">
                <div class="label">Missing Audio Metadata</div>
                <div class="value">{data['missing_audio_total']}</div>
            </div>
            <div class="stat-card error">
                <div class="label">Duration Mismatches</div>
                <div class="value">{data['audio_results']['duration_mismatches_count']}</div>
            </div>
            <div class="stat-card error">
                <div class="label">Download Errors</div>
                <div class="value">{data['audio_results']['download_errors_count']}</div>
            </div>
            <div class="stat-card warning">
                <div class="label">Section/Folder Mismatch</div>
                <div class="value">{data['section_mismatch_count']}</div>
            </div>
            <div class="stat-card warning">
                <div class="label">Missing Lyrics</div>
                <div class="value">{data['missing_lyrics_total']}</div>
            </div>
            <div class="stat-card info">
                <div class="label">Nav Order ≠ 50</div>
                <div class="value">{data['nav_order_not_50_count']}</div>
            </div>
        </div>
"""

    # Section/Folder Mismatch
    if data['section_folder_mismatch']:
        html += f"""
        <div class="section">
            <h2>⚠️ Section ID / Folder Name Mismatch ({len(data['section_folder_mismatch'])})</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>File Path</th>
                        <th>Section ID</th>
                        <th>Parent Folder</th>
                    </tr>
                </thead>
                <tbody>
"""
        for idx, item in enumerate(data['section_folder_mismatch'], 1):
            html += f"""
                    <tr>
                        <td>{idx}</td>
                        <td class="file-path">{item['file']}</td>
                        <td><span class="badge warning">{item['section']}</span></td>
                        <td><span class="badge warning">{item['folder']}</span></td>
                    </tr>
"""
        html += """
                </tbody>
            </table>
        </div>
"""
    else:
        html += """
        <div class="section empty">
            All section IDs match their parent folder names
        </div>
"""

    # Missing YouTube ID
    if data['missing_youtube']:
        html += """
        <div class="section">
            <h2>⚠️ Missing YouTube ID</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>File Path</th>
                    </tr>
                </thead>
                <tbody>
"""
        for idx, file_path in enumerate(data['missing_youtube'], 1):
            html += f"""
                    <tr>
                        <td>{idx}</td>
                        <td class="file-path">{file_path}</td>
                    </tr>
"""
        html += """
                </tbody>
            </table>
        </div>
"""
    else:
        html += """
        <div class="section empty">
            All files have YouTube ID
        </div>
"""

    # Missing Audio Metadata
    total_missing = data['missing_audio_both'] + data['missing_audio_id'] + data['missing_audio_length']
    if total_missing:
        html += """
        <div class="section">
            <h2>⚠️ Missing Audio Metadata</h2>
"""
        if data['missing_audio_both']:
            html += f"""
            <h3 style="color: #f56565; margin: 20px 0 10px 0;">Missing Both audio_id and audio_length ({len(data['missing_audio_both'])})</h3>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>File Path</th>
                    </tr>
                </thead>
                <tbody>
"""
            for idx, file_path in enumerate(data['missing_audio_both'], 1):
                html += f"""
                    <tr>
                        <td>{idx}</td>
                        <td class="file-path">{file_path}</td>
                    </tr>
"""
            html += """
                </tbody>
            </table>
"""
        
        if data['missing_audio_id']:
            html += f"""
            <h3 style="color: #ed8936; margin: 20px 0 10px 0;">Missing audio_id Only ({len(data['missing_audio_id'])})</h3>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>File Path</th>
                    </tr>
                </thead>
                <tbody>
"""
            for idx, file_path in enumerate(data['missing_audio_id'], 1):
                html += f"""
                    <tr>
                        <td>{idx}</td>
                        <td class="file-path">{file_path}</td>
                    </tr>
"""
            html += """
                </tbody>
            </table>
"""
        
        if data['missing_audio_length']:
            html += f"""
            <h3 style="color: #ed8936; margin: 20px 0 10px 0;">Missing audio_length Only ({len(data['missing_audio_length'])})</h3>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>File Path</th>
                    </tr>
                </thead>
                <tbody>
"""
            for idx, file_path in enumerate(data['missing_audio_length'], 1):
                html += f"""
                    <tr>
                        <td>{idx}</td>
                        <td class="file-path">{file_path}</td>
                    </tr>
"""
            html += """
                </tbody>
            </table>
"""
        html += """
        </div>
"""
    else:
        html += """
        <div class="section empty">
            All files have audio_id and audio_length
        </div>
"""

    # Missing Lyrics
    total_missing_lyrics = data['missing_lyrics_both'] + data['missing_lyrics_en'] + data['missing_lyrics_ta']
    if total_missing_lyrics:
        html += """
        <div class="section">
            <h2>⚠️ Missing Lyrics</h2>
"""
        if data['missing_lyrics_both']:
            html += f"""
            <h3 style="color: #f56565; margin: 20px 0 10px 0;">Missing Both lyrics_en and lyrics_ta ({len(data['missing_lyrics_both'])})</h3>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>File Path</th>
                    </tr>
                </thead>
                <tbody>
"""
            for idx, file_path in enumerate(data['missing_lyrics_both'], 1):
                html += f"""
                    <tr>
                        <td>{idx}</td>
                        <td class="file-path">{file_path}</td>
                    </tr>
"""
            html += """
                </tbody>
            </table>
"""
        
        if data['missing_lyrics_en']:
            html += f"""
            <h3 style="color: #ed8936; margin: 20px 0 10px 0;">Missing lyrics_en Only ({len(data['missing_lyrics_en'])})</h3>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>File Path</th>
                    </tr>
                </thead>
                <tbody>
"""
            for idx, file_path in enumerate(data['missing_lyrics_en'], 1):
                html += f"""
                    <tr>
                        <td>{idx}</td>
                        <td class="file-path">{file_path}</td>
                    </tr>
"""
            html += """
                </tbody>
            </table>
"""
        
        if data['missing_lyrics_ta']:
            html += f"""
            <h3 style="color: #ed8936; margin: 20px 0 10px 0;">Missing lyrics_ta Only ({len(data['missing_lyrics_ta'])})</h3>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>File Path</th>
                    </tr>
                </thead>
                <tbody>
"""
            for idx, file_path in enumerate(data['missing_lyrics_ta'], 1):
                html += f"""
                    <tr>
                        <td>{idx}</td>
                        <td class="file-path">{file_path}</td>
                    </tr>
"""
            html += """
                </tbody>
            </table>
"""
        html += """
        </div>
"""
    else:
        html += """
        <div class="section empty">
            All files have both lyrics_en and lyrics_ta
        </div>
"""

    # Nav Order Not 50
    if data['nav_order_not_50']:
        html += f"""
        <div class="section">
            <h2>ℹ️ Files with nav_order ≠ 50 ({len(data['nav_order_not_50'])})</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>File Path</th>
                        <th>Nav Order</th>
                    </tr>
                </thead>
                <tbody>
"""
        for idx, item in enumerate(data['nav_order_not_50'], 1):
            html += f"""
                    <tr>
                        <td>{idx}</td>
                        <td class="file-path">{item['file']}</td>
                        <td><span class="badge info">{item['nav_order']}</span></td>
                    </tr>
"""
        html += """
                </tbody>
            </table>
        </div>
"""
    else:
        html += """
        <div class="section empty">
            All files have nav_order = 50 (or not specified)
        </div>
"""

    # Audio Validation Success
    if data['audio_results']['validated_ok']:
        html += f"""
        <div class="section">
            <h2>✅ Audio Validation Successful ({len(data['audio_results']['validated_ok'])})</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>File Path</th>
                        <th>Audio URL</th>
                        <th>Duration</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
"""
        for idx, item in enumerate(data['audio_results']['validated_ok'], 1):
            html += f"""
                    <tr>
                        <td>{idx}</td>
                        <td class="file-path">{item['file']}</td>
                        <td><a href="{item['url']}" class="url" target="_blank">{item['url']}</a></td>
                        <td>{item['duration']}s</td>
                        <td><span class="badge success">OK</span></td>
                    </tr>
"""
        html += """
                </tbody>
            </table>
        </div>
"""

    # Duration Mismatches
    if data['audio_results']['duration_mismatches']:
        html += f"""
        <div class="section">
            <h2>❌ Duration Mismatches ({len(data['audio_results']['duration_mismatches'])})</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>File Path</th>
                        <th>Audio URL</th>
                        <th>Expected</th>
                        <th>Actual</th>
                        <th>Difference</th>
                    </tr>
                </thead>
                <tbody>
"""
        for idx, item in enumerate(data['audio_results']['duration_mismatches'], 1):
            html += f"""
                    <tr>
                        <td>{idx}</td>
                        <td class="file-path">{item['file']}</td>
                        <td><a href="{item['url']}" class="url" target="_blank">{item['url']}</a></td>
                        <td>{item['expected_formatted']}</td>
                        <td>{item['actual']}s</td>
                        <td class="diff">{item['difference']}s</td>
                    </tr>
"""
        html += """
                </tbody>
            </table>
        </div>
"""

    # Download Errors
    if data['audio_results']['download_errors']:
        html += f"""
        <div class="section">
            <h2>❌ Download/Read Errors ({len(data['audio_results']['download_errors'])})</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>File Path</th>
                        <th>Audio URL</th>
                        <th>Error</th>
                    </tr>
                </thead>
                <tbody>
"""
        for idx, item in enumerate(data['audio_results']['download_errors'], 1):
            html += f"""
                    <tr>
                        <td>{idx}</td>
                        <td class="file-path">{item['file']}</td>
                        <td><a href="{item['url']}" class="url" target="_blank">{item['url']}</a></td>
                        <td><span class="badge error">{item['error']}</span></td>
                    </tr>
"""
        html += """
                </tbody>
            </table>
        </div>
"""

    html += """
        <div class="footer">
            <p>Bhakti Padal - Content Validation System</p>
        </div>
    </div>
</body>
</html>
"""
    return html


def main():
    """Main function"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Bhakti Padal Content Validation')
    parser.add_argument('--check-audio', action='store_true', 
                        help='Enable audio file download and duration validation (slower)')
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("🕉️  BHAKTI PADAL - CONTENT VALIDATION")
    print("="*60 + "\n")
    
    # Scan all markdown files with section id
    files_with_metadata = scan_markdown_files()
    
    if not files_with_metadata:
        print("\n❌ No files found with 'section' id. Exiting.\n")
        return
    
    # Run validations
    missing_youtube = report_missing_youtube_id(files_with_metadata)
    missing_audio = report_missing_audio_metadata(files_with_metadata)
    section_mismatches = check_section_folder_mismatch(files_with_metadata)
    missing_lyrics = check_missing_lyrics(files_with_metadata)
    nav_order_not_50 = check_nav_order_not_50(files_with_metadata)
    
    # Optional: Audio validation (can be slow)
    if args.check_audio:
        audio_results = download_and_verify_audio(files_with_metadata)
    else:
        print("\n⏭️  Skipping audio download validation (use --check-audio to enable)")
        audio_results = {
            'validated_ok': [],
            'download_errors': [],
            'duration_mismatches': []
        }
    
    print("\n📊 Generating HTML report...")
    
    # Prepare data for HTML report
    report_data = {
        'total_files': len(files_with_metadata),
        'missing_youtube': [str(f.relative_to(PROJECT_ROOT)) for f in sorted(missing_youtube)],
        'missing_youtube_count': len(missing_youtube),
        'missing_audio_both': [str(f.relative_to(PROJECT_ROOT)) for f in sorted(missing_audio['missing_both'])],
        'missing_audio_id': [str(f.relative_to(PROJECT_ROOT)) for f in sorted(missing_audio['missing_audio_id'])],
        'missing_audio_length': [str(f.relative_to(PROJECT_ROOT)) for f in sorted(missing_audio['missing_audio_length'])],
        'missing_audio_total': len(missing_audio['missing_both']) + len(missing_audio['missing_audio_id']) + len(missing_audio['missing_audio_length']),
        'section_folder_mismatch': [{'file': str(m['file'].relative_to(PROJECT_ROOT)), 'section': m['section'], 'folder': m['folder']} for m in sorted(section_mismatches, key=lambda x: x['file'])],
        'section_mismatch_count': len(section_mismatches),
        'missing_lyrics_both': [str(f.relative_to(PROJECT_ROOT)) for f in sorted(missing_lyrics['missing_both'])],
        'missing_lyrics_en': [str(f.relative_to(PROJECT_ROOT)) for f in sorted(missing_lyrics['missing_lyrics_en'])],
        'missing_lyrics_ta': [str(f.relative_to(PROJECT_ROOT)) for f in sorted(missing_lyrics['missing_lyrics_ta'])],
        'missing_lyrics_total': len(missing_lyrics['missing_both']) + len(missing_lyrics['missing_lyrics_en']) + len(missing_lyrics['missing_lyrics_ta']),
        'nav_order_not_50': [{'file': str(n['file'].relative_to(PROJECT_ROOT)), 'nav_order': n['nav_order']} for n in sorted(nav_order_not_50, key=lambda x: x['file'])],
        'nav_order_not_50_count': len(nav_order_not_50),
        'audio_results': {
            'validated_ok': audio_results['validated_ok'],
            'validated_ok_count': len(audio_results['validated_ok']),
            'duration_mismatches': audio_results['duration_mismatches'],
            'duration_mismatches_count': len(audio_results['duration_mismatches']),
            'download_errors': audio_results['download_errors'],
            'download_errors_count': len(audio_results['download_errors'])
        }
    }
    
    # Generate HTML report
    html_report = generate_html_report(report_data)
    
    # Create report directory if it doesn't exist
    REPORT_OUTPUT_DIR.mkdir(exist_ok=True)
    
    # Save report with timestamp in filename
    timestamp_filename = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = REPORT_OUTPUT_DIR / f"content_validation_report_{timestamp_filename}.html"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(html_report)
    
    print(f"\n{'='*60}")
    print(f"✅ Report generated: {report_path}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
