import ora, { type Ora } from "ora";

let sharedSpinner: Ora | null = null;

export const spinner = (text: string): Ora => {
  if (!sharedSpinner) {
    sharedSpinner = ora({ text, color: "cyan" });
  } else {
    sharedSpinner.text = text;
  }
  return sharedSpinner;
};
