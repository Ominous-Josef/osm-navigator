// Expo SDK 52+ auto-detects monorepo workspaces; no manual watchFolders/resolver overrides needed.
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
