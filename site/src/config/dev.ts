import pkg from "../../package.json";

export const DEV = (Boolean(pkg.dev) || process.env.DEV === "1") && !process.env.AWS_LAMBDA_FUNCTION_NAME;

export const DEV_DIR = "dev";

export const PICSUM = "https://picsum.photos/seed";

export const PICSUM_POOL: [number, number] = [50, 100];

export const DEV_VARIATIONS: [number, number] = [6, 10];

export const DEV_POSTS = 60;

export const DEV_SEED = 20260916;
