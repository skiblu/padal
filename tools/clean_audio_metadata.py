#!/usr/bin/env python3
"""
Clean audio metadata for MP3, FLAC, and OGG files in a folder.
Sets default metadata to "Bhakti Padal" and adds image.jpeg as album art.

Requirements:
    pip install mutagen

Usage:
    python3 clean_audio_metadata.py [folder_path]

    If folder_path is not provided, uses current directory.
"""

import os
import sys
from pathlib import Path

# Safely import mutagen dependencies
try:
    from mutagen.easyid3 import EasyID3
    from mutagen.id3 import ID3, APIC, ID3NoHeaderError
    from mutagen.mp3 import MP3
    from mutagen.flac import FLAC, Picture
    from mutagen.oggvorbis import OggVorbis
except ImportError:
    print("Error: The 'mutagen' library is not installed.")
    print("Please install it by running: pip install mutagen")
    sys.exit(1)

# Default metadata values
DEFAULT_ALBUM = "Bhakti Padal"
DEFAULT_ARTIST = "Bhakti Padal"
DEFAULT_ALBUM_ARTIST = "Bhakti Padal"
DEFAULT_GENRE = "Devotional"
DEFAULT_TITLE = "Bhakti Padal"

# Image filename
IMAGE_FILENAME = "image.jpeg"


def find_image(folder_path):
    """Find image.jpeg in the given folder or fall back to default path."""
    image_path = Path(folder_path) / IMAGE_FILENAME
    if image_path.exists():
        return str(image_path)

    fallback_path = Path("/Users/san/DEV/padal/images/logo.png")
    if fallback_path.exists():
        return str(fallback_path)
    return None


def load_image_data(image_path):
    """Load image data from file."""
    try:
        with open(image_path, 'rb') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading image: {e}")
        return None


def clean_mp3_metadata(file_path, image_data):
    """Clean MP3 metadata and add album art."""
    try:
        audio = MP3(file_path)
        try:
            audio.tags
        except AttributeError:
            audio.add_tags()
            audio.save()

        try:
            easy_tags = EasyID3(file_path)
        except ID3NoHeaderError:
            audio = MP3(file_path)
            audio.add_tags()
            audio.save()
            easy_tags = EasyID3(file_path)

        easy_tags['album'] = DEFAULT_ALBUM
        easy_tags['artist'] = DEFAULT_ARTIST
        easy_tags['albumartist'] = DEFAULT_ALBUM_ARTIST
        easy_tags['genre'] = DEFAULT_GENRE
        easy_tags['title'] = DEFAULT_TITLE
        easy_tags.save()

        if image_data:
            audio = ID3(file_path)
            audio.delall("APIC")
            audio.add(APIC(
                encoding=3,  # UTF-8
                mime='image/jpeg',
                type=3,  # Cover (front)
                desc='Cover',
                data=image_data
            ))
            audio.save()

        return True
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False


def clean_flac_metadata(file_path, image_data):
    """Clean FLAC metadata and add album art."""
    try:
        audio = FLAC(file_path)
        audio['album'] = DEFAULT_ALBUM
        audio['artist'] = DEFAULT_ARTIST
        audio['albumartist'] = DEFAULT_ALBUM_ARTIST
        audio['genre'] = DEFAULT_GENRE
        audio['title'] = DEFAULT_TITLE

        if image_data:
            audio.clear_pictures()
            picture = Picture()
            picture.type = 3  # Cover (front)
            picture.mime = "image/jpeg"
            picture.desc = "Cover"
            picture.data = image_data
            audio.add_picture(picture)

        audio.save()
        return True
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False


def clean_ogg_metadata(file_path, image_data):
    """Clean OGG Vorbis metadata."""
    try:
        audio = OggVorbis(file_path)
        audio['album'] = DEFAULT_ALBUM
        audio['artist'] = DEFAULT_ARTIST
        audio['albumartist'] = DEFAULT_ALBUM_ARTIST
        audio['genre'] = DEFAULT_GENRE
        audio['title'] = DEFAULT_TITLE
        audio.save()
        return True
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False


def clean_audio_files(folder_path):
    """Process all audio files in the given folder."""
    folder = Path(folder_path)

    if not folder.exists():
        print(f"Error: Folder '{folder_path}' does not exist")
        return

    image_path = find_image(folder)
    if not image_path:
        print(f"Warning: No valid cover image found. Skipping album art.")
        image_data = None
    else:
        print(f"Found image: {image_path}")
        image_data = load_image_data(image_path)
        if image_data:
            print(f"Successfully loaded image ({len(image_data)} bytes)")

    audio_extensions = {'.mp3', '.flac', '.ogg'}
    audio_files = []
    for ext in audio_extensions:
        audio_files.extend(folder.glob(f'**/*{ext}'))

    if not audio_files:
        print(f"No audio files found in {folder_path}")
        return

    print(f"\nFound {len(audio_files)} audio file(s)")
    print(f"Processing with defaults:")
    print(f"  Album: {DEFAULT_ALBUM}")
    print(f"  Artist: {DEFAULT_ARTIST}")
    print(f"  Album Artist: {DEFAULT_ALBUM_ARTIST}")
    print(f"  Genre: {DEFAULT_GENRE}")
    print(f"  Title: {DEFAULT_TITLE}\n")

    success_count = 0
    for audio_file in audio_files:
        print(f"Processing: {audio_file.name}...", end=' ')

        ext = audio_file.suffix.lower()
        if ext == '.mp3':
            success = clean_mp3_metadata(str(audio_file), image_data)
        elif ext == '.flac':
            success = clean_flac_metadata(str(audio_file), image_data)
        elif ext == '.ogg':
            success = clean_ogg_metadata(str(audio_file), image_data)
        else:
            print("Unsupported format")
            continue

        if success:
            print("✓")
            success_count += 1
        else:
            print("✗")

    print(f"\nCompleted: {success_count}/{len(audio_files)} files processed successfully")


def main():
    folder_path = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()

    print("Audio Metadata Cleaner")
    print("=" * 50)
    print(f"Target folder: {folder_path}\n")

    clean_audio_files(folder_path)


if __name__ == "__main__":
    main()