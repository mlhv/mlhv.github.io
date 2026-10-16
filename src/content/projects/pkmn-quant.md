---
title: "Pkmn-Quant - Algorithmic Trading Backtester"
description: "Built an event-driven backtester over a 3M-row Parquet price warehouse with T+1 fills, 12.75% fees, and tiered liquidity caps, enabling all 5 strategies to generate live daily trade signals with zero code changes."
techStack: ["Python","Polars","C++","scikit-learn","DuckDB"]
featured: false
order: 1
---

- Built an event-driven backtester over a 3M-row Parquet price warehouse with T+1 fills, 12.75% fees, and tiered liquidity caps, enabling all 5 strategies to generate live daily trade signals with zero code changes.
- Trained a gradient-boosted model to rank assets by predicted forward returns with no look-ahead bias, posting a +6.0% out-of-sample return that beat 3 of 4 hand-built strategies under 11-fold walk-forward analysis.
- Profiled and rewrote the engine's per-day pricing hot path, cutting backtest runtime 1.9x (3.8s to 2.0s) with zero behavior drift, verified byte-identical by golden regression tests in a 267-test CI suite.
