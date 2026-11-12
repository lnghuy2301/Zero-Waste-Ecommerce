import { existsSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const assertInside = (path) => {
  if (!resolve(path).startsWith(resolve(root) + sep))
    throw new Error("Path outside project");
};
for (const name of [
  "backend/dist",
  "frontend/dist",
  "backend/coverage",
  "frontend/coverage",
]) {
  const path = resolve(root, name);
  assertInside(path);
  if (existsSync(path)) {
    rmSync(path, { recursive: true });
    console.log("Removed " + name);
  }
}
function cleanCache(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (
      item.isSymbolicLink() ||
      ["node_modules", ".venv", "venv", ".git", ".local", "release"].includes(
        item.name,
      )
    )
      continue;
    const path = resolve(dir, item.name);
    assertInside(path);
    if (
      item.isDirectory() &&
      ["__pycache__", ".pytest_cache", ".mypy_cache"].includes(item.name)
    )
      rmSync(path, { recursive: true });
    else if (item.isDirectory()) cleanCache(path);
  }
}
cleanCache(root);
