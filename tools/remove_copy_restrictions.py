#!/usr/bin/env python3
"""
Remove Copy Restrictions from HTML Pages

This script removes client-side copy protection mechanisms from HTML pages,
including:
- Right-click blocking
- Copy/paste blocking
- Text selection prevention
- Context menu disabling

Usage:
    python remove_copy_restrictions.py input.html output.html
    python remove_copy_restrictions.py --url https://example.com output.html
"""

import re
import sys
import argparse
from pathlib import Path

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


def remove_copy_restrictions(html_content):
    """
    Remove various copy protection mechanisms from HTML content.
    
    Args:
        html_content (str): The HTML content to process
        
    Returns:
        str: Cleaned HTML content
    """
    
    # Remove inline event handlers that block copying
    event_handlers = [
        r'oncopy\s*=\s*["\'][^"\']*["\']',
        r'oncut\s*=\s*["\'][^"\']*["\']',
        r'onpaste\s*=\s*["\'][^"\']*["\']',
        r'oncontextmenu\s*=\s*["\'][^"\']*["\']',
        r'onselectstart\s*=\s*["\'][^"\']*["\']',
        r'ondragstart\s*=\s*["\'][^"\']*["\']',
        r'onmousedown\s*=\s*["\'][^"\']*["\']',
    ]
    
    for handler in event_handlers:
        html_content = re.sub(handler, '', html_content, flags=re.IGNORECASE)
    
    # Remove CSS that prevents text selection
    css_restrictions = [
        r'user-select\s*:\s*none\s*;?',
        r'-webkit-user-select\s*:\s*none\s*;?',
        r'-moz-user-select\s*:\s*none\s*;?',
        r'-ms-user-select\s*:\s*none\s*;?',
        r'pointer-events\s*:\s*none\s*;?',
    ]
    
    for restriction in css_restrictions:
        html_content = re.sub(restriction, '', html_content, flags=re.IGNORECASE)
    
    # Remove JavaScript that adds copy protection event listeners
    js_patterns = [
        r'document\.addEventListener\s*\(\s*["\']copy["\']\s*,.*?\)\s*;?',
        r'document\.addEventListener\s*\(\s*["\']cut["\']\s*,.*?\)\s*;?',
        r'document\.addEventListener\s*\(\s*["\']contextmenu["\']\s*,.*?\)\s*;?',
        r'document\.addEventListener\s*\(\s*["\']selectstart["\']\s*,.*?\)\s*;?',
        r'window\.addEventListener\s*\(\s*["\']copy["\']\s*,.*?\)\s*;?',
        r'window\.addEventListener\s*\(\s*["\']contextmenu["\']\s*,.*?\)\s*;?',
        r'\.on\s*\(\s*["\']copy["\']\s*,.*?\)',
        r'\.on\s*\(\s*["\']contextmenu["\']\s*,.*?\)',
    ]
    
    for pattern in js_patterns:
        html_content = re.sub(pattern, '', html_content, flags=re.IGNORECASE | re.DOTALL)
    
    # Remove common copy protection library calls
    html_content = re.sub(
        r'<script[^>]*>.*?(?:disableSelection|DisableCopy|preventCopy|noCopy).*?</script>',
        '',
        html_content,
        flags=re.IGNORECASE | re.DOTALL
    )
    
    # Add CSS to ensure text is selectable
    enable_selection_css = """
<style id="enable-text-selection">
    * {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        pointer-events: auto !important;
    }
</style>
"""
    
    # Insert before </head> or at the beginning if no head tag
    if '</head>' in html_content.lower():
        html_content = re.sub(
            r'</head>',
            enable_selection_css + '</head>',
            html_content,
            count=1,
            flags=re.IGNORECASE
        )
    else:
        html_content = enable_selection_css + html_content
    
    # Add JavaScript to override any remaining restrictions
    enable_selection_js = """
<script id="enable-copy-script">
(function() {
    'use strict';
    
    // Remove all event listeners that might block copying
    const events = ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'dragstart', 'mousedown'];
    
    events.forEach(eventName => {
        document.addEventListener(eventName, function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
        }, true);
    });
    
    // Override document methods
    document.oncopy = null;
    document.oncut = null;
    document.onpaste = null;
    document.oncontextmenu = null;
    document.onselectstart = null;
    document.ondragstart = null;
    
    // Enable text selection on all elements
    document.addEventListener('DOMContentLoaded', function() {
        const style = document.createElement('style');
        style.textContent = `
            * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
        `;
        document.head.appendChild(style);
    });
})();
</script>
"""
    
    # Insert before </body> or at the end if no body tag
    if '</body>' in html_content.lower():
        html_content = re.sub(
            r'</body>',
            enable_selection_js + '</body>',
            html_content,
            count=1,
            flags=re.IGNORECASE
        )
    else:
        html_content = html_content + enable_selection_js
    
    return html_content


def process_file(input_path, output_path):
    """Process an HTML file and remove copy restrictions."""
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        cleaned_content = remove_copy_restrictions(html_content)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(cleaned_content)
        
        print(f"✓ Successfully processed: {input_path}")
        print(f"✓ Output saved to: {output_path}")
        return True
        
    except Exception as e:
        print(f"✗ Error processing file: {e}", file=sys.stderr)
        return False


def process_url(url, output_path):
    """Download HTML from URL and remove copy restrictions."""
    if not REQUESTS_AVAILABLE:
        print("✗ Error: 'requests' library not found. Install it with: pip install requests", file=sys.stderr)
        return False
    
    try:
        print(f"Downloading from: {url}")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        html_content = response.text
        cleaned_content = remove_copy_restrictions(html_content)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(cleaned_content)
        
        print(f"✓ Successfully downloaded and processed: {url}")
        print(f"✓ Output saved to: {output_path}")
        return True
        
    except requests.RequestException as e:
        print(f"✗ Error downloading URL: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"✗ Error processing content: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Remove copy restrictions from HTML pages',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process a local HTML file
  python remove_copy_restrictions.py input.html output.html
  
  # Download and process a URL
  python remove_copy_restrictions.py --url https://example.com output.html
  
  # Process with custom encoding
  python remove_copy_restrictions.py input.html output.html
        """
    )
    
    parser.add_argument(
        'input',
        nargs='?',
        help='Input HTML file path'
    )
    
    parser.add_argument(
        'output',
        help='Output HTML file path'
    )
    
    parser.add_argument(
        '--url',
        help='Download HTML from URL instead of reading from file'
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.url:
        if not args.output:
            parser.error("output file path is required")
        success = process_url(args.url, args.output)
    else:
        if not args.input or not args.output:
            parser.error("both input and output file paths are required")
        if not Path(args.input).exists():
            print(f"✗ Error: Input file not found: {args.input}", file=sys.stderr)
            sys.exit(1)
        success = process_file(args.input, args.output)
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
