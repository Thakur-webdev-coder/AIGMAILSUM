const path = require('path');

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: path.resolve(__dirname, '.env'),
        allowlist: [
          'SUPABASE_URL',
          'SUPABASE_PUBLISHABLE_KEY',
          'GOOGLE_WEB_CLIENT_ID',
        ],
        allowUndefined: true,
      },
    ],
  ],
};
