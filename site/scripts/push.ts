import { main } from "../kit/push.ts";
import { spec } from "./build.ts";

if (import.meta.main) await main(spec);
