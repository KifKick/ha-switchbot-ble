// Bundles src/ into the single module Home Assistant loads for the panel.
import * as esbuild from "esbuild";

const options = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "eof",
  sourcemap: false,
  outfile: "../custom_components/ha_switchbot_ble/frontend/switchbot-panel.js",
  logLevel: "info",
};

const mockup = process.argv.indexOf("--mockup");
if (mockup >= 0) {
  // one self-contained page with the cover calibration mock-up (review only)
  const { readFileSync, writeFileSync } = await import("node:fs");
  // which mock-up: "cover" (default) or "lock" after the output path
  const kind = process.argv[mockup + 2] === "lock" ? "lock" : "cover";
  const out = await esbuild.build({ ...options, entryPoints: [`src/mockup/${kind}-mockup.ts`], format: "iife", write: false, outfile: "mockup.js" });
  const title = kind === "lock" ? "Kalibracja zamków — makieta" : "Kalibracja zasłon — makieta";
  const page = readFileSync("src/mockup/page.html", "utf8")
    .replace(/<title>.*<\/title>/, `<title>${title}</title>`)
    .replaceAll("cover-mockup", `${kind}-mockup`)
    .replace("/*BUNDLE*/", () => out.outputFiles[0].text.replace(/<\/script/g, "<\\/script"));
  writeFileSync(process.argv[mockup + 1] ?? "cover-calibration-mockup.html", page);
} else if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
