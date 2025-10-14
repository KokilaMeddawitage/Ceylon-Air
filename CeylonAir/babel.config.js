module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      ['babel-plugin-dotenv', {
        path: '.env',
        safe: false,
        allowUndefined: true
      }]
    ],
  };
};
