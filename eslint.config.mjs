// @ts-check

import tseslint from "typescript-eslint";
import eslint from "@eslint/js";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        plugins: {
            "@typescript-eslint": tseslint.plugin,
        },
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: [ "./packages/*/tsconfig.build.json" ],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    "argsIgnorePattern": "^_+$"
                }
            ],
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "indent": [
                "error",
                "tab",
                {
                    "SwitchCase": 1,
                    "MemberExpression": "off"
                }
            ],
            "no-empty": [
                "error",
                {
                    "allowEmptyCatch": true
                }
            ],
            "prefer-arrow-callback": "error",
            "no-async-promise-executor": "off",
            "no-mixed-spaces-and-tabs": "off",
            "no-irregular-whitespace": "off",
            "no-control-regex": "off"
        }
    }
);