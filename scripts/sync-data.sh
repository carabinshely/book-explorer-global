#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <script_path> <data_path> <images_path>" >&2
  exit 1
fi

script_path="$1"
data_path="$2"
images_path="$3"

if [[ ! -f "$script_path" ]]; then
  echo "Error: script_path not found: $script_path" >&2
  exit 1
fi

if [[ -x "$script_path" ]]; then
  if ! "$script_path" "$data_path" "$images_path"; then
    echo "Data sync failed. Please check reports in the generator repo." >&2
    exit 1
  fi
else
  if ! bash "$script_path" "$data_path" "$images_path"; then
    echo "Data sync failed. Please check reports in the generator repo." >&2
    exit 1
  fi
fi

echo "Data sync completed."
