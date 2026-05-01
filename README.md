# Job Fit Analyzer

A self-contained browser tool for scoring job listings against your personal values profile. Designed as a coaching exercise — you define what matters to you, then objectively evaluate how well a job ad matches.

**Live demo:** Open `index.html` in any browser. No server required.

## How it works

1. **Set your profile** — Adjust 10 sliders to define your ideal on each dimension. Mark each as **Must**, **Nice**, or **Skip** to weight it in the fit calculation.
2. **Analyze a job ad** — Paste a URL or full description. The LLM extracts the job details and scores it on the same 10 axes.
3. **Compare visually** — Your profile and all analyzed jobs render on a shared radar chart. Toggle jobs on/off, delete ones you're done with.

The **fit score** is calculated deterministically: it measures how close the job's scores are to your ideal, weighted by Must/Nice/Skip. No AI involved in the scoring itself — the LLM only reads the job ad and produces dimension scores.

## The 10 Dimensions

Aligned with the **Desert Island Test** values exercise:

| Axis | 1 (Low) | 5 (High) |
|------|---------|----------|
| **Salary** | Below market | Top of market |
| **Tech Growth** | No learning path | Strong growth trajectory |
| **Impact** | Cog in a machine | Significant ownership & influence |
| **Team Culture** | Red flags / toxic | Great team culture signals |
| **Autonomy** | Micro-managed / rigid | High autonomy / flexible |
| **Mission** | Actively harmful to society | Strong positive mission |
| **Stability** | Very risky / short-term | Very secure / permanent |
| **Location** | Strict on-site | Fully remote / location-independent |
| **Brand** | Unknown | Top-tier recognizable brand |
| **Leadership** | No management path | Clear leadership track |

## Features

- **Radar chart** — Canvas-based, renders your profile as a filled polygon with all jobs overlaid
- **LLM analysis** — Streams the response in real-time (supports thinking/reasoning tokens). Falls back to non-streaming if the API doesn't support SSE
- **Fit calculation** — Deterministic, recalculated live on every change. Must = full weight, Nice = 60%, Skip = 20%
- **Job cards** — Show title, company, location, salary, company size, summary, and fit score. Toggle visibility or delete
- **Home location** — Optional. Set manually or auto-detect via browser geolocation (reverse-geocoded through OpenStreetMap). Included in the LLM prompt for commute-aware location scoring
- **Persistent storage** — Everything saved to `localStorage` (namespace `jfa-`). Survives reloads

## Setup

1. Open `index.html`
2. Expand **LLM API Config** at the bottom of the right panel
3. Enter your API URL (any OpenAI-compatible endpoint), key, and model name
4. Optionally set your home location

Works with OpenAI, GLM, DeepSeek, Together, Groq, or any OpenAI-compatible chat completions API.

## Tech

- Vanilla HTML/CSS/JS, zero dependencies
- Canvas 2D for the radar chart
- Fetch API with ReadableStream for SSE streaming
- `localStorage` for persistence
- Works offline once loaded

## License

MIT
