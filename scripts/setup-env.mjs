import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

for (const folder of ["backend", "frontend", "chatbot"]) {
  const target = new URL("../" + folder + "/.env", import.meta.url);
  if (existsSync(target)) {
    console.log(folder + "/.env exists; preserved.");
    continue;
  }
  let content = readFileSync(
    new URL("../" + folder + "/.env.example", import.meta.url),
    "utf8",
  );
  if (folder === "backend")
    content = content.replace(
      "JWT_SECRET=change-me-generate-a-random-secret-before-running",
      "JWT_SECRET=" + randomBytes(32).toString("hex"),
    );
  writeFileSync(target, content);
  console.log("Created " + folder + "/.env");
}
