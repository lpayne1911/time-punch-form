import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="footer-links">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/safety">Safety</Link>
        <Link href="/guidelines">Community Guidelines</Link>
        <a href="mailto:hello@velvet.app">Contact</a>
        <Link href="/safety">Report Abuse</Link>
      </nav>
      <p className="footer-legal">
        A consent-first community for verified adults. © {new Date().getFullYear()} Velvet.
      </p>
    </footer>
  );
}
