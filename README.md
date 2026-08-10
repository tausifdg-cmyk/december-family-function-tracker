# December Family Function Tracker

Offline-first PWA for a 12-week body-recomposition plan leading into the December family function.

## Current MVP
- iPhone-friendly responsive dashboard
- Current weight, goal weight and progress tracking
- Daily habit check-ins for workout, protein, water and sleep
- Weight history with lightweight trend chart
- Workout checklist and completion logging
- Nutrition targets
- Dark/light mode
- LocalStorage persistence
- Service worker offline caching
- PWA manifest and SVG icons
- Data-driven 12-week plan engine
- Weekly target weight shown on the dashboard

## Starting profile
- Start weight: 89 kg
- Target weight: 78 kg
- Target date: 3 December 2026
- Focus: fat loss + lean muscle + strength
- Daily calories: 2,250–2,400 kcal
- Daily protein: 170–180 g
- Water: 3.5–4 L
- Training: 5 sessions/week

## Plan engine
`data/plan.json` contains the configurable plan profile and phases. `plan.js` generates all 12 weekly targets locally and exposes helpers for the current week and progress status. No network connection is required.

## Run locally
Serve the repository with any static HTTP server. Opening `index.html` directly will show the UI, but service-worker installation requires HTTP/HTTPS.

## Roadmap
1. Nutrition engine with Indian-food database and meal logging
2. Body measurements and progress photos
3. Strength progression and workout analytics
4. Plateau detection and rule-based coaching
5. Optional AI coach
6. Apple Health integration where supported
7. Optional cloud backup/authentication
8. Automated tests and GitHub Pages deployment

All health/fitness values are user-entered estimates and should not be treated as medical advice.
