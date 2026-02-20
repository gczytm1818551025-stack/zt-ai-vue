import globals from "globals";
import pluginJs from "@eslint/js";
import pluginVue from "eslint-plugin-vue";

const cleanedGlobals = Object.entries(globals.browser).reduce((acc, [key, value]) => {
  acc[key.trim()] = value;
  return acc;
}, {});

export default [
  pluginJs.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
        globals: cleanedGlobals
    },
    rules: {
      "vue/no-unused-components": "warn",
      "no-unused-vars": "warn"
    }
  }
];