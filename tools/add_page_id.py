#!/usr/bin/env python3
"""Add a 15-character alphanumeric `page_id` to Markdown files' top YAML front-matter.

Usage:
    python3 tools/add_page_id.py /path/to/dir --dry-run

Behavior:
- Walks the given directory recursively and processes files ending with .md
- If file has YAML front-matter (--- ... ---) and already contains `page_id:` it is skipped
- If front-matter exists but lacks `page_id:` the line is inserted at the top of the front-matter
- If no front-matter exists, a new front-matter block is prepended with `page_id:`
"""
from __future__ import annotations

import argparse
import os
import re
import secrets
import string
from typing import Tuple


def gen_id() -> str:
    # Generate a 15-character alphanumeric ID (letters + digits)
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(15))


FRONT_MATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def process_text(text: str) -> Tuple[bool, str]:
    """Return (changed, new_text)."""
    m = FRONT_MATTER_RE.match(text)
    if m:
        fm = m.group(1)
        # if page_id already present, skip
        if re.search(r"^\s*page_id\s*:\s*", fm, re.MULTILINE):
            return False, text
        new_fm = f"page_id: {gen_id()}\n" + fm
        new_text = "---\n" + new_fm + "\n---\n" + text[m.end():]
        return True, new_text
    else:
        # No front-matter: prepend one
        new_text = f"---\npage_id: {gen_id()}\n---\n\n" + text
        return True, new_text


def process_file(path: str, dry_run: bool = True) -> Tuple[bool, str]:
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    changed, new_text = process_text(text)
    if changed and not dry_run:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_text)
    return changed, path


def walk_and_process(root: str, dry_run: bool = True) -> Tuple[int, int]:
    modified = 0
    skipped = 0
    for dirpath, dirnames, filenames in os.walk(root):
        for fn in filenames:
            if not fn.lower().endswith(".md"):
                continue
            path = os.path.join(dirpath, fn)
            try:
                changed, _ = process_file(path, dry_run=dry_run)
                if changed:
                    modified += 1
                    print(("DRY: would modify " if dry_run else "Modified ") + path)
                else:
                    skipped += 1
            except Exception as e:
                print(f"Error processing {path}: {e}")
    return modified, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description="Add 15-digit page_id to markdown files")
    parser.add_argument("root", help="Directory to walk (recursive)")
    parser.add_argument("--dry-run", action="store_true", help="Do not write changes")
    args = parser.parse_args()

    if not os.path.isdir(args.root):
        print(f"Not a directory: {args.root}")
        raise SystemExit(2)

    modified, skipped = walk_and_process(args.root, dry_run=args.dry_run)
    print(f"\nSummary: modified={modified}, skipped (already had page_id)={skipped}")


if __name__ == "__main__":
    main()
