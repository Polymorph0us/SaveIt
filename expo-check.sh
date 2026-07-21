#!/bin/bash

echo "Checking Expo SDK version compatibility..."
echo "Node version: $(node --version)"
echo "Expo CLI version: $(npx expo --version)"

echo "\nChecking that all files are at HEAD versions..."
cat babel.config.js | grep -c "'react-native-reanimated'" > /dev/null && echo "✓ babel.config.js has reanimated plugin"

cat package.json | grep -q '"react-native": "0.85.3"' && echo "✓ package.json has exact react-native version" || echo "✗ package.json has wrong react-native version"

echo "\nFiles currently at versions:"
git log --oneline -2
