const { expo: baseConfig } = require('./app.json');

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  return {
    ...baseConfig,
    ...config,
    android: {
      ...baseConfig.android,
      ...config.android,
      config: googleMapsApiKey
        ? {
            ...(baseConfig.android?.config ?? {}),
            ...(config.android?.config ?? {}),
            googleMaps: {
              ...((baseConfig.android?.config ?? {}).googleMaps ?? {}),
              ...((config.android?.config ?? {}).googleMaps ?? {}),
              apiKey: googleMapsApiKey,
            },
          }
        : {
            ...(baseConfig.android?.config ?? {}),
            ...(config.android?.config ?? {}),
          },
    },
    ios: {
      ...baseConfig.ios,
      ...config.ios,
      config: googleMapsApiKey
        ? {
            ...(baseConfig.ios?.config ?? {}),
            ...(config.ios?.config ?? {}),
            googleMapsApiKey,
          }
        : {
            ...(baseConfig.ios?.config ?? {}),
            ...(config.ios?.config ?? {}),
          },
    },
    extra: {
      ...baseConfig.extra,
      ...config.extra,
      googleMapsConfigured: Boolean(googleMapsApiKey),
    },
  };
};
