# hi-wings

A small animated creature — **Plume** — that lives at the top of your screen on
Windows, shows your AI coding agent sessions, and lets you approve, answer,
chat and drop files without leaving what you are doing.

hi-wings is a fork of [Coucou](https://github.com/Louis-CFM/coucou) by Louis
Raillé, whose MIT licence invites forks that bring their own name, icon,
character and sounds. hi-wings brings all four. See [LICENSE](LICENSE) and
[LICENSE-ASSETS.md](LICENSE-ASSETS.md).

## Install

Download `hi-wings.msi` (or the `-setup.exe`) from the
[releases](https://github.com/wingsdbn/hi-wings/releases) and run it. The
installer is small: the speech models (~700 MB) are downloaded later, on
demand, from Settings — never bundled.

## What it does

- **Agent sessions** — Claude Code, Codex, Gemini CLI and others appear as
  pills in the island; approve a permission, answer a question, see the diff.
- **Chat** — talk to Claude from the island, with your own API key or through
  an OpenAI-compatible gateway (`HIWINGS_ANTHROPIC_BASE_URL`).
- **Integrations** — mail, calendar, Spotify, GitHub, WhatsApp, notes.
- **Voice** — “OK Wings”, dictation, and read-back, all on-device.
- **Plume** — breathes, blinks, follows your cursor, and spreads her wings when
  there is work. At rest nothing about her moves, and the island burns no CPU.

## Build

```
cd windows
npm install
npm run tauri dev          # run it
npm test                   # 561 tests
npm run pack               # hi-wings.msi + setup.exe in src-tauri/target/release/bundle
```

Behind a proxy, set `ALL_PROXY` as well as `HTTPS_PROXY`: the Rust side uses
`ureq`, which reads only the first.

`npm run icons` redraws the icon and `npm run sounds` re-synthesises the 29
sounds. Both are generated in code — hi-wings ships no recorded asset.

See [windows/README.md](windows/README.md) for the architecture and
[docs/AGENTS.md](docs/AGENTS.md) for the pipe protocol other tools can speak.

## Credit

The code of Coucou, the animation engine Plume is drawn with, and the 14
languages all come from Louis Raillé's work, under MIT. hi-wings is © 2026
David Ngwangwa for what it adds.
