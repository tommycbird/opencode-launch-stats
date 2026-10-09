/** @jsxImportSource @opentui/solid */
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { Plugin } from "@opencode/plugin/tui"

const BIRD = [
  "    _ ,-.",
  "   \\ `)  )",
  "  __).' (,-.__",
  "  >,-.___.-'",
]
const BIRD_COLOR = "#90ee90"
const BOLD = 1

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)

function unwrap<T>(value: any): T {
  return value && typeof value === "object" && "data" in value ? value.data : value
}

// V2 has no home logo slot (V1 had `home_logo`), so we find the built-in
// OPENCODE logo in the render tree, hide it, and mount our block in its place.
// The logo is drawn as single-character text nodes; its wrapper is the first
// ancestor that sits directly in the full-width home column. If this stops
// matching after an OpenCode update, we fall back to rendering under the prompt.
function findLogoWrapper(root: any): { wrapper: any; text: any } | undefined {
  const stack = [root]
  while (stack.length) {
    const node = stack.pop()
    if (!node || node.isDestroyed || node.visible === false) continue
    const kids = node.getChildren?.() ?? []
    if (kids.length === 0) {
      if (node.plainText === "█") {
        let a = node
        while (a.parent && a.parent !== root && a.parent.width !== root.width) a = a.parent
        if (a !== node && a.parent && a.parent !== root) return { wrapper: a, text: node }
      }
      continue
    }
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i])
  }
  return undefined
}

export default Plugin.define({
  id: "launch-stats",
  setup(context) {
    const [lastSessionTitle, setLastSessionTitle] = createSignal("")
    const [tokensToday, setTokensToday] = createSignal(0)
    const [branch, setBranch] = createSignal("no git")

    const stats = () => [
      { label: "branch", value: branch() },
      { label: "today", value: `${fmt(tokensToday())} tok` },
      { label: "last", value: lastSessionTitle().slice(0, 28) || "—" },
    ]

    async function refreshStats() {
      const location = context.location ?? context.data.location.default()
      try {
        const res = unwrap<any[]>(await context.client.session.list({ limit: 1, order: "desc", parentID: null }))
        if (res?.length) setLastSessionTitle(res[0].title || "(untitled)")
      } catch {}
      try {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const s = unwrap<any>(await context.client.session.stats({ from: startOfDay.getTime(), tools: "none" }))
        const t = s?.tokens
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

    const Block = () => (
      <box flexDirection="row" gap={6} justifyContent="center">
        <box flexDirection="column">
          <For each={BIRD}>{(line) => <text fg={BIRD_COLOR} attributes={BOLD}>{line}</text>}</For>
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

    const removeSlot = context.ui.slot({
      before: "home.footer",
      render: () => {
        const [fallback, setFallback] = createSignal(false)
        const renderer: any = context.renderer
        let wrapper: any
        let block: any
        let valueTexts: any[] = []
        let statsCol: any

        const build = (Box: any, Text: any) => {
          const row = new Box(renderer, { id: "launch-stats-block", flexDirection: "row", gap: 6, flexShrink: 0 })
          const art = new Box(renderer, { flexDirection: "column" })
          for (const line of BIRD) art.add(new Text(renderer, { content: line, fg: BIRD_COLOR, attributes: BOLD }))
          const col = new Box(renderer, { flexDirection: "column" })
          valueTexts = stats().map((s) => {
            const r = new Box(renderer, { flexDirection: "row", gap: 1 })
            r.add(new Text(renderer, { content: s.label.padEnd(7), fg: context.theme.text.muted }))
            const v = new Text(renderer, { content: s.value, fg: context.theme.text.base })
            r.add(v)
            col.add(r)
            return v
          })
          row.add(art)
          row.add(col)
          statsCol = col
          return row
        }

        const enforce = () => {
          if (statsCol && !statsCol.isDestroyed) {
            const wide = renderer.root.width >= 64
            if (statsCol.visible !== wide) statsCol.visible = wide
          }
          if (wrapper && !wrapper.isDestroyed && block && !block.isDestroyed && block.parent === wrapper) {
            for (const child of wrapper.getChildren()) if (child !== block && child.visible) child.visible = false
            return true
          }
          const found = findLogoWrapper(renderer.root)
          if (!found) return false
          wrapper = found.wrapper
          block = build(wrapper.constructor, found.text.constructor)
          for (const child of wrapper.getChildren()) child.visible = false
          wrapper.add(block)
          return true
        }

        createEffect(() => {
          const values = stats().map((s) => s.value)
          valueTexts.forEach((t, i) => {
            if (!t.isDestroyed) t.content = values[i]
          })
        })

        onMount(() => {
          let tries = 0
          const timer = setInterval(() => {
            const ok = enforce()
            if (!ok && ++tries === 10 && !block) setFallback(true)
            if (ok && fallback()) setFallback(false)
          }, 200)
          onCleanup(() => {
            clearInterval(timer)
            if (block && !block.isDestroyed) block.destroyRecursively()
          })
        })

        return <Show when={fallback()} fallback={<box height={0} />}>
          <Block />
        </Show>
      },
    })

    return () => {
      stopSucceeded()
      stopRenamed()
      removeSlot()
    }
  },
})
