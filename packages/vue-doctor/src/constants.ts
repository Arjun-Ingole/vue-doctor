export const VUE_FILE_PATTERN = /\.(vue|ts|tsx|js|jsx|mts|mjs)$/;
export const SOURCE_FILE_PATTERN = /\.(vue|ts|tsx|js|jsx|mts|mjs)$/;
export const VUE_SFC_PATTERN = /\.vue$/;

export const SCORE_GOOD_THRESHOLD = 75;
export const SCORE_OK_THRESHOLD = 50;
export const PERFECT_SCORE = 100;

export const SCORE_BAR_WIDTH_CHARS = 20;
export const SUMMARY_BOX_HORIZONTAL_PADDING_CHARS = 2;
export const SUMMARY_BOX_OUTER_INDENT_CHARS = 2;
export const SEPARATOR_LENGTH_CHARS = 40;

export const MILLISECONDS_PER_SECOND = 1000;

export const GIT_LS_FILES_MAX_BUFFER_BYTES = 50 * 1024 * 1024;

export const ERROR_PREVIEW_LENGTH_CHARS = 500;

export const CONFIG_FILENAMES = ["vue-doctor.config.json"] as const;
export const PACKAGE_JSON_CONFIG_KEY = "vueDoctor";
