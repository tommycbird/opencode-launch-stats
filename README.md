# opencode-launch-stats

OpenCode V2 CLI plugin that replaces the OPENCODE logo on the home screen with a bird and live stats (git branch, today's token usage, last session title). V2 has no logo slot, so the plugin hides the built-in logo at runtime and falls back to drawing below the prompt if it can't find it.

Requires OpenCode 2.x. The V1 version is tagged in git history (`6dc3e76`).

## Install

Clone into your global plugins directory. OpenCode discovers `tui.tsx` automatically:

```sh
git clone https://github.com/tommycbird/opencode-launch-stats ~/.config/opencode/plugins/launch-stats
```

## License

MIT
