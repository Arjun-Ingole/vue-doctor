import { RuleTester } from "eslint";
import vueParser from "vue-eslint-parser";
import { accessibilityRules } from "../../../src/plugin/rules/accessibility.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parser: vueParser,
  },
});

describe("accessibility rules", () => {
  describe("no-autofocus", () => {
    const rule = accessibilityRules["no-autofocus"];

    ruleTester.run("no-autofocus", rule, {
      valid: [
        {
          filename: "test.vue",
          code: `<template><input /></template>`,
        },
      ],
      invalid: [
        {
          filename: "test.vue",
          code: `<template><input autofocus /></template>`,
          errors: [{ messageId: "avoidAutofocus" }],
        },
      ],
    });
  });

  describe("no-positive-tabindex", () => {
    const rule = accessibilityRules["no-positive-tabindex"];

    ruleTester.run("no-positive-tabindex", rule, {
      valid: [
        {
          filename: "test.vue",
          code: `<template><div tabindex="0" /></template>`,
        },
        {
          filename: "test.vue",
          code: `<template><div :tabindex="0" /></template>`,
        },
      ],
      invalid: [
        {
          filename: "test.vue",
          code: `<template><div tabindex="3" /></template>`,
          errors: [{ messageId: "avoidPositiveTabindex" }],
        },
        {
          filename: "test.vue",
          code: `<template><div :tabindex="2" /></template>`,
          errors: [{ messageId: "avoidPositiveTabindex" }],
        },
      ],
    });
  });

  describe("require-button-type", () => {
    const rule = accessibilityRules["require-button-type"];

    ruleTester.run("require-button-type", rule, {
      valid: [
        {
          filename: "test.vue",
          code: `<template><button type="button">Click</button></template>`,
        },
        {
          filename: "test.vue",
          code: `<template><button :type="buttonType">Click</button></template>`,
        },
      ],
      invalid: [
        {
          filename: "test.vue",
          code: `<template><button>Submit</button></template>`,
          errors: [{ messageId: "requireType" }],
        },
      ],
    });
  });

  describe("require-img-alt", () => {
    const rule = accessibilityRules["require-img-alt"];

    ruleTester.run("require-img-alt", rule, {
      valid: [
        {
          filename: "test.vue",
          code: `<template><img src="/logo.png" alt="Logo" /></template>`,
        },
        {
          filename: "test.vue",
          code: `<template><img src="/divider.png" alt="" /></template>`,
        },
      ],
      invalid: [
        {
          filename: "test.vue",
          code: `<template><img src="/logo.png" /></template>`,
          errors: [{ messageId: "requireAlt" }],
        },
      ],
    });
  });

  describe("require-accessible-form-control-name", () => {
    const rule = accessibilityRules["require-accessible-form-control-name"];

    ruleTester.run("require-accessible-form-control-name", rule, {
      valid: [
        {
          filename: "test.vue",
          code: `<template><input aria-label="Search" /></template>`,
        },
        {
          filename: "test.vue",
          code: `<template><textarea :aria-label="descriptionLabel" /></template>`,
        },
      ],
      invalid: [
        {
          filename: "test.vue",
          code: `<template><input /></template>`,
          errors: [{ messageId: "requireAccessibleName" }],
        },
        {
          filename: "test.vue",
          code: `<template><select></select></template>`,
          errors: [{ messageId: "requireAccessibleName" }],
        },
      ],
    });
  });

  describe("no-click-without-keyboard-handler", () => {
    const rule = accessibilityRules["no-click-without-keyboard-handler"];

    ruleTester.run("no-click-without-keyboard-handler", rule, {
      valid: [
        {
          filename: "test.vue",
          code: `<template><button @click="save">Save</button></template>`,
        },
        {
          filename: "test.vue",
          code: `<template><div @click="save" @keydown="save">Save</div></template>`,
        },
      ],
      invalid: [
        {
          filename: "test.vue",
          code: `<template><div @click="save">Save</div></template>`,
          errors: [{ messageId: "requireKeyboardHandler" }],
        },
      ],
    });
  });

  describe("require-media-captions", () => {
    const rule = accessibilityRules["require-media-captions"];

    ruleTester.run("require-media-captions", rule, {
      valid: [
        {
          filename: "test.vue",
          code: `<template><video><track kind="captions" src="/captions.vtt" /></video></template>`,
        },
      ],
      invalid: [
        {
          filename: "test.vue",
          code: `<template><video src="/movie.mp4"></video></template>`,
          errors: [{ messageId: "requireCaptions" }],
        },
      ],
    });
  });

  describe("no-aria-hidden-on-focusable", () => {
    const rule = accessibilityRules["no-aria-hidden-on-focusable"];

    ruleTester.run("no-aria-hidden-on-focusable", rule, {
      valid: [
        {
          filename: "test.vue",
          code: `<template><div aria-hidden="true">Decorative</div></template>`,
        },
      ],
      invalid: [
        {
          filename: "test.vue",
          code: `<template><button aria-hidden="true">Save</button></template>`,
          errors: [{ messageId: "noAriaHiddenFocusable" }],
        },
        {
          filename: "test.vue",
          code: `<template><a href="/home" aria-hidden="true">Home</a></template>`,
          errors: [{ messageId: "noAriaHiddenFocusable" }],
        },
      ],
    });
  });
});
