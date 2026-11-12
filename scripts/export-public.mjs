import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, sep, relative } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "release/zero-waste-ecommerce");
if (!output.startsWith(resolve(root) + sep))
  throw new Error("Invalid export destination");
if (existsSync(output))
  throw new Error(
    "release/zero-waste-ecommerce already exists. Move the previous export before exporting again.",
  );
const excluded = new Set([
  ".git",
  ".local",
  ".idea",
  ".vscode",
  ".agents",
  ".codex",
  ".aws",
  ".tmp",
  "release",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  "faiss_index_txt",
  ".eslintcache",
]);
function copy(dir, dest) {
  mkdirSync(dest, { recursive: true });
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (item.isSymbolicLink() || excluded.has(item.name)) continue;
    if (
      (item.name.startsWith(".env") && item.name !== ".env.example") ||
      /\.(log|pyc|tsbuildinfo|pem|key)$/.test(item.name)
    )
      continue;
    const source = resolve(dir, item.name);
    const target = resolve(dest, item.name);
    if (
      relative(root, source)
        .replaceAll("\\", "/")
        .startsWith("backend/uploads/") &&
      item.name !== ".gitkeep"
    )
      continue;
    if (item.isDirectory()) copy(source, target);
    else copyFileSync(source, target);
  }
}
copy(root, output);
console.log("Public source snapshot: " + output);
console.log(
  "No Git history, private env files, uploads, dependencies or virtual environments included.",
);
