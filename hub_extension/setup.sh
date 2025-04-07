#!/bin/bash

# Create necessary directories
mkdir -p lib icons

# Download lightning-fs
echo "Downloading lightning-fs..."
curl -L -o lib/lightning-fs.min.js https://unpkg.com/@isomorphic-git/lightning-fs@4.2.0/dist/lightning-fs.min.js

# Download isomorphic-git
echo "Downloading isomorphic-git..."
curl -L -o lib/isomorphic-git.min.js https://unpkg.com/isomorphic-git@1.24.0/dist/bundle.umd.min.js

# Download Zapp SDK
echo "Downloading Zapp SDK..."
curl -L -o lib/zapp.min.js https://cdn.jsdelivr.net/npm/@zapp/sdk@latest/dist/zapp.min.js

# Create placeholder icons
echo "Creating placeholder icons..."
convert -size 16x16 xc:blue -fill white -draw 'text 0,12 "F"' icons/icon16.png
convert -size 48x48 xc:blue -fill white -draw 'text 0,36 "F"' icons/icon48.png
convert -size 128x128 xc:blue -fill white -draw 'text 0,96 "F"' icons/icon128.png

echo "Setup complete!" 