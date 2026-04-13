const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve modules and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Robust monorepo resolution for problematic packages
config.resolver.extraNodeModules = {
  "@osm-navigator/core": path.resolve(workspaceRoot, "packages/core/src"),
  "@osm-navigator/native-map": path.resolve(workspaceRoot, "packages/native-map/src"),
  "@osm-navigator/ui-navigation": path.resolve(workspaceRoot, "packages/ui-navigation/src"),
};

// 4. Force Metro to resolve hoisted packages correctly
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
