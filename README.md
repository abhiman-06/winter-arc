# Winter Arc

A dark, offline-first tracker for a **one-year arc**: daily habits on a month grid,
a weekly task board with a mindset tracker, 1-year goals across ten areas of life,
and an insights page that shows whether you're actually holding the line.

No accounts, no server, no build step. Everything lives in your browser.

---

## Three ways to run it

### 1. As a website on your PC
Double-click **`start.cmd`** — it starts a local server and opens
<http://localhost:4173>. (Or `npm start` if you prefer a terminal.)

### 2. As an installed app
Run it as above, then in Chrome or Edge click the **install icon** in the address
bar (or ⋯ → *Apps* → *Install this site as an app*). It gets its own window, its
own icon, and works offline.

### 3. As one file you can email to a friend
```
npm run build
```
This writes **`dist/winter-arc.html`** — a single ~125 KB file with all the CSS,
JavaScript and icons inlined. Send it over WhatsApp, email, a USB stick, anything.
Your friend double-clicks it and the app runs. No install, no internet, no Node.

> Their data is theirs — a copy of the file starts empty, it doesn't carry yours.

---

## The five pages

| Page | What it's for |
|---|---|
| **Today** | The daily check-in: completion ring, every habit, today's tasks, freeze tokens. |
| **Habits** | The month grid — one row per habit, one circle per day. The heart of the app. |
| **Tasks** | A week at a time: tasks per day, plus Energy / Focus / Motivation tracking. |
| **Goals** | Your 1-year goals, grouped by area of life, with milestones and days left. |
| **Insights** | Consistency over time, habit leaderboard, streaks, and a month-by-month bar. |

Press **1–5** to jump between pages. Press **N** on Habits or Goals to add one.

---

## How tracking works

**Habits** come in three cadences:
- *Daily* — do it every day.
- *Weekly* — a target like "Gym 5× per week". It counts as met once you hit 5.
- *Monthly* — same idea over a calendar month.

On the Habits grid, **click a circle** to mark the day, **right-click** it to spend
a freeze token, and **click a habit's name** to edit or delete it.

**Freeze tokens** protect a streak on a day you genuinely couldn't show up. The
streak survives, but the day isn't counted as completed in your percentages — so
your consistency number stays honest. You start with 9; adjust them in Settings.

**Streaks** count consecutive days (or weeks/months for periodic habits). Not having
ticked *today* yet never breaks a streak — only a missed past day does.

**Goals** are measured either by **milestones** (a checklist) or by **a number**
("read 24 books"). Checking off the last milestone, or reaching the number, marks
the goal achieved on its own. Pin a goal to put it in **Top priorities**.

**The arc** is your one-year window. Set its start date and length in Settings; every
"days left" figure and the month-by-month chart follow from it.

---

## Your data

Everything is stored in your own browser (`localStorage`) under the key
`winterArc.v1`. Nothing is ever sent anywhere.

That also means it's tied to **that browser on that machine**. To move it, or to keep
a safety copy:

- **Settings (⚙, top right) → Export backup** — downloads a `.json` file.
- **Settings → Import backup** — loads one back, on any device.

Worth exporting now and then. Clearing your browser's site data will wipe it.

---

## Project layout

```
index.html              app shell and page chrome
css/style.css           design tokens + every component
js/store.js             state, persistence, date maths, streaks and rates
js/charts.js            SVG charts (ring, sparkline, area, multi-line)
js/ui.js                icons, modal, toast
js/views/*.js           one file per page
sw.js                   service worker — offline + installable
manifest.webmanifest    PWA metadata
tools/build.js          bundles everything into dist/winter-arc.html
tools/make-icons.js     regenerates the PNG app icons
tools/test-store.js     34 tests over the tracking maths
```

Run the tests with `npm test`.

### Changing things

The whole look is driven by CSS custom properties at the top of `css/style.css` —
change `--accent` and the entire app re-themes. There's a light theme in Settings too.

The chart series colours (`--series-1` … `--series-8`) are a deliberately chosen set:
they sit in a lightness band that reads on the dark surface and stay distinguishable
under colour-blindness. If you swap them, keep that in mind.

After editing any file, re-run `npm run build` to refresh the single-file copy, and
bump `CACHE` in `sw.js` so installed copies pick up the change.
