# Kingdom Simulator (HTML Edition)

A browser-based kingdom management game built for static hosting, and save files stored in the browser.

---

## Contents

* [Overview](#overview)
* [Core Features](#core-features)
* [Gameplay Loop](#gameplay-loop)
* [Tech Stack](#tech-stack)
* [Repository Structure](#repository-structure)
* [Getting Started](#getting-started)
* [Build and Deploy](#build-and-deploy)
* [Game Data and Save Schema](#game-data-and-save-schema)
* [UI and Accessibility](#ui-and-accessibility)
* [Keyboard Shortcuts](#keyboard-shortcuts)
* [Testing](#testing)
* [Roadmap](#roadmap)
* [Contributing](#contributing)
* [Code Style](#code-style)
* [Licence](#licence)
* [Credits](#credits)

---

## Overview

Lead a small kingdom and push it through the ages. Manage population, money, food, happiness, and power creep without letting the whole thing collapse. Fight for coins, buy gear, pass policies, and handle random events. It is designed for quick sessions and itch.io style deployment.

---

## Core Features

* Day system with random events, flavour text by era, and policy upkeep.
* Resources: money, food, people, happiness, strength.
* Inventory: potions and food, weapon progression by era.
* Shop with tabs for potions, food, and weapons with lock rules.
* Policies with unlocks, toggles, and upkeep effects.
* Travelling merchant with discounts based on relationship.
* Fights with three difficulties, potions, and simple tactics.
* Log with colour tags for event types.
* Save and load in browser storage with optional export and import.

---

## Gameplay Loop

1. Sleep to advance a day and resolve events.
2. Spend or earn: tax, pay, shop, or fight.
3. Manage happiness and food to keep people alive.
4. Expand to push into the next era and raise caps.
5. Use the merchant and policies to smooth bad RNG.
6. Repeat until your ruler reaches their final day.

---

## Tech Stack

* TypeScript, Vite
* UI: React with Tailwind CSS
* State: Zustand (single store, serialisable)
* Router: None. Single page with internal panels
* Testing: Vitest, React Testing Library
* Linting and format: ESLint, Prettier

If you prefer no framework, the codebase can be adapted to vanilla JS. Structure below still applies.

---

## Repository Structure

```
.
├─ public/                     Static files
├─ src/
│  ├─ app/                     App shell, theme, providers
│  ├─ game/
│  │  ├─ state/                Zustand store, slices
│  │  ├─ systems/              Day cycle, events, combat, merchant, policies
│  │  ├─ data/                 Weapons, potions, food, eras, constants
│  │  └─ save/                 Save load, schema, migrations
│  ├─ ui/
│  │  ├─ panels/               Main panels: Actions, Log, Inventory, Shop, Policies
│  │  ├─ fight/                Fight overlay
│  │  ├─ components/           Buttons, cards, badges, bars, toasts
│  │  └─ styles/               Tailwind config helpers
│  ├─ utils/                   Random, clamp, typing helpers
│  ├─ assets/                  Optional icons as inline svg
│  └─ main.tsx                 Entry point
├─ tests/                      Unit and UI tests
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tailwind.config.js
└─ README.md
```

---

## Getting Started

Prerequisites: Node 18 or later.

```bash
git clone <your-repo-url> kingdom-simulator-html
cd kingdom-simulator-html
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Build and Deploy

Create a production build:

```bash
npm run build
```

Static output is in `dist/`.

Deploy options:

* Itch.io: zip the `dist` folder contents and upload as an HTML5 game.
* GitHub Pages: push `dist` to `gh-pages` branch or use an action.
* Any static host: serve `dist` as-is.

---

## Game Data and Save Schema

All state is serialisable. Saves are stored in `localStorage` under a single key. Users can export and import JSON.

### Save Schema (current)

```json
{
  "version": 1,
  "name": "kingdom name",
  "day": 1,
  "death_day": 120,
  "era": "Stone Age",
  "money": 999990,
  "exmoney": 5000,
  "people": 50,
  "maxpeople": 50,
  "happiness": 50,
  "strength": 3,
  "maxstrength": 3,
  "inventory": {
    "hpotion": 0, "dpotion": 0, "mpotion": 0, "spotion": 0,
    "lightning_potion": 0, "sleep_potion": 0, "poison_potion": 0,
    "bread": 10, "meat": 0, "fruit": 0, "cheese": 0
  },
  "combat": {
    "currentSword": "None",
    "minDmg": 5,
    "maxDmg": 15,
    "wfight": 0,
    "lfight": 0
  },
  "policies": {
    "Universal Tax": {"locked": true, "active": false},
    "Charity Relief": {"locked": true, "active": false},
    "Royal Festival": {"locked": true, "active": false},
    "Food Rationing": {"locked": true, "active": false},
    "Open Borders": {"locked": true, "active": false},
    "Public Health": {"locked": true, "active": false},
    "Work Tax Rebate": {"locked": true, "active": false},
    "Electric Welfare": {"locked": true, "active": false}
  },
  "merchant": {
    "relationship": 0,
    "weaponLog": {}
  },
  "ownedWeapon": {
    "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0
  }
}
```

### Versioning and migrations

* `version` increments when schema changes.
* `load()` checks the version and runs small migration steps to ensure backward compatibility.

---

## UI and Accessibility

* Theme toggle: dark and light.
* Scalable text: base size adjustable and saved in preferences.
* High contrast colours for tagged log lines: good, warn, danger, system, merchant, muted.
* Keyboard accessible. All core actions are reachable with shortcuts.
* No modal pop ups. Overlays are in-page with focus trapping.

---

## Keyboard Shortcuts

| Action               | Key    |
| -------------------- | ------ |
| Save                 | F2     |
| Sleep                | F5     |
| Inventory            | Ctrl+I |
| Shop                 | Ctrl+S |
| Policies             | Ctrl+P |
| Fight                | F      |
| Fight actions 1 to 6 | 1..6   |
| Theme toggle         | T      |

All keys are configurable in a simple JSON file in `src/app`.

---

## Testing

* Unit tests for systems: day cycle, events, merchant, policies, combat maths.
* Store tests: selectors and reducers are pure and deterministic.
* UI tests for main flows: start, save, sleep, buy, fight.
* Run tests:

```bash
npm run test
```

---

## Roadmap

### Phase 1: Port and parity

* Core state slices for resources, inventory, policies, combat.
* Log panel with tags and filters.
* Shop and inventory panels.
* Merchant offers and discounts.
* Fight overlay.

### Phase 2: UX polish

* Settings panel: autosave cadence, font scale, keybinds.
* Export and import save file.
* Animated toasts and better feedback on errors.
* Small tutorials on first open.

### Phase 3: Content and balance

* More events per era and soft pity to avoid bad streaks.
* New policies with clear costs and benefits.
* Additional weapons in Electric and Modern ages.
* Optional daily challenges.

---

## Contributing

1. Create an issue describing the change.
2. Fork and branch from `main`.
3. Write tests for logic changes.
4. Run `npm run lint` and `npm run test`.
5. Make a pull request with a clear summary and screenshots where relevant.

Bug reports should include:

* Steps to reproduce
* Expected result
* Actual result
* Browser and OS

---

## Code Style

* TypeScript strict mode.
* ESLint and Prettier enforced on commit with Husky.
* Folder by feature, not by layer.
* No magical numbers. Use constants in `src/game/data`.
* All game logic in `src/game`. UI should call pure functions or store actions.

Commit convention: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`).

---

## Licence

TBD. Add your chosen licence file. MIT is recommended for open source. If this is proprietary, state that clearly.

---

## Credits

Design and development by NJ.
HTML port and documentation support by assistant.
No external assets required. Icons are inline SVG.

---

### Developer Notes

* Keep everything serialisable. Avoid storing live class instances in the state.
* Randomness is central to events. Wrap RNG to allow seeding in tests.
* itch.io upload expects a zipped `dist` root with `index.html` at the top level.
