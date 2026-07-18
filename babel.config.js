const babelConfig = {
  presets: ['expo/client'],
  plugins: [
    [
      'react-native-reanimated',
      {
        runtime: 'native',
      },
    ],
  ],
};

module.exports = babelConfig;
