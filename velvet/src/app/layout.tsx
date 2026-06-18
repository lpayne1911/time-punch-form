import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

// Display serif for the brand + major headings; clean sans for the working UI.
const serif = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Velvet — Private Dating & Community",
  description:
    "A private, consent-first dating and community app for verified adults seeking intentional connection.",
  robots: { index: false, follow: false },
  applicationName: "Velvet",
  appleWebApp: { capable: true, title: "Velvet", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#100b16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
