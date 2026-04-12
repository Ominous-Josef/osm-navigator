const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin for osm-navigator.
 * Handles native configuration for Android and iOS.
 */
function withOSMNavigatorPlugin(config) {
  return withPlugins(config, [
    withAndroidConfig,
  ]);
}

/**
 * Android specific configuration.
 */
const withAndroidConfig = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const buildGradlePath = path.join(config.modRequest.projectRoot, 'android', 'build.gradle');
      let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

      // Add MapLibre repository if not present
      if (!buildGradle.includes('mavenCentral()')) {
        // This is a basic check, usually mavenCentral is already there
      }

      fs.writeFileSync(buildGradlePath, buildGradle);
      return config;
    },
  ]);
};

module.exports = withOSMNavigatorPlugin;
