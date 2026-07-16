---
name: dependency-version-check
description: Use before adding or changing any package.json dependency that has native code (react-native-*, @react-native-*, expo-*). Prevents Expo Go "incompatible" and "native module is null" errors.
---
1. Identify the current Expo SDK from package.json ("expo": "~X.Y.Z").
2. Fetch: https://raw.githubusercontent.com/expo/expo/sdk-X/packages/expo/bundledNativeModules.json
3. Use exactly the version listed there for that package. If it's not
   listed, it has no native code and npm's latest is fine.
4. Never install a native-module package by guessing or by npm's "latest" tag.
