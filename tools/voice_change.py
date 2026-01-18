"""
Voice Modification Script (WAV / MP3 / M4A → MP3)

DESCRIPTION
-----------
This script modifies human voice characteristics in audio files by applying
pitch shifting and tempo (speed) changes. It supports both single-file and
batch (folder) processing.

The script accepts .wav, .mp3, and .m4a input files and always produces .mp3 output.
All processed files are saved into an `output/` folder created in the same
directory as the input file or folder.

FEATURES
--------
- Supports input as a single audio file or a directory containing audio files
- Accepts .wav, .mp3, and .m4a formats
- Always outputs .mp3 files
- Batch processing for multiple files
- Automatically creates output directory
- Preserves original filenames
- Skips unsupported file types safely

VOICE MODIFICATIONS
-------------------
- Pitch shift (default: +3 semitones)
- Tempo change (default: 0.95x speed)

These parameters can be adjusted in the script to customize the voice effect.

INPUT
-----
- Path to a .wav, .mp3, or .m4a file
  OR
- Path to a directory containing multiple supported audio files

OUTPUT
------
- Modified audio files in MP3 format
- Output location:
    <input_path>/output/<original_filename>.mp3

USAGE
-----
Single file:
    python voice_modify.py input.wav

Folder:
    python voice_modify.py ./audio_files

REQUIREMENTS
------------
Python: 3.8+

Python Libraries:
- librosa
- soundfile
- numpy

System Dependencies (required for MP3 / M4A support):
- ffmpeg

INSTALLATION
------------
python3 -m pip install --upgrade pip
python3 -m pip install librosa soundfile numpy

macOS:
    brew install ffmpeg

Ubuntu/Debian:
    sudo apt install ffmpeg

NOTES
-----
- This script performs basic voice modification and is not a full
  AI-based voice conversion system.
- Output quality depends on the original audio quality.
- Legal and ethical use of voice modification is the responsibility
  of the user.
"""

import librosa
import soundfile as sf
import numpy as np
import os
import sys

# Add .m4a support
SUPPORTED_EXTENSIONS = (".wav", ".mp3", ".m4a")


def process_file(input_path, output_dir):
    filename = os.path.basename(input_path)
    name, _ = os.path.splitext(filename)
    output_path = os.path.join(output_dir, name + ".mp3")

    print(f"Processing: {input_path}")

    # Load audio
    y, sr = librosa.load(input_path, sr=None, mono=True)

    # ---- VOICE MODIFICATION ----
    y = librosa.effects.pitch_shift(y=y, sr=sr, n_steps=3)
    y = librosa.effects.time_stretch(y=y, rate=0.95)
    # ----------------------------

    # Write MP3
    sf.write(
        output_path,
        y,
        sr,
        format="MP3",
        subtype="MPEG_LAYER_III"
    )

    print(f"Saved -> {output_path}")


def process_input(input_path):
    input_path = os.path.abspath(input_path)

    if not os.path.exists(input_path):
        print("❌ Input path does not exist")
        return

    # Determine base directory
    base_dir = input_path if os.path.isdir(input_path) else os.path.dirname(input_path)
    output_dir = os.path.join(base_dir, "output")
    os.makedirs(output_dir, exist_ok=True)

    if os.path.isfile(input_path):
        if input_path.lower().endswith(SUPPORTED_EXTENSIONS):
            process_file(input_path, output_dir)
        else:
            print("❌ Unsupported file type")

    elif os.path.isdir(input_path):
        for file in os.listdir(input_path):
            full_path = os.path.join(input_path, file)
            if os.path.isfile(full_path) and file.lower().endswith(SUPPORTED_EXTENSIONS):
                process_file(full_path, output_dir)

    print("✅ Processing complete")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage:")
        print("  python voice_modify.py <audio_file | folder>")
        sys.exit(1)

    process_input(sys.argv[1])
