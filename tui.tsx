/** @jsxImportSource @opentui/solid */
import { createSignal, For } from "solid-js"
import { Plugin } from "@opencode/plugin/tui"

const BIRD = [
  "    _ ,-.",
  "   \\ `)  )",
  "  __).' (,-.__",
  "  >,-.___.-'",
]

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)

function unwrap<T>(value: any): T {
  return value && typeof value === "object" && "data" in value ? value.data : value
}

export default Plugin.define({
  id: "launch-stats",
  setup(context) {
    const [lastSessionTitle, setLastSessionTitle] = createSignal("")
    const [tokensToday, setTokensToday] = createSignal(0)
    const [branch, setBranch] = createSignal("no git")

    async function refreshStats() {
      const location = context.location ?? context.data.location.default()
      try {
        const res = unwrap<any[]>(await context.client.session.list({ limit: 1, order: "desc", parentID: null }))
        if (res?.length) setLastSessionTitle(res[0].title || "(untitled)")
      } catch {}
      try {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const stats = unwrap<any>(await context.client.session.stats({ from: startOfDay.getTime(), tools: "none" }))
        const t = stats?.tokens
        if (t) setTokensToday((t.input ?? 0) + (t.output ?? 0) + (t.reasoning ?? 0))
      } catch {}
      try {
        if (location) {
          await context.data.location.vcs.sync(location)
          setBranch(context.data.location.vcs.info(location)?.branch?.current ?? "no git")
        }
      } catch {}
    }

    void refreshStats()
    const stopSucceeded = context.data.on("session.execution.succeeded", () => void refreshStats())
    const stopRenamed = context.data.on("session.renamed", () => void refreshStats())

    const removeSlot = context.ui.slot({
      before: "home.footer",
      render: () => {
        const stats = () => [
          { label: "branch", value: branch() },
          { label: "today", value: `${fmt(tokensToday())} tok` },
          { label: "last", value: lastSessionTitle().slice(0, 28) || "—" },
        ]
        return (
          <box flexDirection="row" gap={6} justifyContent="center">
            <box flexDirection="column">
              <For each={BIRD}>{(line) => <text fg="#90ee90" attributes={1}>{line}</text>}</For>
            </box>
            <box flexDirection="column" gap={0}>
              <For each={stats()}>
                {(s) => (
                  <box flexDirection="row" gap={1}>
                    <text fg={context.theme.text.muted}>{s.label.padEnd(7)}</text>
                    <text fg={context.theme.text.base}>{s.value}</text>
                  </box>
                )}
              </For>
            </box>
          </box>
        )
      },
    })

    return () => {
      stopSucceeded()
      stopRenamed()
      removeSlot()
    }
  },
})
