// Quick verification that babel config is correct
const fs = require('fs');
const content = fs.readFileSync('babel.config.js', 'utf8');

if (content.includes("'react-native-reanimated'") && content.includes("runtime: 'native'")) {
  console.log("SUCCESS: babel.config.js has the react-native-reanimated plugin");
  console.log("The plugin is correctly configured with runtime: 'native'");
} else {
  console.error("ERROR: babel.config.js is missing the react-native-reanimated plugin");
  console.error("This is required for React Native animations in this SDK 56 project.");
  process.exit(1);
}
