import { mkdir, copyFile, cp, writeFile, rm } from "node:fs/promises";
import { publicRsvpConfig } from "./rsvp-config.mjs";
const dist = new URL("./dist/", import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of [
  "index.html",
  "music-samples.html",
  "app.js",
  "event-audio.js",
  "rsvp-identity.mjs",
  "styles.css",
  "enhancements.css",
  "translations.json",
]) {
  await copyFile(new URL(file, import.meta.url), new URL(file, dist));
}
await cp(new URL("./assets/", import.meta.url), new URL("./assets/", dist), {
  recursive: true,
});
await writeFile(
  new URL("config.js", dist),
  `window.WEDDING_CONFIG = ${JSON.stringify(publicRsvpConfig)};\n`,
);
await writeFile(new URL(".nojekyll", dist), "");
console.log("Built static GitHub Pages site in dist/");
