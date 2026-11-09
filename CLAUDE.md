# hi-wings — guide for AI coding agents

hi-wings is a Tauri 2 app for Windows (and Linux): Rust in
`windows/src-tauri/`, TypeScript in `windows/src/`, the `hiwings-hook` relay in
`windows/hook/`. **Plume**, a small animated creature at the top of the screen,
shows AI coding agent sessions and a few integrations, and lets the user
approve, answer, chat and drop files.

It is a fork of [Coucou](https://github.com/Louis-CFM/coucou) (MIT, Louis
Raillé). The macOS app, the Android app and the iPhone relay of the original
are **not** part of this repository, and neither are Coucou's name, character,
icon or sounds.

## Where things are
- `windows/src/plume/` — Plume: `engine.ts` (the character: tweens, 13 eye
  shapes, badges, particles, state machine, wings), `outfits.ts`, `wardrobe.ts`.
- `windows/src/i18n/` — `catalog.xcstrings` is the translation source (14
  languages); `strings.json` is **generated** from it by
  `scripts/gen-strings.mjs` and is never edited by hand; `extra.json` is the
  hand-written table for strings only this app has.
- `windows/scripts/` — `gen-icons.mjs` draws the icon, `gen-sounds.mjs`
  synthesises the 29 sounds, `gen-strings.mjs` builds the string table.
- `windows/sounds/` — the 29 generated WAVs. `windows/src-tauri/icons/` — the
  generated icon set. Both are outputs: change the generator, not the file.
- `docs/AGENTS.md` — the `hiwings_agent` protocol and the named pipe.
- `docs/SPEC.md`, `docs/INTEGRATIONS.md`, `docs/VOICE.md` — behaviour (French).

## Build
```
cd windows && npm install && npm run tauri dev
npm test        # 561 tests
npm run pack    # the installers
```
Behind a proxy set `ALL_PROXY` too: `ureq` (Rust) does not read `HTTPS_PROXY`,
and `sherpa-onnx` downloads during the build. Stop a running hi-wings before
building, or Cargo cannot replace the executable.

## Rules
- No third-party dependencies unless truly unavoidable. Plume is drawn in code
  (Canvas 2D), no Rive/Lottie/images — and so are the icon and the sounds.
- Secrets live in the Windows credential manager, never on disk or in git.
- No telemetry. Network calls only to services the user configured.
- Never block Claude Code: if the app doesn't answer, the hook exits at once.
- Never overwrite `~/.claude/settings.json`: dated backup, merge, show the
  diff, write only after the user confirms.
- Never send an email or approve a permission without an explicit click.
- 0 % CPU when the island is hidden. Nothing animates at rest.
- Keep the identifier `com.wingsdbn.hiwings`: the credential manager, the
  preferences and `%LOCALAPPDATA%\hi-wings` depend on it.
- Pill IDs are stable contract values: never rename an existing one.
- Every visible string goes through `t()` and must exist in all 14 languages,
  or `npm test` fails. A new string goes in `extra.json`, by hand, translated.
- Every release adds its CHANGELOG.md section and an entry in
  `windows/src/whats-new/whats-new.json` for the new version, in every
  language, or `npm test` fails.
