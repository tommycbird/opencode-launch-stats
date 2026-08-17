# opencode-launch-stats

TUI plugin for [opencode](https://opencode.ai) that replaces the startup logo with a bird ASCII art and live stats (git branch, today's token usage, last session title).

## Install

Add to your `tui.json`:

```json
{
  "plugin": ["./index.tsx"]
}
```

Or copy `index.tsx` to `~/.config/opencode/plugins/` and add `"./plugins/index.tsx"` to your `tui.json` plugin array.

## License

MIT
