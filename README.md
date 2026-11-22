<a id="readme-top"></a>

[![Version 2.3](https://img.shields.io/badge/version-2.3-eef1f6?labelColor=0d1017)](https://github.com/shreyandhawa/arohexis)
[![Installable PWA, works offline](https://img.shields.io/badge/PWA-works%20offline-eef1f6?labelColor=0d1017)](https://arohexis.arohexis.workers.dev/welcome)
[![Data on your device](https://img.shields.io/badge/data-on%20your%20device-eef1f6?labelColor=0d1017)](#about-the-project)
[![No tracking](https://img.shields.io/badge/tracking-none-eef1f6?labelColor=0d1017)](#about-the-project)
[![Issues](https://img.shields.io/github/issues/shreyandhawa/arohexis?labelColor=0d1017&color=eef1f6)](https://github.com/shreyandhawa/arohexis/issues)
[![Last commit](https://img.shields.io/github/last-commit/shreyandhawa/arohexis?labelColor=0d1017&color=eef1f6)](https://github.com/shreyandhawa/arohexis/commits/main)

<br />
<div align="center">
  <a href="https://github.com/shreyandhawa/arohexis">
    <img src="docs/media/logo.png" alt="Arohexis logo: a brain with every region lit by lines of starts" width="160" height="160">
  </a>

<h3 align="center">Arohexis</h3>

  <p align="center">
    A local-first app that trains the moment of starting.
    <br />
    <a href="docs/spec.md"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://arohexis.arohexis.workers.dev/welcome">View Demo</a>
    &middot;
    <a href="https://github.com/shreyandhawa/arohexis/issues/new?labels=bug">Report Bug</a>
    &middot;
    <a href="https://github.com/shreyandhawa/arohexis/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#architecture">Architecture</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

## About The Project

GitHub: [github.com/shreyandhawa/arohexis](https://github.com/shreyandhawa/arohexis)

[![Arohexis Home on a laptop, labelled: Brain space, starts and lines, turn and zoom, your parts, Still, the part card, Light a line, this week, and the main navigation](docs/media/anatomy.png)](https://arohexis.arohexis.workers.dev/welcome)

Arohexis is an installable web app for people who put things off. It has no task list. It helps with one moment: the start. When you're stuck, you tap Light a line, name what you're feeling, and take a two-minute first step. Each start lights a line in a picture shaped like a brain.

Here's why:

- Starting is the hard part, so the app trains that one moment and nothing else.
- You see your starts add up. Every start lights a line, and a plan's line grows thicker each time you start at its time and place. The logo above is what that looks like after weeks of steady starts.
- Your data stays on your device. There are no accounts, no tracking and no requests to other sites, and it works offline.

Arohexis is a self-help tool, not medical advice, and it doesn't diagnose or treat any condition.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Dexie](https://img.shields.io/badge/Dexie-IndexedDB-0d1017?style=for-the-badge)](https://dexie.org/)
[![Valibot](https://img.shields.io/badge/Valibot-0d1017?style=for-the-badge)](https://valibot.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

To run a copy locally, follow these steps.

### Prerequisites

- Node 26 (the version in `.nvmrc`)
- npm

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/shreyandhawa/arohexis.git
   ```
2. Install the packages
   ```sh
   npm install
   ```
3. Start the dev server, then open the address it prints
   ```sh
   npm run dev
   ```
4. Run the tests
   ```sh
   npm test
   ```

To install it on a phone, open the app in Safari on iPhone and tap Share, then Add to Home Screen. On Android and desktop, use the browser's install option.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

|                                           1. Name your parts                                            |                                        2. Follow the walkthrough                                        |                                         3. Tap a part to zoom in                                          |                                    4. Start, and a line lights up                                     |
| :-----------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------: |
| <img src="docs/media/setup-phone.png" width="190" alt="Setup: name up to six parts, with idea chips" /> | <img src="docs/media/tour-phone.png" width="190" alt="The walkthrough's first card, on Light a line" /> | <img src="docs/media/part-phone.png" width="190" alt="A part zoomed in, with its card under the plate" /> | <img src="docs/media/started-phone.png" width="190" alt="Started, with the timer and the new line" /> |

1. **Name your parts.** The first time you open Arohexis, name up to six parts of your life, such as Work or Study. Each gets its own region of the picture.
2. **Follow the walkthrough.** Home shows what each control does, once. You can see it again from About.
3. **Tap a part.** The picture zooms into that part's region, and its card shows your starts, plans and what to focus on. All zooms back out.
4. **Light a line when you're stuck.** Name the feeling, read a short response, and take a two-minute first step. The new line lights up.

Still stops all motion. Replay plays your starts back in order, and Insights shows your patterns by week and hour.

Watch [the short demo](docs/media/demo.webm), or open the [live demo](https://arohexis.arohexis.workers.dev/welcome) and tap Explore the demo to see ten weeks of made-up starts. The demo uses its own database and never touches yours.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Architecture

```mermaid
flowchart LR
  domain[src/domain<br/>pure TypeScript] --> geometry[src/geometry<br/>seeded field and lines]
  geometry --> brain[src/app/brain<br/>canvas 2D renderer]
  brain --> app[src/app<br/>screens, routes, actions]
  domain --> storage[src/storage<br/>Dexie repositories]
  storage --> app
  domain --> brain
  domain --> app
  copy[src/copy] --> app
```

Arrows point from the imported layer to the one that imports it.

- `src/domain`: events, attempts and projections such as `projectBrainSpace`. Pure TypeScript with no React, storage, DOM or network.
- `src/geometry`: the seeded brain-shaped field and where each line goes.
- `src/storage`: the Dexie database in IndexedDB and its repositories.
- `src/app/brain`: the canvas 2D renderer for Brain space, loaded on demand.
- `src/app`: routes, screens and the actions that write events.
- `src/copy`: every user-facing string, checked by a test.

The full design is in [docs/spec.md](docs/spec.md), and the reasons for each decision are in [docs/decisions.md](docs/decisions.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Roadmap

- [x] Light a line: one button, a feeling, a two-minute first step
- [x] Brain space, Replay and Insights
- [x] If-then plans with Add to calendar
- [x] Every start lights a line
- [x] Setup, a Home walkthrough, and parts that zoom
- [ ] The two-week trial and its pass line ([docs/trial.md](docs/trial.md))
- [ ] Push reminders, if the trial shows the calendar cue isn't enough

See the [open issues](https://github.com/shreyandhawa/arohexis/issues) for proposed features and known issues.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

No licence file is present, so all rights are reserved.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

[@shreyandhawa](https://github.com/shreyandhawa) on GitHub

Project link: [github.com/shreyandhawa/arohexis](https://github.com/shreyandhawa/arohexis)

<p align="right">(<a href="#readme-top">back to top</a>)</p>
