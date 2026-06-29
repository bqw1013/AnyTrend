import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "..", "src", "site-template");
const destDir = path.resolve(__dirname, "..", "dist", "site-template");

mkdirSync(destDir, { recursive: true });
cpSync(srcDir, destDir, { recursive: true, force: true });

console.log(`Copied site templates to ${destDir}`);
