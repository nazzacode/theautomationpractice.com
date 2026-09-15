---
title: "Site"
type: docs
tags: [site]
---
# theautomationpractice.com — v1

One page. One job: **book a call**. Static HTML/CSS/JS, no build step, no dependencies.

## Run

```bash
cd site && python3 -m http.server 8000   # → localhost:8000
```

## Deploy

Drop the folder on any static host — Cloudflare Pages, Netlify, GitHub Pages. No build command, no output dir. Point `theautomationpractice.com` at it.

## Files

| Path | What |
| --- | --- |
| `index.html` | The whole page. All copy lives here |
| `css/site.css` | Tokens → base → components → sections. Palettes + dark mode at the top |
| `js/diagrams.js` | The three SVG diagrams, hand-built |
| `js/site.js` | Reveals, theme, before/after toggle, variant switcher. **`BOOKING_URL` is at the top** |
| `fonts/` | Newsreader + Inter, self-hosted (no Google CDN call — one less third party on a page selling data safety) |

## The thesis

**Look expensive. Read simple.** The buyer is Margaret, 58, running a 14-person accountancy practice — jargon-averse, trust-first, has tried ChatGPT once. So the *design* does the status signalling (editorial serif, hairline rules, deep green, a lot of air) and the *copy* stays plain. AlgoSoup and friends sell "forward-deployed engineering pods" to quant funds; copying their register would actively lose this reader.

Everything on the page traces to `docs/offer.md`, `docs/services.md` and `wiki/offer-brief.md`. Nothing is invented.

## Page order

`Hero → 01 Problem → 02 What we do → 03 How it works → 04 Results → 05 Who it's for → 06 Your data → 07 Founder → Book`

Two deliberate choices:

* **06 Your data** exists because "the free tools train on what you upload" is the real reason firms stop. Answering it straight is the cheapest trust we can buy.
* **Three rungs to convert**, not one: book a call, the phone number, the email. A single high-commitment CTA loses everyone who's curious but not ready.

## Diagrams

| Id | Where | Shows |
| --- | --- | --- |
| `dg-flow` | Hero | Email/records/documents → set up properly → done. Wide on desktop, vertical under 640px |
| `dg-ba` | 01 | 6,000 names checked by hand (7s of tedium) vs automated (11 flagged, seconds). The toggle is the point |
| `dg-fan` | 02 | Audit fanning into the three pillar cards. Measured from real DOM positions, so it stays aligned at any width |

The four-step timeline in 03 is CSS on the step cards, not a separate diagram — an earlier version duplicated every label.

Diagrams render their *finished* state first and animate from it, so a stalled observer or a JS failure never leaves a blank. Same for `.rv` reveals: visible by default, hidden only once `html.js` is set.

## Screenshots

`screenshots/` — `desktop-*` (1280px), `mobile-*` (390px), `variant-*` (the swap-ins). A snapshot for review, not a test fixture; they go stale the moment the page changes. Regenerate by running the site and capturing, or just open it.

## Variants

Swap without touching code — add to the URL, or press **V** for a live switcher.

| Knob | Options | Default |
| --- | --- | --- |
| `?hero=` | `a` split · `b` centred · `c` editorial | `a` |
| `?palette=` | `forest` · `ink` (mono) · `slate` (blue) | `forest` |
| `?theme=` | `system` · `light` · `dark` | `system` |

Shareable: `/?hero=b&palette=slate`. To make one permanent, edit the attributes in `index.html` — `<html data-palette="…">` and `<body data-hero="…">`.

## Before it goes live

* [ ] **Booking link** — set `BOOKING_URL` in `js/site.js` (Cal.com / Calendly). Until then every "Book a call" falls through to the phone
* [ ] **Photo of Nathan** — replace the `NS` placeholder in the founder block (markup is commented in place)
* [ ] **Testimonial** — slot is commented in `04 Results`, deliberately empty. `services.md` has it as still to develop. Don't invent one
* [ ] **Pricing** — the FAQ says "fixed price, told on the first call". Put a number in once it exists
* [ ] `og-image.png` for link previews, and analytics if wanted

## Known limits

* No mobile nav menu — one page, and the header CTA is always there
* Both case studies are the same chambers. Copy says so; add a second client when there is one
