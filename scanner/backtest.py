#!/usr/bin/env python3
"""Walk-forward backtest of the playbook PULLBACK screen — simplified, transparent.

Read these CAVEATS before trusting any number:
  * Survivorship bias: it tests TODAY's S&P 500 members over history, so names
    that fell out of the index (often losers) are missing — results skew rosy.
  * Leadership proxy: it uses a trailing 252-day return (not calendar YTD) so
    "leader" is well-defined on every date; this differs slightly from the live
    screen, which anchors to YTD.
  * Fills: entry at the signal day's close; exit on an ATR-based stop or a fixed
    reward target (RR x risk), checked against daily highs/lows. No intraday
    data, so a bar that touches both stop and target is scored as a STOP (worst
    case). No commissions, slippage, dividends, or position limits.
  * Signals overlap and are not de-duplicated; treat the sample as independent
    setups, not a single equity curve.

This is a rough sanity check on whether the screen has an edge — not a track
record. Outputs backtest.json and backtest.md at the repo root.
"""
from __future__ import annotations

import datetime as dt
import json
import statistics
import sys
from pathlib import Path

import pandas as pd

import scan

HOLD = 20         # trading days held before a forced mark-to-market exit
STEP = 5          # generate candidate signals weekly
TEST_DAYS = 252   # look for signals across roughly the last year
RR = 2.0          # reward target = RR x the risk (stop distance)


def atr_series(high: pd.Series, low: pd.Series, close: pd.Series, n: int = 14) -> pd.Series:
    prev = close.shift(1)
    tr = pd.concat([(high - low).abs(), (high - prev).abs(), (low - prev).abs()],
                   axis=1).max(axis=1)
    return tr.rolling(n).mean()


def run() -> dict:
    universe = scan.sp500_constituents()
    tickers = universe["ticker"].tolist()
    sector_by = dict(zip(universe["ticker"], universe["sector"]))

    # Benchmark + sector ETF trailing-return series (the leadership context).
    ref = scan.fetch_history([scan.BENCHMARK] + list(scan.SECTOR_ETFS.values()),
                             period="2y")
    spy = scan.series_for(ref, scan.BENCHMARK, "Close")
    if spy is None:
        print("[fatal] no SPY data", file=sys.stderr)
        return {}
    spy_ret = spy.pct_change(252)
    etf_ret = {}
    for sector, etf in scan.SECTOR_ETFS.items():
        c = scan.series_for(ref, etf, "Close")
        etf_ret[sector] = c.pct_change(252) if c is not None else None

    data = scan.fetch_history(tickers, period="2y")

    signals = []
    for tkr in tickers:
        close = scan.series_for(data, tkr, "Close")
        high = scan.series_for(data, tkr, "High")
        low = scan.series_for(data, tkr, "Low")
        if close is None or high is None or low is None:
            continue
        if len(close) < 252 + HOLD + STEP:
            continue
        sector = sector_by.get(tkr, "")
        er = etf_ret.get(sector)
        if er is None:
            continue

        idx = close.index
        sret = close.pct_change(252)
        sma20 = close.rolling(20).mean()
        sma50 = close.rolling(50).mean()
        sma200 = close.rolling(200).mean()
        atr = atr_series(high, low, close)
        spy_r = spy_ret.reindex(idx)
        etf_r = er.reindex(idx)

        n = len(close)
        start = max(252, n - TEST_DAYS - HOLD)
        for k in range(start, n - HOLD, STEP):
            price = float(close.iloc[k])
            s20, s50, s200 = sma20.iloc[k], sma50.iloc[k], sma200.iloc[k]
            if any(pd.isna(x) for x in (s20, s50, s200)):
                continue
            # Trend: above all three MAs.
            if not (price > s20 and price > s50 and price > s200):
                continue
            # Pullback: just above a RISING 20-day MA, still above the 50 (mirrors analyze()).
            if not (s20 <= price <= s20 * (1 + scan.PULLBACK_BAND)
                    and s20 > sma20.iloc[k - 5] and price > s50):
                continue
            # Leader (trailing 252d) and leading group (sector ETF beating SPY).
            sr, spr, erv = sret.iloc[k], spy_r.iloc[k], etf_r.iloc[k]
            if pd.isna(sr) or pd.isna(spr) or pd.isna(erv):
                continue
            if not (sr > 0 and sr >= scan.LEADER_MULTIPLE * spr and erv > spr):
                continue
            # ATR-based stop, same rule as the live sizer.
            a = atr.iloc[k]
            if pd.isna(a):
                continue
            stop = min(float(s20) * (1 - scan.STOP_BUFFER), price - scan.ATR_MULT * float(a),
                       price * 0.995)
            stop_dist = (price - stop) / price
            if stop_dist <= 0:
                continue
            target = price * (1 + RR * stop_dist)

            # Forward walk: first touch of stop or target wins; else mark to market.
            outcome, exit_px, days = "open", float(close.iloc[k + HOLD]), HOLD
            for j in range(k + 1, k + HOLD + 1):
                if low.iloc[j] <= stop:           # stop checked first (worst case)
                    outcome, exit_px, days = "stop", stop, j - k
                    break
                if high.iloc[j] >= target:
                    outcome, exit_px, days = "target", target, j - k
                    break
            ret = (exit_px / price - 1) * 100
            rmult = (exit_px / price - 1) / stop_dist
            signals.append({
                "ticker": tkr, "date": idx[k].strftime("%Y-%m-%d"), "sector": sector,
                "entry": round(price, 2), "stop_pct": round(stop_dist * 100, 2),
                "outcome": outcome, "days_held": days,
                "return_pct": round(ret, 2), "r_multiple": round(rmult, 2),
            })

    return summarize(signals)


def summarize(signals: list[dict]) -> dict:
    if not signals:
        return {"signals": 0}
    rets = [s["return_pct"] for s in signals]
    rmults = [s["r_multiple"] for s in signals]
    wins = [s for s in signals if s["return_pct"] > 0]
    losses = [s for s in signals if s["return_pct"] <= 0]
    stops = [s for s in signals if s["outcome"] == "stop"]
    targets = [s for s in signals if s["outcome"] == "target"]
    by_outcome = {o: sum(1 for s in signals if s["outcome"] == o)
                  for o in ("target", "stop", "open")}

    def avg(xs):
        return round(statistics.mean(xs), 2) if xs else None

    return {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "params": {"hold_days": HOLD, "step": STEP, "test_days": TEST_DAYS,
                   "reward_risk": RR, "leader_multiple": scan.LEADER_MULTIPLE,
                   "atr_mult": scan.ATR_MULT},
        "signals": len(signals),
        "win_rate_pct": round(100 * len(wins) / len(signals), 1),
        "by_outcome": by_outcome,
        "avg_return_pct": avg(rets),
        "median_return_pct": round(statistics.median(rets), 2),
        "avg_win_pct": avg([s["return_pct"] for s in wins]),
        "avg_loss_pct": avg([s["return_pct"] for s in losses]),
        "expectancy_r": avg(rmults),       # average R per trade = the edge
        "target_hit_pct": round(100 * len(targets) / len(signals), 1),
        "stopped_out_pct": round(100 * len(stops) / len(signals), 1),
        "best": max(signals, key=lambda s: s["return_pct"]),
        "worst": min(signals, key=lambda s: s["return_pct"]),
        "sample": signals[:200],
    }


def render_md(r: dict) -> str:
    if not r or not r.get("signals"):
        return "# Backtest\n\nNo signals generated.\n"
    p = r["params"]
    lines = [
        "# Playbook pullback backtest (simplified)",
        "",
        f"_Generated {r['generated_at']}_",
        "",
        "> ⚠️ **Caveats:** survivorship bias (current S&P 500 only), trailing-return "
        "leadership proxy (not YTD), close-fill entries, daily-bar stop/target "
        "(ties scored as stops), no costs/slippage, overlapping signals. A rough "
        "edge check — **not** a track record.",
        "",
        f"- Signals: **{r['signals']}** | Hold **{p['hold_days']}d** | "
        f"Target **{p['reward_risk']}R** | weekly cadence over ~last "
        f"{p['test_days']} sessions",
        f"- **Win rate: {r['win_rate_pct']}%** | Expectancy: **{r['expectancy_r']}R** "
        f"per trade",
        f"- Avg return **{r['avg_return_pct']}%** (median {r['median_return_pct']}%) | "
        f"avg win **{r['avg_win_pct']}%** | avg loss **{r['avg_loss_pct']}%**",
        f"- Target hit **{r['target_hit_pct']}%** | stopped out "
        f"**{r['stopped_out_pct']}%** | open at {p['hold_days']}d "
        f"**{round(100*r['by_outcome']['open']/r['signals'],1)}%**",
        f"- Best **{r['best']['ticker']}** {r['best']['return_pct']}% | "
        f"worst **{r['worst']['ticker']}** {r['worst']['return_pct']}%",
        "",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    result = run()
    (scan.ROOT / "backtest.json").write_text(json.dumps(result, indent=2))
    (scan.ROOT / "backtest.md").write_text(render_md(result))
    if result.get("signals"):
        print(f"backtest: {result['signals']} signals, "
              f"win rate {result['win_rate_pct']}%, "
              f"expectancy {result['expectancy_r']}R", file=sys.stderr)
    else:
        print("backtest: no signals", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
