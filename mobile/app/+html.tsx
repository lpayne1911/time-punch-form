import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Web-only root HTML document (used by the installable web build). The Apple
 * meta tags make iOS run it full-screen as a standalone home-screen app — its
 * own icon, no Safari chrome — once added via Share → Add to Home Screen.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Velvet" />
        <meta name="theme-color" content="#100b16" />
        <title>Velvet</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: BASE_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Keep the page background dark before React mounts (no white flash), and lock
// the body so the app feels native, not like a scrolling web page.
const BASE_CSS = `
html, body { background-color: #100b16; margin: 0; }
#root { display: flex; min-height: 100%; }
body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
`;
