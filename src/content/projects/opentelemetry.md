---
title: "OpenTelemetry (Open Source Contributor)"
description: "Introduced a new OTLP Logs export pipeline for an eBPF-based Go/C auto-instrumentation agent, extracting kernel-level request timings to correlate natively with parent traces via shared span IDs."
techStack: ["Go","C","eBPF","OTLP","Docker"]
featured: false
order: 2
---

- Introduced a new OTLP Logs export pipeline for an eBPF-based Go/C auto-instrumentation agent, extracting kernel-level request timings to correlate natively with parent traces via shared span IDs.
- Implemented an opt-in configuration toggle that consolidates 3 verbose sibling spans into 1 unified log record, reducing trace export volume by 66% while maintaining 100% backward compatibility.
