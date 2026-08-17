/** @jsxImportSource @opentui/solid */
import { createSignal } from "solid-js"
import type { TuiPluginModule } from "@opencode-ai/plugin/tui"

const tui: TuiPluginModule["tui"] = async (api) => {
  const [lastSessionTitle, setLastSessionTitle] = createSignal("")
  const [tokensToday, setTokensToday] = createSignal(0)

  async function refreshStats() {
    try {
      const res = await api.client.session.list({ limit: 100 })
      const sessions = res.data ?? []

      if (sessions.length > 0) {
        setLastSessionTitle(sessions[0].title || "(untitled)")
      }

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const cutoff = startOfDay.getTime()

      let total = 0
      for (const s of sessions) {
        if (s.time.updated >= cutoff) {
          total += (s.tokens?.input ?? 0) + (s.tokens?.output ?? 0)
        }
      }
      setTokensToday(total)
    } catch {}
  }

  refreshStats()
  api.event.on("session.idle", () => refreshStats())
  api.event.on("session.updated", () => refreshStats())

  api.slots.register({
    slots: {
      home_logo(ctx) {
        const theme = ctx.theme.current
        const branch = api.state.vcs?.branch ?? "no git"
        const lines = [
          "    _ ,-.",
          "   \\ `)  )",
          "  __).' (,-.__",
          "  >,-.___.-'"
        ]

        const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`

        const stats = [
          { label: "branch", value: branch },
          { label: "today", value: `${fmt(tokensToday())} tok` },
          { label: "last", value: lastSessionTitle().slice(0, 28) || "—" },
        ]

        return (
          <box flexDirection="row" gap={6}>
            <box flexDirection="column">
              {lines.map((line) => (
                <text fg="#90ee90" attributes={1}>{line}</text>
              ))}
            </box>
            <box flexDirection="column" gap={0}>
              {stats.map((s) => (
                <box flexDirection="row" gap={1}>
                  <text fg={theme.textMuted}>{s.label.padEnd(7)}</text>
                  <text fg={theme.text}>{s.value}</text>
                </box>
              ))}
            </box>
          </box>
        )
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: "no-logo",
  tui,
}

export default plugin
