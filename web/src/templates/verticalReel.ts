export interface VerticalReelBeat {
  scene: string
  headline: string
  focus: string
  detail: string
  takeaway: string
  narration: string
}

export interface VerticalReelTheme {
  background: string
  panel: string
  accent: string
  headline: string
  detail: string
  inactive: string
  focusPanel?: string
  focusCorners?: number
}

function quoteDslText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')
}

export function createVerticalReelScript({
  series,
  theme,
  beats,
}: {
  series: string
  theme: VerticalReelTheme
  beats: VerticalReelBeat[]
}): string {
  const scenes = beats
    .map((beat, sceneIndex) => {
      const progress = beats
        .map((_, progressIndex) => {
          const active = progressIndex === sceneIndex
          return `  CREATE progress${sceneIndex}_${progressIndex} AS CIRCLE
    POSITION ${540 + (progressIndex - (beats.length - 1) / 2) * 68} 1665
    RADIUS 12
    FILL ${active ? theme.accent : theme.inactive}
    COLOR ${active ? theme.accent : theme.inactive}
    STROKE 2
    DRAW 0.1s
  END`
        })
        .join("\n")

      return `SCENE ${sceneIndex + 1} "${quoteDslText(beat.scene)}"
${progress}
  CREATE series AS TEXT
    POSITION 540 215
    SIZE 34
    COLOR ${theme.accent}
    TEXT "${quoteDslText(series)}"
    DRAW 0.3s
  END
  CREATE headline AS TEXT
    POSITION 540 365
    SIZE 66
    MAXWIDTH 880
    ALIGN center
    COLOR ${theme.headline}
    TEXT "${quoteDslText(beat.headline)}"
    DRAW 0.7s
  END
  CREATE focusCard AS RECTANGLE
    POSITION 540 770
    WIDTH 840
    HEIGHT 340
    FILL ${theme.focusPanel ?? theme.panel}
    COLOR ${theme.accent}
    STROKE 5
    CORNERS ${theme.focusCorners ?? 36}
    DRAW 0.5s
  END
  CREATE focus AS TEXT
    POSITION 540 715
    SIZE 58
    MAXWIDTH 740
    ALIGN center
    COLOR ${theme.accent}
    TEXT "${quoteDslText(beat.focus)}"
    DRAW 0.6s
  END
  CREATE detail AS TEXT
    POSITION 540 850
    SIZE 34
    MAXWIDTH 740
    ALIGN center
    COLOR ${theme.detail}
    TEXT "${quoteDslText(beat.detail)}"
    DRAW 0.5s
  END
  CREATE takeaway AS TEXT
    POSITION 540 1140
    SIZE 42
    MAXWIDTH 880
    ALIGN center
    COLOR ${theme.headline}
    TEXT "${quoteDslText(beat.takeaway)}"
    DRAW 0.6s
  END
  SAY "${quoteDslText(beat.narration)}"
    DURATION 3.5s
    TONE explain
    WHO "Narrator"
    LANG en
  TRANSITION slide DURATION 0.4s
END SCENE`
    })
    .join("\n\n")

  return `VERSION 1.0
CANVAS 1080 1920
BACKGROUND ${theme.background}
BOARD plain
STYLE clean
FONT neat
STROKE 4
SUBTITLES on

${scenes}
`
}
