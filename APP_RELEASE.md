# HaoSuan App Release Notes

Last repaired: 2026-05-25.

Purpose: readable release checklist for the HaoSuan Capacitor app. Keep this file ASCII-safe.

## Release Model

- Web release: deploy from `main` after web gates pass.
- App release: tag a tested commit, then build/sync native shells.
- Do not publish to app stores until production domain, canonical URLs, app icons, screenshots, and store metadata are final.

## Required Gates

Run from the repo root:

```bash
npm run lint
npm run typecheck
npm run build
npm run build:app
```

Expected current behavior:

- `npm run build` should produce the web build.
- `npm run build:app` should use `BUILD_TARGET=app` for the Capacitor/static app path.
- Known dependency state: no high/critical advisories; known moderate Next/PostCSS advisory remains until upstream fix or approved strategy.

## Android Local Build Flow

```bash
npm run build:app
npx cap sync android
npx cap open android
```

Then build/sign in Android Studio.

Minimum local requirements:

- Android Studio
- JDK 17+
- Android signing key configured outside git

## iOS Local Build Flow

```bash
npm run build:app
npx cap sync ios
npx cap open ios
```

Minimum local requirements:

- macOS
- Xcode
- Apple Developer account
- iOS signing profile configured outside git

## Tagging Flow

Only tag after the required gates pass and release metadata is ready:

```bash
git checkout main
git pull
git tag v1.0.0
git push origin v1.0.0
```

Heartbeat must not push tags or publish builds.

## Pre-Release Checklist

- [ ] Production domain confirmed.
- [ ] Canonical URL config confirmed.
- [ ] LINE/free-template destination confirmed.
- [ ] App name, icon, splash screen, and screenshots confirmed.
- [ ] Privacy policy/support URL ready for store listing.
- [ ] Android signing material exists outside git.
- [ ] iOS signing material exists outside git, if releasing iOS.
- [ ] Final smoke test on web and app build completed.
