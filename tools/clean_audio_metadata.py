#!/usr/bin/env python3
"""
Clean audio metadata for MP3 files in a folder.
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
from mutagen.easyid3 import EasyID3
from mutagen.id3 import ID3, APIC, ID3NoHeaderError
from mutagen.mp3 import MP3

# Default metadata values
DEFAULT_ALBUM = "Bhakti Padal"
DEFAULT_ARTIST = "Bhakti Padal"
DEFAULT_ALBUM_ARTIST = "Bhakti Padal"
DEFAULT_GENRE = "Devotional"
DEFAULT_TITLE = "Bhakti Padal"

# Image filename
IMAGE_FILENAME = "image.jpeg"


def find_image(folder_path):
    """Find image.jpeg in the given folder"""
    image_path = Path(folder_path) / IMAGE_FILENAME
    if image_path.exists():
        return str(image_path)
    return None


def load_image_data(image_path):
    """Load image data from file"""
    try:
        with open(image_path, 'rb') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading image: {e}")
        return None


def clean_mp3_metadata(file_path, image_data):
    """Clean MP3 metadata and add album art"""
    try:
        # Load MP3 file and ensure it has ID3 tags
        audio = MP3(file_path)
        
        # Add tags if they don't exist
        try:
            audio.tags
        except:
            audio.add_tags()
            audio.save()
        
        # Use EasyID3 for basic metadata
        try:
            easy_tags = EasyID3(file_path)
        except ID3NoHeaderError:
            # If EasyID3 fails, create tags and try again
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
        
        # Add album art using full ID3
        if image_data:
            audio = ID3(file_path)
            # Remove existing pictures
            audio.delall("APIC")
            # Add new picture
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


def clean_audio_files(folder_path):
    """Process all audio files in the given folder"""
    folder = Path(folder_path)
    
    if not folder.exists():
        print(f"Error: Folder '{folder_path}' does not exist")
        return
    
    # Find image.jpeg
    image_path = find_image(folder)
    if not image_path:
        print(f"Warning: {IMAGE_FILENAME} not found in {folder_path}. Skipping album art.")
        image_data = None
    else:
        print(f"Found image: {image_path}")
        image_data = load_image_data(image_path)
        if image_data:
            print(f"Successfully loaded image ({len(image_data)} bytes)")
    
    # Supported extensions
    audio_extensions = {'.mp3', '.flac', '.ogg'}
    
    # Find all audio files
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
    print(f"  Title: {DEFAULT_TITLE}")
    print()
    
    # Process each file
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
    # Get folder path from command line or use current directory
    if len(sys.argv) > 1:
        folder_path = sys.argv[1]
    else:
        folder_path = os.getcwd()
    
    print(f"Audio Metadata Cleaner")
    print(f"=" * 50)
    print(f"Target folder: {folder_path}\n")
    
    clean_audio_files(folder_path)


if __name__ == "__main__":
    main()
