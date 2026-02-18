import _prompts from "prompts";
import type {
  PromptMultiselectChoiceState,
  PromptMultiselectContext,
} from "../types.js";

// Patch multiselect to toggle-all when max is selected
const patchedPrompts = _prompts;

export const prompts: typeof _prompts = patchedPrompts;
