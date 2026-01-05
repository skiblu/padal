#!/usr/bin/env python3
"""
PNG Image Converter
Converts PNG images to optimized SVG or WebP format for faster webpage loading.
Supports base64 embedding for SVG and transparency preservation for WebP.

Usage:
    python3 image_converter.py --input /path/to/folder
    python3 image_converter.py --input /path/to/folder --output /path/to/output --format webp
    python3 image_converter.py --input /path/to/folder --quality 85 --scale 0.5 --format both
    python3 image_converter.py --input /path/to/folder --format webp --quality 90 --scale 0.8
"""

import os
import sys
import argparse
import base64
import io
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("❌ Pillow is required. Install with: pip3 install Pillow")
    sys.exit(1)


def get_png_files(input_folder):
    """Get all PNG files from the input folder."""
    input_path = Path(input_folder)
    if not input_path.exists():
        raise FileNotFoundError(f"Input folder not found: {input_folder}")
    
    png_files = list(input_path.glob("*.png")) + list(input_path.glob("*.PNG"))
    return sorted(png_files)

def optimize_png(img, quality=85, scale=1.0):
    """
    Optimize PNG image for smaller file size.
    
    Args:
        img: PIL Image object
        quality: Compression quality (0-100)
        scale: Scale factor (e.g., 0.5 for half size)
    
    Returns:
        PIL Image object (optimized)
    """
    # Scale image if needed
    if scale != 1.0:
        new_width = int(img.width * scale)
        new_height = int(img.height * scale)
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Preserve transparency - keep RGBA mode if present
    # Convert other modes to RGB or RGBA as appropriate
    if img.mode not in ('RGB', 'RGBA', 'L', 'LA'):
        if 'transparency' in img.info or img.mode == 'P':
            img = img.convert('RGBA')
        else:
            img = img.convert('RGB')
    
    # Reduce colors for smaller file size if quality is set lower
    if quality < 85 and img.mode == 'RGBA':
        # Convert to palette mode with adaptive colors
        colors = max(16, int(256 * (quality / 100)))
        img = img.quantize(colors=colors, method=2)  # method=2 is median cut
        img = img.convert('RGBA')
    
    return img

def png_to_base64(img, optimize_level=6):
    """
    Convert PIL Image to base64-encoded PNG data.
    
    Args:
        img: PIL Image object
        optimize_level: PNG optimization level (0-9, higher = smaller but slower)
    
    Returns:
        str: base64-encoded PNG data
    """
    buffer = io.BytesIO()
    img.save(buffer, format='PNG', optimize=True, compress_level=optimize_level)
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def convert_png_to_webp(png_path, output_path, quality=80):
    """
    Convert PNG to WebP with transparency support.
    
    Args:
        png_path: Path to input PNG file
        output_path: Path to output WebP file
        quality: Quality of conversion (0-100, default: 80)
    
    Returns:
        tuple: (success: bool, original_size: int, webp_size: int)
    """
    try:
        # Load PNG image
        img = Image.open(png_path)
        original_size = os.path.getsize(png_path)
        
        # Ensure transparency is preserved
        if img.mode not in ('RGBA', 'LA', 'P'):
            if 'transparency' in img.info:
                img = img.convert('RGBA')
            elif img.mode != 'RGB':
                img = img.convert('RGBA')
        
        # Save as WebP with transparency support
        img.save(output_path, 'WEBP', quality=quality, method=6)
        
        webp_size = os.path.getsize(output_path)
        
        return True, original_size, webp_size
        
    except Exception as e:
        print(f"   ⚠️  Error: {e}")
        return False, 0, 0

def create_svg_with_embedded_png(img, png_base64):
    """
    Create SVG content with embedded PNG as base64.
    
    Args:
        img: PIL Image object (for dimensions)
        png_base64: base64-encoded PNG data
    
    Returns:
        str: SVG content
    """
    width, height = img.size
    
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <image width="{width}" height="{height}" 
         xlink:href="data:image/png;base64,{png_base64}"/>
</svg>'''
    
    return svg_content

def convert_png_to_svg(png_path, output_path, quality=85, scale=1.0, optimize_level=6):
    """
    Convert PNG to SVG with embedded optimized PNG data.
    
    Args:
        png_path: Path to input PNG file
        output_path: Path to output SVG file
        quality: Quality of optimization (0-100)
        scale: Scale factor for resizing (0.1-1.0)
        optimize_level: PNG compression level (0-9)
    
    Returns:
        tuple: (success: bool, original_size: int, svg_size: int)
    """
    try:
        # Load PNG image
        img = Image.open(png_path)
        original_size = os.path.getsize(png_path)
        
        # Optimize image
        img_optimized = optimize_png(img, quality, scale)
        
        # Convert to base64
        png_base64 = png_to_base64(img_optimized, optimize_level)
        
        # Create SVG with embedded PNG
        svg_content = create_svg_with_embedded_png(img_optimized, png_base64)
        
        # Write SVG file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        
        svg_size = os.path.getsize(output_path)
        
        return True, original_size, svg_size
        
    except Exception as e:
        print(f"   ⚠️  Error: {e}")
        return False, 0, 0

def format_size(size_bytes):
    """Format file size in human-readable format."""
    for unit in ['B', 'KB', 'MB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} GB"

def check_dependencies():
    """Check if required dependencies are installed."""
    # PIL is already checked at import time
    pass

def main():
    parser = argparse.ArgumentParser(
        description="Convert PNG images to optimized SVG and/or WebP format for web use",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Convert all PNGs to SVG (default)
  python3 image_converter.py --input ./images

  # Convert to WebP format
  python3 image_converter.py --input ./images --format webp

  # Convert to both SVG and WebP
  python3 image_converter.py --input ./images --format both

  # Convert with custom output folder
  python3 image_converter.py --input ./images --output ./optimized

  # Convert with scaling for smaller files
  python3 image_converter.py --input ./images --scale 0.5 --format webp

  # High quality WebP conversion
  python3 image_converter.py --input ./images --quality 90 --format webp
        """
    )
    
    parser.add_argument('--input', '-i', required=True,
                        help='Input folder containing PNG files')
    parser.add_argument('--output', '-o', default=None,
                        help='Output folder for converted files (default: input_folder)')
    parser.add_argument('--format', '-f', choices=['svg', 'webp', 'both'], default='webp',
                        help='Output format (svg, webp, or both; default: svg)')
    parser.add_argument('--quality', '-q', type=int, default=85,
                        help='Optimization quality (0-100, default: 85)')
    parser.add_argument('--scale', '-s', type=float, default=1.0,
                        help='Scale factor for resizing (0.1-1.0, default: 1.0)')
    parser.add_argument('--optimize-level', type=int, default=9,
                        help='PNG/SVG compression level (0-9, default: 9)')
    parser.add_argument('--overwrite', action='store_true',
                        help='Overwrite existing output files')
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.quality < 0 or args.quality > 100:
        print("❌ Quality must be between 0 and 100")
        sys.exit(1)
    
    if args.scale < 0.1 or args.scale > 1.0:
        print("❌ Scale must be between 0.1 and 1.0")
        sys.exit(1)
    
    if args.optimize_level < 0 or args.optimize_level > 9:
        print("❌ Optimize level must be between 0 and 9")
        sys.exit(1)
    
    # Setup paths
    input_folder = Path(args.input).resolve()
    if args.output:
        output_folder = Path(args.output).resolve()
    else:
        output_folder = input_folder
    
    # Create output folder
    output_folder.mkdir(parents=True, exist_ok=True)
    
    # Get PNG files
    png_files = get_png_files(input_folder)
    
    if not png_files:
        print(f"❌ No PNG files found in {input_folder}")
        sys.exit(1)
    
    # Determine which formats to convert to
    convert_svg = args.format in ['svg', 'both']
    convert_webp = args.format in ['webp', 'both']
    format_str = f"SVG and WebP" if (convert_svg and convert_webp) else ("SVG" if convert_svg else "WebP")
    
    print(f"\n🔄 Converting {len(png_files)} PNG files to {format_str}")
    print(f"📁 Input:  {input_folder}")
    print(f"📁 Output: {output_folder}")
    print(f"⚙️  Quality: {args.quality}")
    print(f"📏 Scale: {args.scale}x")
    print(f"🗜️  Compression: {args.optimize_level}")
    print("-" * 60)
    
    # Convert files
    total_original_size = 0
    total_output_size = 0
    converted_count = 0
    skipped_count = 0
    failed_count = 0
    
    for png_file in png_files:
        print(f"\n📄 Processing {png_file.name}...")
        
        # SVG conversion
        if convert_svg:
            svg_file = output_folder / f"{png_file.stem}.svg"
            
            if svg_file.exists() and not args.overwrite:
                print(f"  ⏭️  Skipping SVG (exists)")
                skipped_count += 1
            else:
                print(f"  🔄 Converting to SVG...", end=' ')
                success, original_size, svg_size = convert_png_to_svg(
                    png_file, svg_file, args.quality, args.scale, args.optimize_level
                )
                
                if success:
                    total_original_size += original_size
                    total_output_size += svg_size
                    converted_count += 1
                    
                    reduction = ((original_size - svg_size) / original_size * 100) if original_size > 0 else 0
                    if svg_size < original_size:
                        print(f"✅ {format_size(original_size)} → {format_size(svg_size)} ({reduction:.1f}% smaller)")
                    else:
                        print(f"⚠️  {format_size(original_size)} → {format_size(svg_size)} ({-reduction:.1f}% larger)")
                else:
                    failed_count += 1
        
        # WebP conversion
        if convert_webp:
            webp_file = output_folder / f"{png_file.stem}.webp"
            
            if webp_file.exists() and not args.overwrite:
                print(f"  ⏭️  Skipping WebP (exists)")
                skipped_count += 1
            else:
                print(f"  🔄 Converting to WebP...", end=' ')
                success, original_size, webp_size = convert_png_to_webp(
                    png_file, webp_file, args.quality
                )
                
                if success:
                    if not convert_svg:  # Only add original size once
                        total_original_size += original_size
                    total_output_size += webp_size
                    converted_count += 1
                    
                    reduction = ((original_size - webp_size) / original_size * 100) if original_size > 0 else 0
                    if webp_size < original_size:
                        print(f"✅ {format_size(original_size)} → {format_size(webp_size)} ({reduction:.1f}% smaller)")
                    else:
                        print(f"⚠️  {format_size(original_size)} → {format_size(webp_size)} ({-reduction:.1f}% larger)")
                else:
                    failed_count += 1
    
    # Summary
    print("\n" + "-" * 60)
    print("\n📊 Conversion Summary:")
    print(f"   ✅ Converted: {converted_count}")
    print(f"   ⏭️  Skipped:   {skipped_count}")
    print(f"   ❌ Failed:    {failed_count}")
    
    if converted_count > 0:
        total_reduction = ((total_original_size - total_output_size) / total_original_size * 100) if total_original_size > 0 else 0
        print(f"\n💾 Total Size:")
        print(f"   Original: {format_size(total_original_size)}")
        print(f"   Output:   {format_size(total_output_size)}")
        print(f"   Saved:    {format_size(total_original_size - total_output_size)} ({total_reduction:.1f}%)")
    
    print(f"\n✨ Done! Files saved to: {output_folder}\n")

if __name__ == "__main__":
    main()
