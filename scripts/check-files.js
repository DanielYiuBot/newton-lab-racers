const fs = require("fs");
const path = require("path");

const requiredFiles = ["index.html", "styles.css", "game.js", "vercel.json"];
const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(__dirname, "..", file)));

if (missing.length > 0) {
  console.error(`Missing required files: ${missing.join(", ")}`);
  process.exit(1);
}

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const requiredText = [
  "Inertia Dash",
  "F = ma Launcher",
  "Space Skater Push",
  "canvas",
  "game.js"
];

const missingText = requiredText.filter((text) => !html.includes(text));

if (missingText.length > 0) {
  console.error(`index.html is missing expected content: ${missingText.join(", ")}`);
  process.exit(1);
}

console.log("Static game files look ready.");
