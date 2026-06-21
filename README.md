# time-punch-form

This repository contains two unrelated projects:

1. **[Velvet](velvet/)** — a private, consent-first dating & community app
   (Next.js + Postgres, installable PWA with a Tinder-style swipe deck). This is
   the main application. **See [`velvet/README.md`](velvet/README.md)** for the
   full overview, run, and deploy instructions, and [`velvet/DEPLOY.md`](velvet/DEPLOY.md)
   for click-by-click Vercel deployment.
2. **Trading-scanner pages** (below) — a small collection of self-contained,
   single-file web pages plus a Python screener.

---

## Trading-scanner pages

A small collection of self-contained, single-file web pages (no build step,
no dependencies — just open the HTML in a browser).

## Pages

- **[`index.html`](index.html)** — Time Punch Form. Submit work hours (employee
  name/ID, date, time in/out, break) and it calculates hours worked.
- **[`playbook.html`](playbook.html)** — First $10K Swing Trading Playbook. A
  styled reference page distilled from a swing-trading video. It includes SVG
  diagrams of the two setups (pullback buy / base breakout), a worked "leader
  filter" example, a printable trade-journal template, and three interactive
  tools: a position-size calculator, a "2x S&P" leader check, and a pre-trade
  checklist that tells you to skip the trade when any box is unconfirmed.

- **[`plays.html`](plays.html)** — Daily Play Watchlist. Renders the output of
  the scanner: a ranked list of S&P 500 names that currently pass the playbook's
  screen (leader vs. 2× S&P, leading sector, above the 20/50/200-day MAs, with a
  valid pullback or breakout setup).

  > ⚠️ The playbook and scanner are educational only — **not financial advice**.
  > Trading involves substantial risk of loss.

## Scanner

[`scanner/scan.py`](scanner/scan.py) turns the playbook criteria into an
automated screen. It pulls end-of-day data via [yfinance](https://pypi.org/project/yfinance/)
(free, no API key — the data layer is isolated so a paid feed can be swapped in
later), applies the playbook's rules to the S&P 500, and writes a ranked
`plays.json` / `plays.md`. Each play is also sized to a configurable account
**budget** (`BUDGET` / `RISK_PCT` in `scan.py`) using the playbook's risk math —
a suggested stop below support, share count (smaller of *max loss ÷ stop
distance* and buying power), position size, and dollars at risk. The
[`Daily Play Scan`](.github/workflows/scan.yml) workflow runs it every weekday
after the U.S. close and publishes the result to GitHub Pages.
