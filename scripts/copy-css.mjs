import { access, copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const source = resolve("src/react/styles/default.css");
const destination = resolve("dist/react/styles/default.css");

try {
  await access(source);
} catch {
  console.error(`copy-css: source stylesheet not found at ${source}`);
  process.exit(1);
}

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);

try {
  await access(destination);
} catch {
  console.error(`copy-css: copy failed, ${destination} does not exist`);
  process.exit(1);
}

console.log(`copy-css: copied default.css -> ${destination}`);
