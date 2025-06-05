module.exports = {
  extends: [
    "next/core-web-vitals",
    "next/typescript",
    "plugin:jest/recommended"
  ],
  plugins: [
    "jest"
  ],
  env: {
    jest: true,
    node: true
  },
  rules: {
    // Disable no-explicit-any warnings - safer to use unknown in new code but not worth fixing all instances
    "@typescript-eslint/no-explicit-any": "off",
    
    // Disable unsafe property access warnings - needed for some cloud API responses
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    
    // Warn instead of error for unused variables when testing
    "@typescript-eslint/no-unused-vars": ["warn", { 
      "argsIgnorePattern": "^_",  // Ignore args starting with underscore
      "varsIgnorePattern": "^_"   // Ignore vars starting with underscore
    }],

    // Warn about missing dependencies in hooks during development
    "react-hooks/exhaustive-deps": "warn",
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "tests/**/*"],
      env: {
        jest: true
      }
    }
  ]
}; 