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

HOLD = scan.HOLD_GUIDE   # canonical hold = the live let-winners-run guideline (40d)
STEP = 5          # generate candidate signals weekly
TEST_DAYS = 252   # look for signals across roughly the last year
RR = scan.TARGET_R       # canonical target = the live target (3R)
MAX_HOLD = 40     # longest forward window kept so the sweep can vary hold length

# Exit-parameter sweep. Risk % is deliberately NOT swept: it only scales dollar
# exposure, not the per-trade R outcome, so win rate / expectancy are identical
# across risk levels. These three knobs actually move the edge.
GRID_RR = [1.5, 2.0, 3.0]                 # reward:risk target
GRID_ATR = [1.0, 1.5, 2.0]                # ATR stop multiple
GRID_HOLD = [10, 20, 40]                  # trading days held


def atr_series(high: pd.Series, low: pd.Series, close: pd.Series, n: int = 14) -> pd.Series:
    prev = close.shift(1)
    tr = pd.concat([(high - low).abs(), (high - prev).abs(), (low - prev).abs()],
                   axis=1).max(axis=1)
    return tr.rolling(n).mean()


def collect_signals() -> list[dict]:
    """Find every qualifying entry once, keeping each one's forward price path.

    The screen gates (trend / pullback / leadership) decide ENTRIES; the exit
    knobs (target, stop multiple, hold) are applied later in evaluate(), so the
    expensive screen runs a single time and the whole sweep is cheap.
    """
    universe = scan.sp500_constituents()
    tickers = universe["ticker"].tolist()
    sector_by = dict(zip(universe["ticker"], universe["sector"]))

    # Benchmark + sector ETF trailing-return series (the leadership context).
    ref = scan.fetch_history([scan.BENCHMARK] + list(scan.SECTOR_ETFS.values()),
                             period="2y")
    spy = scan.series_for(ref, scan.BENCHMARK, "Close")
    if spy is None:
        print("[fatal] no SPY data", file=sys.stderr)
        return []
    spy_ret = spy.pct_change(252)
    etf_ret = {}
    for sector, etf in scan.SECTOR_ETFS.items():
        c = scan.series_for(ref, etf, "Close")
        etf_ret[sector] = c.pct_change(252) if c is not None else None

    data = scan.fetch_history(tickers, period="2y")

    raw = []
    for tkr in tickers:
        close = scan.series_for(data, tkr, "Close")
        high = scan.series_for(data, tkr, "High")
        low = scan.series_for(data, tkr, "Low")
        if close is None or high is None or low is None:
            continue
        if len(close) < 252 + MAX_HOLD + STEP:
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
        highs, lows, closes = high.to_numpy(), low.to_numpy(), close.to_numpy()

        n = len(close)
        start = max(252, n - TEST_DAYS - MAX_HOLD)
        for k in range(start, n - MAX_HOLD, STEP):
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
            a = atr.iloc[k]
            if pd.isna(a):
                continue
            raw.append({
                "ticker": tkr, "date": idx[k].strftime("%Y-%m-%d"), "sector": sector,
                "entry": price, "atr": float(a), "s20": float(s20),
                "fwd_high": highs[k + 1:k + MAX_HOLD + 1].tolist(),
                "fwd_low": lows[k + 1:k + MAX_HOLD + 1].tolist(),
                "fwd_close": closes[k + 1:k + MAX_HOLD + 1].tolist(),
            })
    return raw


def evaluate(raw: list[dict], rr: float, atr_mult: float, hold: int) -> dict:
    """Apply one exit configuration (target, stop multiple, hold) to the signals."""
    trades = []
    for s in raw:
        price = s["entry"]
        # Same stop rule as the live sizer, with the swept ATR multiple and cap.
        stop = min(s["s20"] * (1 - scan.STOP_BUFFER), price - atr_mult * s["atr"],
                   price * 0.995)
        stop = max(stop, price * (1 - scan.STOP_CAP))
        stop_dist = (price - stop) / price
        if stop_dist <= 0:
            continue
        target = price * (1 + rr * stop_dist)
        # Forward walk: first touch of stop or target wins; else mark to market.
        outcome, exit_px, days = "open", s["fwd_close"][hold - 1], hold
        for j in range(hold):
            if s["fwd_low"][j] <= stop:            # stop checked first (worst case)
                outcome, exit_px, days = "stop", stop, j + 1
                break
            if s["fwd_high"][j] >= target:
                outcome, exit_px, days = "target", target, j + 1
                break
        trades.append({
            "ticker": s["ticker"], "date": s["date"], "sector": s["sector"],
            "entry": round(price, 2), "stop_pct": round(stop_dist * 100, 2),
            "outcome": outcome, "days_held": days,
            "return_pct": round((exit_px / price - 1) * 100, 2),
            "r_multiple": round((exit_px / price - 1) / stop_dist, 2),
        })
    return summarize(trades, {"hold_days": hold, "step": STEP, "test_days": TEST_DAYS,
                              "reward_risk": rr, "leader_multiple": scan.LEADER_MULTIPLE,
                              "atr_mult": atr_mult})


def summarize(signals: list[dict], params: dict) -> dict:
    if not signals:
        return {"signals": 0, "params": params}
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
        "params": params,
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


def sweep(raw: list[dict]) -> dict:
    """Evaluate every (target, ATR stop, hold) combination on the same signals."""
    rows = []
    for hold in GRID_HOLD:
        for atr_mult in GRID_ATR:
            for rr in GRID_RR:
                r = evaluate(raw, rr, atr_mult, hold)
                rows.append({
                    "reward_risk": rr, "atr_mult": atr_mult, "hold_days": hold,
                    "signals": r["signals"],
                    "win_rate_pct": r["win_rate_pct"],
                    "expectancy_r": r["expectancy_r"],
                    "avg_return_pct": r["avg_return_pct"],
                    "target_hit_pct": r["target_hit_pct"],
                    "stopped_out_pct": r["stopped_out_pct"],
                })
    rows.sort(key=lambda x: (x["expectancy_r"] is None, -(x["expectancy_r"] or 0)))
    canonical = (RR, scan.ATR_MULT, HOLD)
    return {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "grid": {"reward_risk": GRID_RR, "atr_mult": GRID_ATR, "hold_days": GRID_HOLD},
        "canonical": {"reward_risk": RR, "atr_mult": scan.ATR_MULT, "hold_days": HOLD},
        "best": rows[0] if rows else None,
        "results": rows,
    }


def render_sweep_md(s: dict) -> str:
    if not s or not s.get("results"):
        return "# Backtest sweep\n\nNo results.\n"
    best, canon = s["best"], s["canonical"]
    lines = [
        "# Exit-parameter sweep",
        "",
        f"_Generated {s['generated_at']}_",
        "",
        "> Same signals, different exits. **Risk % is not swept** — it scales dollar "
        "exposure, not the per-trade R outcome. Same caveats as the backtest "
        "(survivorship bias, no costs); read these as relative comparisons, not "
        "absolute promises.",
        "",
        f"**Best expectancy:** {best['reward_risk']}R target / {best['atr_mult']}× ATR "
        f"stop / {best['hold_days']}d hold → **{best['expectancy_r']}R** "
        f"({best['win_rate_pct']}% win, {best['signals']} signals).",
        f"**Canonical (live):** {canon['reward_risk']}R / {canon['atr_mult']}× / "
        f"{canon['hold_days']}d.",
        "",
        "| Target | ATR× | Hold | Signals | Win % | Expectancy R | Avg % | Tgt % | Stop % |",
        "|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in s["results"]:
        mark = " ⭐" if (r["reward_risk"], r["atr_mult"], r["hold_days"]) == \
            (canon["reward_risk"], canon["atr_mult"], canon["hold_days"]) else ""
        lines.append(
            f"| {r['reward_risk']}R{mark} | {r['atr_mult']} | {r['hold_days']} | "
            f"{r['signals']} | {r['win_rate_pct']} | **{r['expectancy_r']}** | "
            f"{r['avg_return_pct']} | {r['target_hit_pct']} | {r['stopped_out_pct']} |")
    lines += ["", "_⭐ = the configuration the live screen/sizer currently uses._", ""]
    return "\n".join(lines) + "\n"


def main() -> int:
    raw = collect_signals()
    # Canonical single-config report (unchanged outputs).
    result = evaluate(raw, RR, scan.ATR_MULT, HOLD) if raw else {"signals": 0}
    (scan.ROOT / "backtest.json").write_text(json.dumps(result, indent=2))
    (scan.ROOT / "backtest.md").write_text(render_md(result))
    # Exit-parameter sweep.
    sw = sweep(raw)
    (scan.ROOT / "sweep.json").write_text(json.dumps(sw, indent=2))
    (scan.ROOT / "sweep.md").write_text(render_sweep_md(sw))
    if result.get("signals"):
        b = sw["best"]
        print(f"backtest: {result['signals']} signals, win rate "
              f"{result['win_rate_pct']}%, expectancy {result['expectancy_r']}R | "
              f"best sweep {b['reward_risk']}R/{b['atr_mult']}x/{b['hold_days']}d "
              f"= {b['expectancy_r']}R", file=sys.stderr)
    else:
        print("backtest: no signals", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
