# HaoSuan Progress

Last repaired: 2026-05-25.

Purpose: readable progress summary for HaoSuan. Keep this file ASCII-safe.

## Summary

- Project started around 2026-03-16.
- Current product: 30 calculator pages, SEO routes, PWA support, and Capacitor app setup.
- Current launch direction: validate traffic and acquisition before expanding the calculator catalog.

## Platform Completed

- [x] Next.js app scaffold.
- [x] Shared layout, header/footer, breadcrumbs, and calculator layout.
- [x] Calculator registry.
- [x] Sitemap and robots routes.
- [x] PWA manifest and service worker registration.
- [x] Capacitor configuration.
- [x] Web/app build split through `BUILD_TARGET=app`.

## Pages Completed

### Life

- [x] BMI: `/life/bmi`
- [x] Age: `/life/age`
- [x] Date difference: `/life/date-diff`
- [x] Electricity: `/life/electricity`
- [x] Sleep: `/life/sleep`
- [x] Calories: `/life/calories`
- [x] Pregnancy: `/life/pregnancy`
- [x] Fuel cost: `/life/fuel-cost`

### Finance

- [x] Mortgage: `/finance/mortgage`
- [x] Exchange rate: `/finance/exchange-rate`
- [x] Income tax: `/finance/income-tax`
- [x] Compound interest: `/finance/compound-interest`
- [x] Overtime: `/finance/overtime`
- [x] Invoice tax: `/finance/invoice-tax`
- [x] Deposit interest: `/finance/deposit-interest`
- [x] Retirement: `/finance/retirement`
- [x] Insurance: `/finance/insurance`
- [x] Stamp duty: `/finance/stamp-duty`
- [x] Car depreciation: `/finance/car-depreciation`

### Renovation

- [x] Paint: `/renovation/paint`
- [x] Tile: `/renovation/tile`
- [x] AC BTU: `/renovation/ac-btu`

### Convert

- [x] Area: `/convert/area`
- [x] Length: `/convert/length`
- [x] Weight: `/convert/weight`
- [x] Temperature: `/convert/temperature`
- [x] Volume: `/convert/volume`
- [x] Data speed: `/convert/data-speed`

### Math/Text

- [x] Percentage: `/math/percentage`
- [x] Word count: `/math/word-count`

## Acquisition/SEO Pages

- [x] Free template landing: `/free-template`
- [x] LINE template redirect/support page: `/go/line-template`
- [x] Freelance pricing guide: `/guides/freelance-pricing`
- [x] Freelance pricing template: `/templates/freelance-pricing`

## Recent Verification

- 2026-05-24: `npm run build:app` passed.
- 2026-05-24: JSON-LD serialization was hardened and `npm run lint` plus `npm run build` passed.
- 2026-05-25: `npm run typecheck` passed.

## Open Launch Items

- [ ] Confirm production domain and canonical URLs.
- [ ] Confirm real LINE/free-template destination URL.
- [ ] Decide Next/PostCSS advisory strategy.
- [ ] Run final production preview smoke test.
- [ ] Confirm app store metadata before native app release.
