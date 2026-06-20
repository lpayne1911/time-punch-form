import type { MetadataRoute } from "next";

// PWA manifest so Velvet installs to the home screen and launches chromeless
// (standalone) — no browser URL bar, like a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Velvet — Private Dating & Community",
    short_name: "Velvet",
    description:
      "A private, consent-first dating and community app for verified adults seeking intentional connection.",
    start_url: "/discover",
    display: "standalone",
    orientation: "portrait",
    background_color: "#100b16",
    theme_color: "#100b16",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
