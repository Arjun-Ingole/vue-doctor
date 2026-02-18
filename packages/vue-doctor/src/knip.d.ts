declare module "knip" {
  export declare const main: (options: unknown) => Promise<unknown>;
}

declare module "knip/session" {
  export declare const createOptions: (options: {
    cwd?: string;
    isShowProgress?: boolean;
    workspace?: string;
    [key: string]: unknown;
  }) => Promise<{
    parsedConfig: Record<string, unknown>;
    [key: string]: unknown;
  }>;
}
