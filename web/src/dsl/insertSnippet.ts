interface EditorSourceEdit {
  from: number
  to: number
  insert: string
}

interface SceneRange {
  start: number
  end: number
}

export function makeSceneInsertEdit(
  source: string,
  snippet: string,
  sceneIndex?: number,
  cursorLine?: number
): EditorSourceEdit | undefined {
  const lines = source.split("\n")
  const scenes: SceneRange[] = []
  let openScene = -1
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ""
    if (openScene < 0 && /^\s*SCENE\b/i.test(line)) openScene = index
    else if (openScene >= 0 && /^\s*END\s+SCENE\s*$/i.test(line)) {
      scenes.push({ start: openScene, end: index })
      openScene = -1
    }
  }
  if (openScene >= 0) scenes.push({ start: openScene, end: lines.length })
  const scene = sceneIndex !== undefined
    ? scenes[sceneIndex] ?? scenes[0]
    : scenes.find((item) => cursorLine !== undefined && cursorLine >= item.start + 1 && cursorLine <= item.end + 1) ?? scenes[0]
  if (!scene) return undefined

  const indent = (/^\s*/.exec(lines[scene.start] ?? "")?.[0] ?? "") + "  "
  const text = snippet.split("\n").map((line) => indent + line).join("\n") + "\n"
  const from = lines.slice(0, scene.end).reduce((total, line) => total + line.length + 1, 0)
  return { from, to: from, insert: text }
}
