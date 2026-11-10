# Dino Quest

A responsive educational endless runner built with HTML, CSS, and vanilla JavaScript. No build tools or runtime packages are required.

## Import from GitHub into Replit

1. Open [Replit Import](https://replit.com/import) and choose **GitHub**.
2. Connect the GitHub account that owns this repository and grant Replit access to `dino-quest` if prompted.
3. Select this repository (or paste its GitHub URL) and import it.
4. Click **Run**. The included `.replit` starts the game with `npm start` on port 3000.
5. To make the game publicly playable, use Replit’s **Publish** flow after checking the preview. The included deployment configuration also uses `npm start`.

No API keys, database setup, or npm dependencies are needed.

## Run on Replit manually

1. Upload the project files to a Node.js Replit project (including `.replit`).
2. Click **Run**, or run `npm start` in the Shell.
3. Open the web preview. The server binds to `0.0.0.0` and uses `PORT` or 3000.

For static hosting, publish the contents of `dist/`. For another local option, run `python3 -m http.server 3000 --directory dist`. Use an HTTP server, rather than double-clicking the HTML, because the JavaScript uses native modules.

## Project map

- `dist/index.html`: accessible page structure, navigation, HUD and dialogs.
- `dist/css/style.css`: responsive dark UI, touch controls and reduced-motion styles.
- `dist/js/app.js`: menus, quiz selection, input and progress display.
- `dist/js/engine.js`: fixed-step game loop, collisions, stages and power-ups.
- `dist/js/dinosaur.js`: dinosaur drawing and jump physics, adapted from the uploaded game.
- `dist/js/renderer.js`: procedural parallax landscapes, scenery and pickups.
- `dist/js/audio.js`: synthesized sound effects adapted from the uploaded game.
- `dist/js/storage.js`: resilient local progress persistence.
- `dist/data/questions.js`: 36 authored questions, Maths and Science, three difficulty tiers.
- `dist/assets/`: local artwork and fonts.
- `tests/game.test.js`: deterministic gameplay and data checks.
- `server.js`: minimal Node static server for Replit.

## Play

Space / ↑ / tap jumps. Hold ↓ or the mobile duck button to duck under birds. P / Escape pauses. Questions accept clicks, taps, or keys 1–4. Choose at least one subject before starting a run.

Immediately when the dino collides with a hurdle, gameplay freezes for a Maths or Science quiz, including mid-jump collisions. No life is deducted for the collision itself. A correct answer keeps the current lives unchanged, earns `100 × current level`, unlocks the next level, and increases speed. A wrong answer removes one life and retains the current level. Explanations appear for both outcomes. Continuing clears the track and gives a safe run-up. There is no question timer.

Worlds: Moonlit meadow (1), Amber dunes (2), Aurora valley (3), Crystal peaks (4+). Rock patterns start at level 2, birds at level 3, paired cacti at level 4. Speed grows to a capped maximum; questions progress from foundations (levels 1–2), to intermediate (3–4), to Class 8 challenge (5+). Question order and option positions are shuffled; questions do not repeat within a tier until its selected pool has been used.

Power-ups rotate through quiz shield (removes two wrong options from the next collision question), double running/obstacle points (8 seconds of active play), and a heart (up to 3 lives; +50 points if full). They spawn in gaps after every third obstacle. Only incorrect answers cost a life, exactly once per question. The shield never bypasses a question or prevents the one-life penalty for a wrong answer. Passing obstacles never triggers a quiz. After continuing, the track clears to prevent another hit from the same hurdle.

High score, highest level, sound preference and the top 10 completed runs are stored in this browser’s localStorage. The leaderboard is personal and device-local, not a shared online leaderboard. Storage failures fall back to session-only scores. No accounts, tracking, backend database, or remote game assets are needed. Sound starts only after user interaction; tab switching automatically pauses running play.

## Customize and verify

Edit question entries with unique `id`, `subject`, `difficulty` (1–3), `question`, four `options`, zero-based `answer`, and `explanation`. Add backgrounds in `WORLDS`. Tune gravity/jump in `dinosaur.js`, speed/spacing in `engine.js`, and colors in `style.css`.

Run `npm run check` for JavaScript syntax and `npm test` for gameplay checks. Browser QA should include keyboard and touch play, pause/resume, each quiz outcome, all power-ups, game over/restart, and mobile widths.

## Foundation and assets

The uploaded `index.html` (Desert Dash) is the foundation: Dino Quest preserves its Dinosaur class, pixel silhouette, jump physics, forgiving hitbox, synthesized sound class, and endless-running approach. The engine has been extended with fixed-step updates, health, quiz checkpoints and level progression. The UI and procedural world renderer are new. Original attribution and license obligations for the uploaded source, if any, still apply.

The original dinosaur icon and all landscape art are local SVG/Canvas code. Fonts: DM Sans and Space Grotesk (SIL Open Font License), with system-font fallbacks.
