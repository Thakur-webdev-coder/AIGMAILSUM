module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: { '@typescript-eslint/no-explicit-any': 'error' },
    },
  ],
};
