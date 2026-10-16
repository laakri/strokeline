export type VerticalReelLayout =
  | "editorial"
  | "comparison"
  | "product-stage"
  | "quote"
  | "step-stack"
  | "science-flow"

export interface VerticalReelBeat {
  scene: string
  headline: string
  focus: string
  detail: string
  takeaway: string
  narration: string
  before?: string
  after?: string
}

export interface VerticalReelTheme {
  background: string
  panel: string
  accent: string
  headline: string
  detail: string
  inactive: string
  focusPanel?: string
  activePanel?: string
  focusCorners?: number
}

function quoteDslText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')
}

function createLayout(
  layout: VerticalReelLayout,
  beat: VerticalReelBeat,
  theme: VerticalReelTheme,
  sceneIndex: number
): string {
  const text = (value: string) => quoteDslText(value)
  const colors = {
    accent: theme.accent,
    headline: theme.headline,
    detail: theme.detail,
    panel: theme.panel,
    activePanel: theme.activePanel ?? theme.focusPanel ?? theme.panel,
    inactive: theme.inactive,
  }

  if (layout === "editorial") {
    return `  CREATE editorialRule AS LINE
    FROM 145 480
    TO 145 1080
    COLOR ${colors.accent}
    STROKE 10
    DRAW 0.4s
  END
  CREATE editorialNumber AS TEXT
    POSITION 330 600
    SIZE 160
    COLOR ${colors.accent}
    TEXT "${String(sceneIndex + 1).padStart(2, "0")}"
    DRAW 0.5s
  END
  CREATE editorialFocus AS TEXT
    POSITION 540 720
    SIZE 72
    MAXWIDTH 670
    ALIGN center
    COLOR ${colors.headline}
    TEXT "${text(beat.focus)}"
    DRAW 0.6s
  END
  CREATE editorialDetail AS TEXT
    POSITION 540 900
    SIZE 38
    MAXWIDTH 670
    ALIGN center
    COLOR ${colors.detail}
    TEXT "${text(beat.detail)}"
    DRAW 0.5s
  END
  CREATE editorialTakeaway AS RECTANGLE
    POSITION 540 1175
    WIDTH 850
    HEIGHT 150
    FILL ${colors.activePanel}
    COLOR ${colors.accent}
    STROKE 3
    CORNERS 12
    TEXT "${text(beat.takeaway)}"
    SIZE 34
    DRAW 0.5s
  END`
  }

  if (layout === "comparison") {
    if (!beat.before || !beat.after) {
      throw new Error(
        `Comparison Reel scene "${beat.scene}" must define both before and after copy.`
      )
    }
    return `  CREATE beforePanel AS RECTANGLE
    POSITION 455 650
    WIDTH 760
    HEIGHT 230
    FILL ${colors.panel}
    COLOR ${colors.inactive}
    STROKE 3
    CORNERS 8
    DRAW 0.4s
  END
  CREATE beforeLabel AS TEXT
    POSITION 210 570
    SIZE 30
    COLOR ${colors.detail}
    TEXT "BEFORE"
    DRAW 0.3s
  END
  CREATE beforeCopy AS TEXT
    POSITION 455 650
    SIZE 38
    MAXWIDTH 650
    ALIGN center
    COLOR ${colors.detail}
    TEXT "${text(beat.before)}"
    DRAW 0.5s
  END
  CREATE changeArrow AS LINE
    FROM 540 805
    TO 540 890
    COLOR ${colors.accent}
    STROKE 8
    DRAW 0.3s
  END
  CREATE afterPanel AS RECTANGLE
    POSITION 625 1040
    WIDTH 760
    HEIGHT 230
    FILL ${colors.activePanel}
    COLOR ${colors.accent}
    STROKE 4
    CORNERS 44
    DRAW 0.4s
  END
  CREATE afterLabel AS TEXT
    POSITION 870 930
    SIZE 30
    COLOR ${colors.accent}
    TEXT "AFTER"
    DRAW 0.3s
  END
  CREATE afterCopy AS TEXT
    POSITION 625 1040
    SIZE 38
    MAXWIDTH 650
    ALIGN center
    COLOR ${colors.headline}
    TEXT "${text(beat.after)}"
    DRAW 0.5s
  END
  CREATE comparisonTakeaway AS TEXT
    POSITION 540 1215
    SIZE 32
    MAXWIDTH 860
    ALIGN center
    COLOR ${colors.headline}
    TEXT "${text(beat.takeaway)}"
    DRAW 0.4s
  END`
  }

  if (layout === "product-stage") {
    return `  CREATE productHalo AS CIRCLE
    POSITION 540 760
    RADIUS 285
    FILL ${colors.panel}
    COLOR ${colors.inactive}
    STROKE 2
    DRAW 0.4s
  END
  CREATE cupBody AS RECTANGLE
    POSITION 540 790
    WIDTH 300
    HEIGHT 300
    FILL ${colors.activePanel}
    COLOR ${colors.accent}
    STROKE 8
    CORNERS 34
    DRAW 0.6s
  END
  CREATE cupLip AS ELLIPSE
    POSITION 540 645
    WIDTH 310
    HEIGHT 84
    FILL ${colors.panel}
    COLOR ${colors.accent}
    STROKE 8
    DRAW 0.4s
  END
  CREATE cupFold1 AS LINE
    FROM 410 785
    TO 670 785
    COLOR ${colors.accent}
    STROKE 5
    DRAW 0.3s
  END
  CREATE cupFold2 AS LINE
    FROM 425 865
    TO 655 865
    COLOR ${colors.accent}
    STROKE 5
    DRAW 0.3s
  END
  CREATE productName AS TEXT
    POSITION 540 1050
    SIZE 50
    MAXWIDTH 820
    ALIGN center
    COLOR ${colors.accent}
    TEXT "${text(beat.focus)}"
    DRAW 0.5s
  END
  CREATE productDetail AS TEXT
    POSITION 540 1130
    SIZE 32
    MAXWIDTH 850
    ALIGN center
    COLOR ${colors.detail}
    TEXT "${text(beat.detail)}"
    DRAW 0.4s
  END
  CREATE productTakeaway AS TEXT
    POSITION 540 1220
    SIZE 32
    MAXWIDTH 850
    ALIGN center
    COLOR ${colors.headline}
    TEXT "${text(beat.takeaway)}"
    DRAW 0.4s
  END`
  }

  if (layout === "quote") {
    return `  CREATE quoteGlyph AS TEXT
    POSITION 210 630
    SIZE 260
    COLOR ${colors.accent}
    TEXT "“"
    DRAW 0.4s
  END
  CREATE quoteRule AS LINE
    FROM 155 720
    TO 155 1040
    COLOR ${colors.accent}
    STROKE 8
    DRAW 0.4s
  END
  CREATE quoteFocus AS TEXT
    POSITION 540 825
    SIZE 70
    MAXWIDTH 760
    ALIGN center
    COLOR ${colors.headline}
    TEXT "${text(beat.focus)}"
    DRAW 0.7s
  END
  CREATE quoteByline AS TEXT
    POSITION 540 1055
    SIZE 34
    MAXWIDTH 760
    ALIGN center
    COLOR ${colors.accent}
    TEXT "${text(beat.detail)}"
    DRAW 0.4s
  END
  CREATE quoteTakeaway AS TEXT
    POSITION 540 1215
    SIZE 32
    MAXWIDTH 850
    ALIGN center
    COLOR ${colors.detail}
    TEXT "${text(beat.takeaway)}"
    DRAW 0.4s
  END`
  }

  if (layout === "step-stack") {
    const steps = [
      { label: "HOOK", copy: "Ask a sharp question or show the result." },
      { label: "PROOF", copy: "Show one example or quick demonstration." },
      { label: "PAYOFF", copy: "Deliver the answer and one next step." },
    ]
    const activeIndex = Math.max(0, Math.min(2, sceneIndex - 1))
    const stepRows = steps
      .map((step, index) => {
        const y = 620 + index * 195
        const active = index === activeIndex
        return `  CREATE step${index + 1} AS RECTANGLE
    POSITION ${active ? 565 : 540} ${y}
    WIDTH ${active ? 790 : 740}
    HEIGHT 145
    FILL ${active ? colors.activePanel : colors.panel}
    COLOR ${active ? colors.accent : colors.inactive}
    STROKE ${active ? 5 : 2}
    CORNERS ${active ? 12 : 72}
    DRAW 0.4s
  END
  CREATE step${index + 1}Number AS CIRCLE
    POSITION 250 ${y}
    RADIUS 42
    FILL ${active ? colors.accent : colors.inactive}
    COLOR ${active ? colors.accent : colors.inactive}
    STROKE 2
    TEXT "${index + 1}"
    SIZE 34
    DRAW 0.3s
  END
  CREATE step${index + 1}Label AS TEXT
    POSITION 610 ${y - 20}
    SIZE 34
    ALIGN center
    COLOR ${active ? colors.accent : colors.detail}
    TEXT "${step.label}"
    DRAW 0.3s
  END
  CREATE step${index + 1}Copy AS TEXT
    POSITION 610 ${y + 25}
    SIZE 28
    MAXWIDTH 560
    ALIGN center
    COLOR ${colors.detail}
    TEXT "${step.copy}"
    DRAW 0.3s
  END`
      })
      .join("\n")

    return `${stepRows}
  CREATE formulaTakeaway AS TEXT
    POSITION 540 1220
    SIZE 34
    MAXWIDTH 860
    ALIGN center
    COLOR ${colors.headline}
    TEXT "${text(beat.takeaway)}"
    DRAW 0.4s
  END`
  }

  return `  CREATE lightSource AS CIRCLE
    POSITION 235 735
    RADIUS 112
    FILL ${colors.activePanel}
    COLOR ${colors.accent}
    STROKE 5
    DRAW 0.4s
  END
  CREATE sunlightIcon AS ICON
    POSITION 235 735
    SIZE 112
    NAME sun
    COLOR ${colors.accent}
    STROKE 5
    DRAW 0.4s
  END
  CREATE leafSource AS CIRCLE
    POSITION 540 735
    RADIUS 132
    FILL ${colors.panel}
    COLOR ${colors.accent}
    STROKE 6
    DRAW 0.5s
  END
  CREATE leafIcon AS ICON
    POSITION 540 735
    SIZE 145
    NAME leaf
    COLOR ${colors.accent}
    STROKE 5
    DRAW 0.5s
  END
  CREATE sugarSource AS CIRCLE
    POSITION 845 735
    RADIUS 112
    FILL ${colors.activePanel}
    COLOR ${colors.accent}
    STROKE 5
    DRAW 0.4s
  END
  CREATE sugarIcon AS ICON
    POSITION 845 735
    SIZE 112
    NAME apple
    COLOR ${colors.accent}
    STROKE 5
    DRAW 0.4s
  END
  CREATE lightArrow AS LINE
    FROM 350 735
    TO 405 735
    COLOR ${colors.accent}
    STROKE 8
    DRAW 0.3s
  END
  CREATE sugarArrow AS LINE
    FROM 675 735
    TO 730 735
    COLOR ${colors.accent}
    STROKE 8
    DRAW 0.3s
  END
  CREATE inputLabel AS TEXT
    POSITION 235 900
    SIZE 28
    COLOR ${colors.detail}
    TEXT "LIGHT"
    DRAW 0.3s
  END
  CREATE leafLabel AS TEXT
    POSITION 540 930
    SIZE 28
    COLOR ${colors.detail}
    TEXT "LEAF"
    DRAW 0.3s
  END
  CREATE outputLabel AS TEXT
    POSITION 845 900
    SIZE 28
    COLOR ${colors.detail}
    TEXT "SUGAR"
    DRAW 0.3s
  END
  CREATE scienceFocus AS TEXT
    POSITION 540 1040
    SIZE 42
    MAXWIDTH 860
    ALIGN center
    COLOR ${colors.accent}
    TEXT "${text(beat.focus)}"
    DRAW 0.4s
  END
  CREATE scienceDetail AS TEXT
    POSITION 540 1120
    SIZE 30
    MAXWIDTH 850
    ALIGN center
    COLOR ${colors.detail}
    TEXT "${text(beat.detail)}"
    DRAW 0.4s
  END
  CREATE scienceTakeaway AS TEXT
    POSITION 540 1210
    SIZE 30
    MAXWIDTH 850
    ALIGN center
    COLOR ${colors.headline}
    TEXT "${text(beat.takeaway)}"
    DRAW 0.4s
  END`
}

export function createVerticalReelScript({
  series,
  theme,
  layout,
  beats,
}: {
  series: string
  theme: VerticalReelTheme
  layout: VerticalReelLayout
  beats: VerticalReelBeat[]
}): string {
  const headlinePosition = "540 355"
  const headlineAlignment = "center"
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
    POSITION 540 180
    SIZE 30
    COLOR ${theme.accent}
    TEXT "${quoteDslText(series)}"
    DRAW 0.3s
  END
  CREATE headline AS TEXT
    POSITION ${headlinePosition}
    SIZE 64
    MAXWIDTH 880
    ALIGN ${headlineAlignment}
    COLOR ${theme.headline}
    TEXT "${quoteDslText(beat.headline)}"
    DRAW 0.7s
  END
${createLayout(layout, beat, theme, sceneIndex)}
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
