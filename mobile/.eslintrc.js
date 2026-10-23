module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-native/all",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  plugins: [
    "react",
    "react-native",
    "react-hooks",
    "@typescript-eslint",
    "prettier",
  ],
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 2020,
    sourceType: "module",
  },
  rules: {
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
        singleQuote: true,
        trailingComma: "all",
        semi: true,
        printWidth: 100,
        tabWidth: 2,
      },
    ],
    "react/react-in-jsx-scope": "off", // RN não precisa importar React
    "react/prop-types": "off", // se usa TS
    "@typescript-eslint/no-unused-vars": ["warn"],
  },
  settings: {
    react: { version: "detect" },
  },
};
