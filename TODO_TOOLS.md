# HaoSuan Tool Backlog

Last repaired: 2026-05-25.

Purpose: readable backlog for HaoSuan. Keep this file ASCII-safe to avoid mojibake loops in heartbeat checks.

## Current State

- Core platform, layout, calculator shell, registry, sitemap, robots, PWA, and Capacitor setup exist.
- Live app currently exposes 30 calculator pages plus acquisition/support pages.
- Launch focus is no longer "add many calculators"; it is traffic validation, canonical URL/domain setup, and app release readiness.

## Completed Calculator Pages

### Life

- `/life/bmi`
- `/life/age`
- `/life/date-diff`
- `/life/electricity`
- `/life/sleep`
- `/life/calories`
- `/life/pregnancy`
- `/life/fuel-cost`

### Finance

- `/finance/mortgage`
- `/finance/exchange-rate`
- `/finance/income-tax`
- `/finance/compound-interest`
- `/finance/overtime`
- `/finance/invoice-tax`
- `/finance/deposit-interest`
- `/finance/retirement`
- `/finance/insurance`
- `/finance/stamp-duty`
- `/finance/car-depreciation`

### Renovation

- `/renovation/paint`
- `/renovation/tile`
- `/renovation/ac-btu`

### Convert

- `/convert/area`
- `/convert/length`
- `/convert/weight`
- `/convert/temperature`
- `/convert/volume`
- `/convert/data-speed`

### Math/Text

- `/math/percentage`
- `/math/word-count`

## Acquisition Pages

- `/free-template`
- `/go/line-template`
- `/guides/freelance-pricing`
- `/templates/freelance-pricing`

## Launch Backlog

- [ ] Confirm production domain and canonical URLs.
- [ ] Replace placeholder LINE/free-template destination with the real URL.
- [ ] Run production preview smoke test after domain and LINE URL are final.
- [ ] Decide Next/PostCSS advisory strategy: wait for stable fix, document mitigation, or test canary separately.
- [ ] Recheck app build with `npm run build:app` before Capacitor release work.
- [ ] Run `npx cap sync` only after the app build and release target are confirmed.

## Non-Blocking Ideas

- Add more calculator pages only after traffic validation shows a category worth expanding.
- Add calculator-level FAQ blocks where search intent is clear.
- Improve copy/share affordances on high-traffic calculators.
- Add app store screenshots and release notes after the release target is confirmed.
