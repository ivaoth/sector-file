import typescriptEslint from "typescript-eslint"
import js from "@eslint/js";

export default typescriptEslint.config(
    js.configs.recommended,
    ...typescriptEslint.configs.recommended,
    {
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["error", {
                varsIgnorePattern: "^_",
            }],
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/camelcase": "off",
            "no-unused-expressions": "off",
            "@typescript-eslint/no-unused-expressions": "off"
        }
    }
);
