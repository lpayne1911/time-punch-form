// Runs after `expo export -p web`. The "single" web output uses a default
// index.html that ignores app/+html.tsx, so we inject the bits that make iOS
// treat it as a standalone home-screen app (no Safari chrome) and kill the
// white flash before React mounts.
import fs from "fs";

const file = "dist/index.html";
let html = fs.readFileSync(file, "utf8");

const HEAD = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Velvet" />
    <meta name="theme-color" content="#100b16" />
    <style>html,body{background-color:#100b16;}#root{background-color:#100b16;}</style>
  </head>`;

if (!html.includes("apple-mobile-web-app-capable")) {
  html = html.replace("</head>", HEAD);
  fs.writeFileSync(file, html);
  console.log("postexport: injected standalone PWA head tags");
} else {
  console.log("postexport: tags already present");
}
