import ora, { type Ora } from "ora";

export const spinner = (text: string): Ora => ora({ text, color: "cyan" });
