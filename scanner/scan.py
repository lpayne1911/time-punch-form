#!/usr/bin/env python3
"""Daily swing-trading play scanner.

Turns the *First $10K Swing Trading Playbook* criteria into an automated screen.
It pulls end-of-day data for the S&P 500, applies the playbook's rules, and
writes a ranked watchlist to ``plays.json`` and ``plays.md`` at the repo root
(which the Pages site renders at ``plays.html``).

The playbook screen, in order:
  1. Leader        - stock YTD return beats 2x the S&P 500 (SPY) YTD return.
  2. Leading group - the stock's GICS sector ETF is itself beating SPY YTD.
  3. Trend         - price is above its 20-, 50- and 200-day moving averages.
  4. Setup         - a valid PULLBACK (riding a rising 20-day MA after an
                     advance) or BREAKOUT (tight base near the highs).
  5. Volume        - breakouts must show an above-average volume push.

Data source: yfinance (Yahoo Finance) - free, no API key. All network access
is isolated in the fetch_* functions so a paid feed (Polygon, Alpaca, ...) can
be dropped in later without touching the screen logic.
"""

from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Tunable thresholds - these mirror the language of the playbook.
# ---------------------------------------------------------------------------
LEADER_MULTIPLE = 2.0    # stock YTD must clear this multiple of SPY's YTD
VOL_SURGE = 1.3          # today's volume / 50-day avg to "confirm" a breakout
PULLBACK_BAND = 0.04     # price within +4% of the 20-day MA = riding support
BASE_LOOKBACK = 20       # bars used to measure a tight base near the highs
BASE_TIGHTNESS = 0.10    # base high/low range under 10% counts as "tight"
NEAR_HIGH = 0.05         # price within 5% of the base high = breakout-ready
MIN_BARS = 200           # need at least this much history for the 200-day MA

# --- account / position sizing (the playbook's risk math) ---
BUDGET = 2500.0          # account size the watchlist sizes positions against
RISK_PCT = 1.0           # percent of the account risked per trade
STOP_BUFFER = 0.02       # place the stop this far below the support level

BENCHMARK = "SPY"
SECTOR_ETFS = {
    "Information Technology": "XLK",
    "Health Care": "XLV",
    "Financials": "XLF",
    "Consumer Discretionary": "XLY",
    "Communication Services": "XLC",
    "Industrials": "XLI",
    "Consumer Staples": "XLP",
    "Energy": "XLE",
    "Utilities": "XLU",
    "Real Estate": "XLRE",
    "Materials": "XLB",
}

# Minimal fallback universe (incl. the playbook's own tickers) used only if the
# live S&P 500 constituent list can't be fetched.
FALLBACK_UNIVERSE = [
    ("CVX", "Chevron", "Energy"),
    ("BE", "Bloom Energy", "Industrials"),
    ("GEV", "GE Vernova", "Industrials"),
    ("MU", "Micron Technology", "Information Technology"),
    ("NVDA", "NVIDIA", "Information Technology"),
    ("PLTR", "Palantir", "Information Technology"),
    ("AAPL", "Apple", "Information Technology"),
    ("MSFT", "Microsoft", "Information Technology"),
    ("XOM", "Exxon Mobil", "Energy"),
    ("JPM", "JPMorgan Chase", "Financials"),
]


# ---------------------------------------------------------------------------
# Data layer (the only part that touches the network).
# ---------------------------------------------------------------------------
def sp500_constituents() -> pd.DataFrame:
    """Return a DataFrame of [ticker, name, sector] for the S&P 500.

    Tries a stable, machine-readable constituents CSV first (no scraping),
    then falls back to the Wikipedia table, then to a tiny inline list.
    """
    # 1) Maintained constituents dataset (Symbol, Security, GICS Sector).
    try:
        df = pd.read_csv(
            "https://raw.githubusercontent.com/datasets/"
            "s-and-p-500-companies/main/data/constituents.csv"
        )
        df = df.rename(
            columns={"Symbol": "ticker", "Security": "name", "GICS Sector": "sector"}
        )
        df["ticker"] = df["ticker"].str.replace(".", "-", regex=False)
        out = df[["ticker", "name", "sector"]].dropna()
        if len(out) >= 100:
            print(f"[info] loaded {len(out)} constituents from datasets CSV",
                  file=sys.stderr)
            return out.reset_index(drop=True)
        raise ValueError(f"unexpected constituent count: {len(out)}")
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] constituents CSV failed ({exc}); trying Wikipedia",
              file=sys.stderr)

    # 2) Wikipedia table (needs a browser-ish UA to avoid 403s).
    try:
        tables = pd.read_html(
            "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
            storage_options={"User-Agent": "Mozilla/5.0 (compatible; play-scanner)"},
        )
        df = tables[0].rename(
            columns={"Symbol": "ticker", "Security": "name", "GICS Sector": "sector"}
        )
        df["ticker"] = df["ticker"].str.replace(".", "-", regex=False)
        out = df[["ticker", "name", "sector"]].dropna()
        if len(out) >= 100:
            print(f"[info] loaded {len(out)} constituents from Wikipedia",
                  file=sys.stderr)
            return out.reset_index(drop=True)
        raise ValueError(f"unexpected constituent count: {len(out)}")
    except Exception as exc:  # noqa: BLE001 - any failure -> safe fallback
        print(f"[warn] S&P 500 list fetch failed ({exc}); using fallback",
              file=sys.stderr)
        return pd.DataFrame(FALLBACK_UNIVERSE, columns=["ticker", "name", "sector"])


def fetch_history(tickers: list[str], period: str = "1y") -> pd.DataFrame:
    """Download daily OHLCV for many tickers as one multi-indexed frame."""
    return yf.download(
        tickers,
        period=period,
        interval="1d",
        auto_adjust=True,
        group_by="ticker",
        threads=True,
        progress=False,
    )


# ---------------------------------------------------------------------------
# Indicator helpers.
# ---------------------------------------------------------------------------
def ytd_return(close: pd.Series) -> float | None:
    """Percent change from the first trading day of the current year."""
    start = pd.Timestamp(dt.date(dt.date.today().year, 1, 1))
    this_year = close[close.index >= start]
    if len(this_year) < 2:
        return None
    return round((this_year.iloc[-1] / this_year.iloc[0] - 1) * 100, 2)


def series_for(data: pd.DataFrame, ticker: str, field: str) -> pd.Series | None:
    """Pull one column for one ticker out of the grouped download frame."""
    try:
        if isinstance(data.columns, pd.MultiIndex):
            s = data[ticker][field]
        else:  # single-ticker download has flat columns
            s = data[field]
        return s.dropna()
    except (KeyError, TypeError):
        return None


def analyze(close: pd.Series, volume: pd.Series) -> dict | None:
    """Compute trend / setup metrics for one ticker. None if insufficient data."""
    close = close.dropna()
    if len(close) < MIN_BARS:
        return None

    price = float(close.iloc[-1])
    sma20 = close.rolling(20).mean()
    sma50 = float(close.rolling(50).mean().iloc[-1])
    sma200 = float(close.rolling(200).mean().iloc[-1])
    sma20_now = float(sma20.iloc[-1])
    sma20_prev = float(sma20.iloc[-6])  # ~1 week earlier, for slope

    above_mas = price > sma20_now and price > sma50 and price > sma200

    vol50 = float(volume.rolling(50).mean().iloc[-1]) if volume is not None else 0.0
    vol_today = float(volume.iloc[-1]) if volume is not None else 0.0
    vol_ratio = round(vol_today / vol50, 2) if vol50 else None

    # PULLBACK: price sitting just above a rising 20-day MA, still above the 50.
    pullback = (
        sma20_now <= price <= sma20_now * (1 + PULLBACK_BAND)
        and sma20_now > sma20_prev
        and price > sma50
    )

    # BREAKOUT: recent range is tight and price is pressing the high, on volume.
    window = close.iloc[-BASE_LOOKBACK:]
    base_low, base_high = float(window.min()), float(window.max())
    base_range = (base_high - base_low) / base_low if base_low else 1.0
    near_high = price >= base_high * (1 - NEAR_HIGH)
    vol_ok = vol_ratio is not None and vol_ratio >= VOL_SURGE
    breakout = base_range < BASE_TIGHTNESS and near_high and vol_ok

    setup = "pullback" if pullback else ("breakout" if breakout else None)

    return {
        "price": round(price, 2),
        "sma20": round(sma20_now, 2),
        "sma50": round(sma50, 2),
        "sma200": round(sma200, 2),
        "above_mas": above_mas,
        "pct_to_20ma": round((price / sma20_now - 1) * 100, 2),
        "vol_ratio": vol_ratio,
        "base_low": round(base_low, 2),
        "base_range_pct": round(base_range * 100, 1),
        "setup": setup,
    }


def recent_history(close: pd.Series, volume: pd.Series, days: int = 7) -> tuple:
    """Return the last `days` trading sessions and the change across them.

    Each row is {date, close, chg_pct (vs prior session), volume}. This is the
    raw per-stock data for a 7-day review.
    """
    hist = close.dropna().tail(days)
    rows, prev = [], None
    for ts, c in hist.items():
        c = float(c)
        vol = None
        if volume is not None and ts in volume.index:
            v = volume.loc[ts]
            vol = int(v) if pd.notna(v) else None
        rows.append({
            "date": ts.strftime("%Y-%m-%d"),
            "close": round(c, 2),
            "chg_pct": round((c / prev - 1) * 100, 2) if prev else None,
            "volume": vol,
        })
        prev = c
    week = None
    if len(hist) >= 2:
        week = round((float(hist.iloc[-1]) / float(hist.iloc[0]) - 1) * 100, 2)
    return rows, week


def size_position(price: float, setup: str, sma20: float, base_low: float) -> dict:
    """Apply the playbook's risk math to a single play, given BUDGET/RISK_PCT.

    The stop sits just below the relevant support (the 20-day MA for pullbacks,
    the base low for breakouts). Position size is the smaller of what the risk
    budget allows (max loss / stop distance) and the account's buying power.
    """
    support = base_low if setup == "breakout" else sma20
    stop = min(support * (1 - STOP_BUFFER), price * (1 - 0.005))
    stop_dist = (price - stop) / price
    if stop_dist <= 0:
        return {"stop": None, "stop_pct": None, "shares": 0,
                "position_usd": 0.0, "risk_usd": 0.0, "note": "no valid stop"}

    max_loss = BUDGET * RISK_PCT / 100.0          # e.g. $2,500 x 1% = $25
    pos_by_risk = max_loss / stop_dist            # playbook: position = maxLoss / stop%
    pos = min(pos_by_risk, BUDGET)                # never exceed buying power
    shares = int(pos // price)

    note = ""
    if shares < 1:
        # One share already risks more than the per-trade limit allows.
        note = "1 share exceeds risk limit" if price <= BUDGET else "above budget"
    return {
        "stop": round(stop, 2),
        "stop_pct": round(stop_dist * 100, 2),
        "shares": shares,
        "position_usd": round(shares * price, 2),
        "risk_usd": round(shares * (price - stop), 2),
        "note": note,
    }


# ---------------------------------------------------------------------------
# Screen.
# ---------------------------------------------------------------------------
def leader_threshold(spy_ytd: float) -> float:
    """2x SPY when the market is up; fall back to 'positive & beating SPY'."""
    if spy_ytd > 0:
        return LEADER_MULTIPLE * spy_ytd
    return max(0.0, spy_ytd)


def main() -> int:
    universe = sp500_constituents()
    tickers = universe["ticker"].tolist()
    sector_by_ticker = dict(zip(universe["ticker"], universe["sector"]))
    name_by_ticker = dict(zip(universe["ticker"], universe["name"]))

    # Benchmark + sector ETFs first, so we know the market and group leaders.
    ref_symbols = [BENCHMARK] + list(SECTOR_ETFS.values())
    ref = fetch_history(ref_symbols)
    spy_close = series_for(ref, BENCHMARK, "Close")
    spy_ytd = ytd_return(spy_close) if spy_close is not None else 0.0
    spy_ytd = spy_ytd or 0.0
    threshold = leader_threshold(spy_ytd)

    sector_ytd = {}
    for sector, etf in SECTOR_ETFS.items():
        c = series_for(ref, etf, "Close")
        sector_ytd[sector] = ytd_return(c) if c is not None else None
    leading_sectors = {
        s for s, y in sector_ytd.items() if y is not None and y > spy_ytd
    }

    print(f"SPY YTD={spy_ytd}%  leader threshold={round(threshold,2)}%  "
          f"leading sectors={sorted(leading_sectors)}", file=sys.stderr)

    data = fetch_history(tickers)

    plays = []
    for tkr in tickers:
        close = series_for(data, tkr, "Close")
        volume = series_for(data, tkr, "Volume")
        if close is None:
            continue
        m = analyze(close, volume)
        if m is None:
            continue
        ytd = ytd_return(close)
        sector = sector_by_ticker.get(tkr, "")

        reasons = []
        is_leader = ytd is not None and ytd >= threshold
        in_leading_group = sector in leading_sectors
        if is_leader:
            reasons.append(f"leader: YTD {ytd}% ≥ {round(threshold,2)}%")
        if in_leading_group:
            reasons.append(f"leading group: {sector} ({sector_ytd.get(sector)}%)")
        if m["above_mas"]:
            reasons.append("above 20/50/200-day MAs")
        if m["setup"]:
            reasons.append(f"{m['setup']} setup")

        # Hard filter: every playbook box must be checked.
        if not (is_leader and in_leading_group and m["above_mas"] and m["setup"]):
            continue

        # Relative strength vs SPY drives the ranking.
        rs = round(ytd / spy_ytd, 2) if spy_ytd else None
        sizing = size_position(m["price"], m["setup"], m["sma20"], m["base_low"])
        history, week_change = recent_history(close, volume, days=7)
        plays.append({
            "ticker": tkr,
            "name": name_by_ticker.get(tkr, tkr),
            "sector": sector,
            "ytd": ytd,
            "rs_vs_spy": rs,
            "setup": m["setup"],
            "price": m["price"],
            "pct_to_20ma": m["pct_to_20ma"],
            "vol_ratio": m["vol_ratio"],
            "base_range_pct": m["base_range_pct"],
            "stop": sizing["stop"],
            "stop_pct": sizing["stop_pct"],
            "shares": sizing["shares"],
            "position_usd": sizing["position_usd"],
            "risk_usd": sizing["risk_usd"],
            "size_note": sizing["note"],
            "week_change_pct": week_change,
            "sma50": m["sma50"],
            "sma200": m["sma200"],
            "history": history,
            "reasons": reasons,
        })

    plays.sort(key=lambda p: (p["rs_vs_spy"] or 0, p["ytd"] or 0), reverse=True)

    result = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "benchmark": BENCHMARK,
        "spy_ytd": spy_ytd,
        "leader_threshold": round(threshold, 2),
        "leading_sectors": sorted(leading_sectors),
        "universe_size": len(tickers),
        "count": len(plays),
        "budget": BUDGET,
        "risk_pct": RISK_PCT,
        "max_loss_per_trade": round(BUDGET * RISK_PCT / 100.0, 2),
        "plays": plays,
    }

    (ROOT / "plays.json").write_text(json.dumps(result, indent=2) + "\n")
    (ROOT / "plays.md").write_text(render_markdown(result))
    print(f"Wrote {len(plays)} plays to plays.json / plays.md", file=sys.stderr)
    return 0


def render_markdown(r: dict) -> str:
    lines = [
        "# Daily Play Watchlist",
        "",
        f"_Generated {r['generated_at']} — not financial advice._",
        "",
        f"- Benchmark **{r['benchmark']}** YTD: **{r['spy_ytd']}%** "
        f"(leader threshold **{r['leader_threshold']}%**)",
        f"- Leading sectors: {', '.join(r['leading_sectors']) or '—'}",
        f"- Scanned **{r['universe_size']}** names → **{r['count']}** plays",
        f"- Budget **${r['budget']:,.0f}**, risking **{r['risk_pct']}%** "
        f"(**${r['max_loss_per_trade']:,.2f}** max loss/trade)",
        "",
    ]
    if not r["plays"]:
        lines.append("No setups matched all criteria today.")
        return "\n".join(lines) + "\n"
    lines += [
        "| # | Ticker | Sector | YTD % | RS | Setup | Price | Stop | Stop % | "
        "Shares | Position $ | Risk $ |",
        "|--:|:--|:--|--:|--:|:--|--:|--:|--:|--:|--:|--:|",
    ]
    for i, p in enumerate(r["plays"], 1):
        shares = p["shares"] if p["shares"] else (p["size_note"] or "0")
        lines.append(
            f"| {i} | {p['ticker']} | {p['sector']} | {p['ytd']} | {p['rs_vs_spy']} | "
            f"{p['setup']} | {p['price']} | {p['stop']} | {p['stop_pct']} | "
            f"{shares} | {p['position_usd']} | {p['risk_usd']} |"
        )
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    raise SystemExit(main())
