// app.plugin.js
// Expo config plugin for osm-navigator native module integration

/**
 * @type {import('@expo/config-plugins').ConfigPlugin}
 */
const { withDangerousMod } = require('@expo/config-plugins');

module.exports = function withOSMNavigatorPlugin(config) {
  // TODO(agent): Add native module linking for MapLibre, permissions, and custom props
  return withDangerousMod(config, ["android", async (config) => {
    // Example: modify AndroidManifest.xml or build.gradle here
    return config;
  }]);
};
