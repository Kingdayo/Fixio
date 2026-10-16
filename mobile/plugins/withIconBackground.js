const { withAndroidColors, withAndroidColorsNight, withAppBuildGradle } = require('@expo/config-plugins');
const { assignColorValue } = require('@expo/config-plugins/build/android/Colors');

function withIconBackground(config) {
  const backgroundColor = config.android?.adaptiveIcon?.backgroundColor || '#0F172A';

  config = withAndroidColors(config, (config) => {
    config.modResults = assignColorValue(config.modResults, {
      name: 'iconBackground',
      value: backgroundColor,
    });
    return config;
  });

  config = withAndroidColorsNight(config, (config) => {
    config.modResults = assignColorValue(config.modResults, {
      name: 'iconBackground',
      value: backgroundColor,
    });
    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      if (!config.modResults.contents.includes('buildConfig true') && !config.modResults.contents.includes('buildConfig = true')) {
        config.modResults.contents = config.modResults.contents.replace(
          /android\s*\{/,
          `android {\n    buildFeatures {\n        buildConfig true\n    }`
        );
      }
    }
    return config;
  });

  return config;
}

module.exports = withIconBackground;
