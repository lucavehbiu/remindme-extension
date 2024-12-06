#!/bin/bash

# Create a clean directory for packaging
rm -rf ./package
mkdir -p ./package

# Copy only the necessary files
cp manifest.json ./package/
cp popup.html ./package/
cp background.js ./package/
cp contentScript.js ./package/
cp popup.js ./package/
cp -r icons ./package/
cp styles.css ./package/
cp flatpickr.min.css ./package/
cp flatpickr.min.js ./package/
cp material_blue.css ./package/

# Copy store assets
cp -r store-assets ./package/

# Create the ZIP file
cd package
zip -r ../remind-me-extension.zip ./*
cd ..

echo "✨ Package created: remind-me-extension.zip"