#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <source_data_path> <source_images_path>" >&2
  exit 1
fi

source_data_path="$1"
source_images_path="$2"
target_data_path="src/data"
target_images_path="src/assets/images"
target_skus_path="$target_data_path/skus"
target_works_path="$target_data_path/works"

if [[ ! -d "$source_data_path" ]]; then
  echo "Error: source data path not found: $source_data_path" >&2
  exit 1
fi

if [[ ! -d "$source_images_path" ]]; then
  echo "Error: source images path not found: $source_images_path" >&2
  exit 1
fi

mkdir -p "$target_skus_path" "$target_works_path" "$target_images_path"

rm -rf "$target_skus_path"/*
rm -rf "$target_works_path"/*
rm -rf "$target_images_path"/*

cp -R "$source_data_path"/skus/. "$target_skus_path"/
cp -R "$source_data_path"/works/. "$target_works_path"/
cp -R "$source_images_path"/. "$target_images_path"/

echo "Data sync completed."
