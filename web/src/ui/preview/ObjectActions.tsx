import { useState } from "react"
import { ArrowRight, Code2, Pencil, Trash2, X } from "lucide-react"
import type { SceneNode } from "@/ir/types.ts"
import {
  readObjectEditValues,
  type ObjectEditValues,
} from "@/dsl/objectSourceEdits.ts"

function ActionButton({
  children,
  onClick,
  disabled = false,
  title,
  danger = false,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  title?: string
  danger?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${danger ? "text-red-600 hover:bg-red-500/10" : "text-popover-foreground hover:bg-accent"}`}
    >
      {children}
    </button>
  )
}

function colorPickerValue(value: string, fallback: string): string {
  const color = value.trim()
  if (/^#[0-9a-f]{6}$/i.test(color)) return color
  if (/^#[0-9a-f]{3}$/i.test(color))
    return `#${[...color.slice(1)].map((digit) => digit + digit).join("")}`
  return fallback
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string
  value: string
  fallback: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      <span className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
        <input
          type="color"
          value={colorPickerValue(value, fallback)}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="size-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span
          className="min-w-0 truncate font-mono text-xs text-foreground"
          title={value}
        >
          {value || "Not set"}
        </span>
      </span>
    </label>
  )
}

function EditDialog({
  node,
  initial,
  positionEditable,
  onClose,
  onSave,
}: {
  node: SceneNode
  initial: ObjectEditValues
  positionEditable: boolean
  onClose: () => void
  onSave: (values: ObjectEditValues) => boolean
}) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState("")
  const patch = (key: keyof ObjectEditValues, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }))
  const numberField = (
    key: keyof ObjectEditValues,
    label: string,
    value: string
  ) => (
    <label
      key={key}
      className="grid gap-1 text-xs font-medium text-muted-foreground"
    >
      {label}
      <input
        type="number"
        value={value}
        step="any"
        min={
          key === "opacity"
            ? 0
            : ["size", "width", "height", "radius"].includes(key)
              ? 1
              : undefined
        }
        max={key === "opacity" ? 1 : undefined}
        autoFocus={key === "x" && positionEditable && node.type !== "text"}
        onChange={(event) => patch(key, event.target.value)}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground transition-colors outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  )
  const wide =
    node.type === "rectangle" ||
    node.type === "diamond" ||
    node.type === "ellipse" ||
    node.type === "line" ||
    node.type === "image"
  const dimensional = wide || node.type === "table" || node.type === "chart"
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const numericKeys: Array<keyof ObjectEditValues> = ["x", "y", "opacity"]
    if (node.type === "text" || node.type === "icon") numericKeys.push("size")
    if (node.type === "circle") numericKeys.push("radius")
    if (dimensional) numericKeys.push("width", "height")
    if (numericKeys.some((key) => !Number.isFinite(Number(values[key])))) {
      setError(
        "Enter a valid number for each size, position, and opacity field."
      )
      return
    }
    if (Number(values.opacity) < 0 || Number(values.opacity) > 1) {
      setError("Opacity must be between 0 and 1.")
      return
    }
    if (!onSave(values)) {
      setError(
        "Could not update this object. Jump to its code and edit it there."
      )
      return
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[132] grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="object-edit-title"
        aria-describedby="object-edit-description"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose()
        }}
        onSubmit={submit}
        className="flex max-h-[min(90svh,52rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-popover p-4 text-popover-foreground shadow-2xl ring-1 ring-border/70 sm:p-6"
      >
        <div className="mb-5 flex shrink-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="object-edit-title" className="text-lg font-semibold">
              Edit object
            </h2>
            <p
              id="object-edit-description"
              className="truncate pt-1 font-mono text-xs text-muted-foreground"
            >
              {node.id} · {node.type}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close editor"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          {node.type === "text" && (
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Text
              <textarea
                autoFocus
                value={values.text}
                onChange={(event) => patch("text", event.target.value)}
                rows={3}
                className="min-h-20 resize-y rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-colors outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          )}
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-semibold text-foreground">
              Position and size
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {positionEditable && numberField("x", "Position X", values.x)}
              {positionEditable && numberField("y", "Position Y", values.y)}
              {(node.type === "text" || node.type === "icon") &&
                numberField(
                  "size",
                  node.type === "text" ? "Text size" : "Icon size",
                  values.size
                )}
              {node.type === "circle" &&
                numberField("radius", "Radius", values.radius)}
              {dimensional && numberField("width", "Width", values.width)}
              {dimensional && numberField("height", "Height", values.height)}
            </div>
          </fieldset>
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-semibold text-foreground">
              Appearance
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {numberField("opacity", "Opacity · 0–1", values.opacity)}
              <ColorField
                label="Ink color"
                value={values.color}
                fallback="#222222"
                onChange={(value) => patch("color", value)}
              />
              {node.style.fill !== undefined && (
                <ColorField
                  label="Fill color"
                  value={values.fill}
                  fallback="#ffffff"
                  onChange={(value) => patch("fill", value)}
                />
              )}
            </div>
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          )}
        </div>
        <div className="mt-5 flex shrink-0 justify-end gap-2 border-t border-border/70 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  )
}

export function ObjectActions({
  node,
  source,
  clientX,
  clientY,
  editable,
  positionEditable,
  editReason,
  deletable,
  deleteReason,
  overlapCount,
  onClose,
  onEdit,
  onDelete,
  onJump,
  onCycle,
  onConnect,
}: {
  node: SceneNode
  source: string
  clientX: number
  clientY: number
  editable: boolean
  positionEditable: boolean
  editReason?: string
  deletable: boolean
  deleteReason?: string
  overlapCount: number
  onClose: () => void
  onEdit: (values: ObjectEditValues) => boolean
  onDelete: () => void
  onJump: () => void
  onCycle: () => void
  onConnect: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState("")
  const left =
    typeof window === "undefined"
      ? clientX
      : Math.max(8, Math.min(clientX, window.innerWidth - 264))
  const top =
    typeof window === "undefined"
      ? clientY
      : Math.max(8, Math.min(clientY, window.innerHeight - 280))
  const capabilityLabel = editable
    ? ""
    : editReason || "Generated object · edit its macro in code"
  const save = (values: ObjectEditValues) => {
    const ok = onEdit(values)
    setEditError(
      ok
        ? ""
        : "Could not update this object. Jump to its code and edit it there."
    )
    return ok
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[130] bg-transparent"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
        onContextMenu={(event) => event.preventDefault()}
      />
      <section
        role="menu"
        aria-label={`Actions for ${node.id}`}
        style={{ left, top }}
        className="fixed z-[131] w-64 overflow-hidden rounded-xl bg-popover p-1.5 text-popover-foreground shadow-2xl ring-1 ring-border/70"
      >
        <div className="flex items-center justify-between gap-2 px-2.5 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{node.id}</p>
            <p className="text-[11px] text-muted-foreground">{node.type}</p>
          </div>
          <button
            type="button"
            aria-label="Close object menu"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="my-1 border-t border-border/70" />
        <ActionButton
          onClick={() => {
            setEditing(true)
            setEditError("")
          }}
          disabled={!editable}
          title={capabilityLabel}
        >
          <Pencil className="size-4" /> Edit properties
        </ActionButton>
        <ActionButton onClick={onConnect}>
          <ArrowRight className="size-4" /> Connect arrow from here
        </ActionButton>
        {overlapCount > 1 && (
          <ActionButton onClick={onCycle}>
            <span className="w-4 text-center">↻</span> Select overlapping object
            · {overlapCount}
          </ActionButton>
        )}
        <ActionButton onClick={onJump}>
          <Code2 className="size-4" /> Jump to code
        </ActionButton>
        <ActionButton
          onClick={onDelete}
          disabled={!deletable}
          title={deleteReason}
          danger
        >
          <Trash2 className="size-4" /> Delete object
        </ActionButton>
        {editError && (
          <p className="px-3 py-2 text-xs text-red-600">{editError}</p>
        )}
        {capabilityLabel && (
          <p className="px-3 pb-2 text-[11px] text-muted-foreground">
            {capabilityLabel}
          </p>
        )}
      </section>
      {editing && editable && (
        <EditDialog
          key={node.id}
          node={node}
          initial={readObjectEditValues(source, node)}
          positionEditable={positionEditable}
          onClose={() => {
            setEditing(false)
            onClose()
          }}
          onSave={save}
        />
      )}
    </>
  )
}
