import { resolve } from "node:path";
import { main } from "../kit/vendor.ts";

if (import.meta.main) await main(resolve(import.meta.dir, ".."));
