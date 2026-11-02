# Plan: Music Studio One-Pager

## Goal
A single-page, brutalist website for a music studio that shows the space (4 photos), what it costs, and when it's open.

## Scope
**In:** hero/name, 4 photo assets, pricing, hours/times, contact line (email or booking link).
**Out:** blog, login, booking engine, CMS, multi-page nav, analytics.

## Stack
Plain static HTML + CSS (no framework, no build step). One `index.html`, one `styles.css`. Deploy free via GitHub Pages (or Vercel/Netlify).

## Page structure (top to bottom)
1. **Header block** – studio name in huge type, one-line descriptor, link anchors (Photos / Pricing / Hours).
2. **Photo grid** – 4 photos (see below), hard-edged, thick borders, no rounding or shadows.
3. **Pricing** – table: session type, rate, notes (e.g. hourly, half-day, full-day, mixing/mastering). Placeholder numbers until provided.
4. **Hours / Times** – table of weekdays and open times; note on after-hours/by-appointment.
5. **Contact footer** – email / booking link, address.

## Four photo assets
| # | Subject | Notes |
|---|---------|-------|
| 1 | Control room | Console/desk wide shot |
| 2 | Live room | Main tracking space |
| 3 | Gear/detail | Mics, outboard, instruments |
| 4 | Exterior / vibe | Entrance or people at work |

Save as optimized JPG/WebP in `assets/` (max ~1600px wide, <300KB each), with alt text. Use black-and-white or high-contrast treatment via CSS if photos are inconsistent.

## Brutalist design direction
- Monospace or heavy grotesque type (e.g. Space Mono, Archivo Black), oversized headings.
- Palette: black, white, one harsh accent (e.g. #FF3B00 or acid yellow).
- 3–4px solid black borders, visible grid, zero border-radius, no gradients/shadows.
- Raw tables for pricing/hours; uppercase labels; deliberate asymmetry.
- Responsive: grid collapses to one column on mobile; keep contrast AA.

## Milestones
1. Repo + plan (this commit).
2. Skeleton `index.html` + `styles.css` with placeholder content/images.
3. Real photos, copy, prices, and hours supplied by owner.
4. Responsive + accessibility pass (alt text, contrast, Lighthouse).
5. Deploy to GitHub Pages and (optionally) attach custom domain.

## Open questions
- Studio name, location, and contact method?
- Actual pricing tiers and hours?
- Do photos already exist, or are they to be shot / sourced?
- Accent color preference?
