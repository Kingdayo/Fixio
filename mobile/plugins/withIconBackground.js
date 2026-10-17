const {
  withAndroidColors,
  withAndroidColorsNight,
  withAppBuildGradle,
  withMainActivity,
  withMainApplication,
} = require('@expo/config-plugins');
const { assignColorValue } = require('@expo/config-plugins/build/android/Colors');

function withIconBackground(config) {
  const backgroundColor = config.android?.adaptiveIcon?.backgroundColor || '#0F172A';
  const packageName = config.android?.package || 'com.fixio.mobile';

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
      if (!config.modResults.contents.includes('IS_NEW_ARCHITECTURE_ENABLED')) {
        config.modResults.contents = config.modResults.contents.replace(
          /defaultConfig\s*\{/,
          `defaultConfig {\n        buildConfigField "boolean", "IS_NEW_ARCHITECTURE_ENABLED", "\${findProperty('newArchEnabled') ?: 'true'}"`
        );
      }
    }
    return config;
  });

  config = withMainActivity(config, (config) => {
    if (config.modResults.language === 'kt' || config.modResults.language === 'kotlin') {
      let contents = config.modResults.contents;
      if (!contents.includes(`import ${packageName}.R`)) {
        contents = contents.replace(`package ${packageName}`, `package ${packageName}\n\nimport ${packageName}.R`);
      }
      if (!contents.includes(`import ${packageName}.BuildConfig`)) {
        contents = contents.replace(`package ${packageName}`, `package ${packageName}\nimport ${packageName}.BuildConfig`);
      }
      config.modResults.contents = contents;
    }
    return config;
  });

  config = withMainApplication(config, (config) => {
    if (config.modResults.language === 'kt' || config.modResults.language === 'kotlin') {
      let contents = config.modResults.contents;
      if (!contents.includes(`import ${packageName}.BuildConfig`)) {
        contents = contents.replace(`package ${packageName}`, `package ${packageName}\n\nimport ${packageName}.BuildConfig`);
      }
      config.modResults.contents = contents;
    }
    return config;
  });

  return config;
}

module.exports = withIconBackground;
