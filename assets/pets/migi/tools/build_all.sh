#!/bin/sh
# Bangun ulang semua aset Migi (±20 dtk)
cd "$(dirname "$0")"
python3 build.py && python3 props.py && python3 manifest.py && python3 previews.py && python3 refcompare.py
