import {
  BookOpen,
  BrainCircuit,
  CircuitBoard,
  Cpu,
  GitCompareArrows,
  Lightbulb,
  Microscope,
  Moon,
  Percent,
  Presentation,
  Sprout,
  Trophy,
  Zap,
} from "lucide-react"
import type { DiagramTemplate } from "@/templates/diagramTemplates.ts"
import { createVerticalReelScript } from "@/templates/verticalReel.ts"
import ohmsLaw from "@/templates/curated/ohms-law-blueprint-lab.wbs?raw"
import tcpVsUdp from "@/templates/curated/tcp-vs-udp.wbs?raw"
import capitalShowdown from "@/templates/curated/capital-showdown-quiz.wbs?raw"
import ledCircuit from "@/templates/curated/led-circuit-blueprint.wbs?raw"
import photosynthesisBrainstorm from "@/templates/curated/photosynthesis-brainstorm-map.wbs?raw"
import sugarLab from "@/templates/curated/sugar-dissolving-lab-notebook.wbs?raw"
import storybook from "@/templates/curated/pip-counts-her-friends.wbs?raw"
import photosynthesisLesson from "@/templates/curated/photosynthesis-lesson.wbs?raw"
import refrigerator from "@/templates/curated/how-refrigerators-work.wbs?raw"
import moonTimeline from "@/templates/curated/race-to-the-moon.wbs?raw"
import discounts from "@/templates/curated/successive-discounts.wbs?raw"
import sqlEssentials from "@/templates/curated/sql-essentials.wbs?raw"
import photosynthesisRecall from "@/templates/curated/photosynthesis-quick-recall-map.wbs?raw"
import lightningMicro from "@/templates/curated/lightning-60-second-micro-lesson.wbs?raw"
import memoryLab from "@/templates/curated/memory-lab.wbs?raw"
import webDevBasics from "@/templates/curated/web-dev-basics.wbs?raw"

type CuratedTemplate = Omit<DiagramTemplate, "preview"> & {
  preview: "rendered"
}

export const FEATURED_TEMPLATE_IDS = [
  "capital-showdown-quiz",
  "led-circuit-blueprint",
  "race-to-the-moon",
  "pip-counts-her-friends",
  "photosynthesis-micro-lesson",
]

export const CURATED_TEMPLATES: CuratedTemplate[] = [
  {
    id: "ohms-law-blueprint-lab",
    title: "Ohm’s Law Blueprint Lab",
    category: "Science",
    description:
      "A four-scene engineering lesson that derives voltage, current, and resistance on a blueprint board.",
    preview: "rendered",
    icon: CircuitBoard,
    script: ohmsLaw,
  },
  {
    id: "tcp-vs-udp",
    title: "TCP vs UDP: Compare & Decide",
    category: "Education",
    description:
      "A clear side-by-side comparison of delivery, speed, and use cases for two core network protocols.",
    preview: "rendered",
    icon: GitCompareArrows,
    script: tcpVsUdp,
  },
  {
    id: "capital-showdown-quiz",
    title: "Capital Showdown Quiz",
    category: "Education",
    description:
      "A seven-scene quiz-show format with five questions, reveals, and a final score.",
    preview: "rendered",
    icon: Trophy,
    script: capitalShowdown,
  },
  {
    id: "led-circuit-blueprint",
    title: "LED Circuit Blueprint",
    category: "Science",
    description:
      "A six-sheet circuit design lesson covering parts, wiring, voltage budget, and stress testing.",
    preview: "rendered",
    icon: CircuitBoard,
    script: ledCircuit,
  },
  {
    id: "photosynthesis-micro-lesson",
    title: "Photosynthesis: 60-Second Lesson",
    category: "Reels",
    description:
      "A five-beat vertical lesson on how leaves use light, water, and carbon dioxide to make sugar.",
    preview: "rendered",
    icon: Sprout,
    script: createVerticalReelScript({
      series: "PHOTOSYNTHESIS IN 60 SECONDS",
      layout: "science-flow",
      theme: {
        background: "#EDF6E7",
        panel: "#FFFFFF",
        accent: "#3A8A3F",
        headline: "#18371F",
        detail: "#3D5D43",
        inactive: "#D1E2CB",
        focusPanel: "#E4F1DB",
        focusCorners: 80,
      },
      beats: [
        {
          scene: "A solar-powered kitchen",
          headline: "A leaf makes its own food",
          focus: "LIGHT IN",
          detail: "A tiny solar-powered kitchen is at work.",
          takeaway:
            "Photosynthesis turns light energy into stored chemical energy.",
          narration:
            "A leaf is like a tiny solar-powered kitchen: it uses light to help make the plant's food.",
        },
        {
          scene: "Catch the light",
          headline: "Start with sunlight",
          focus: "CHLOROPHYLL",
          detail: "This green pigment absorbs light in chloroplasts.",
          takeaway: "Light energy powers the process.",
          narration:
            "Chlorophyll, the green pigment inside chloroplasts, absorbs light energy.",
        },
        {
          scene: "Bring the ingredients",
          headline: "The leaf needs two inputs",
          focus: "CO₂ + WATER",
          detail: "Carbon dioxide enters leaves; roots absorb water.",
          takeaway: "Light supplies energy, not matter.",
          narration:
            "Carbon dioxide comes from the air, while water is absorbed by the roots.",
        },
        {
          scene: "Make sugar",
          headline: "Now the ingredients change",
          focus: "SUGAR + OXYGEN",
          detail: "Light helps turn water and CO₂ into glucose and oxygen.",
          takeaway: "The plant stores energy in sugar.",
          narration:
            "Using light energy, the plant makes glucose from water and carbon dioxide and releases oxygen.",
        },
        {
          scene: "The quick recap",
          headline: "Remember the direction",
          focus: "LIGHT → SUGAR",
          detail: "Air and water go in; oxygen comes out.",
          takeaway: "Look for the tiny pores where gases move.",
          narration:
            "Light powers the process, sugar stores energy, and oxygen is released through tiny leaf pores.",
        },
      ],
    }),
  },
  {
    id: "lightning-60-second-micro-lesson",
    title: "Lightning: 60-Second Micro-Lesson",
    category: "Reels",
    description:
      "A six-scene vertical weather explainer with memorable lightning facts and a storm-safety recap.",
    preview: "rendered",
    icon: Zap,
    script: lightningMicro,
  },
  {
    id: "photosynthesis-brainstorm-map",
    title: "Photosynthesis Brainstorm Map",
    category: "Process",
    description:
      "A hand-drawn mind map that branches one big idea into inputs, place, process, and output.",
    preview: "rendered",
    icon: BrainCircuit,
    script: photosynthesisBrainstorm,
  },
  {
    id: "sugar-dissolving-lab-notebook",
    title: "Sugar-Dissolving Lab Notebook",
    category: "Science",
    description:
      "A six-part experiment notebook from research question and hypothesis through evidence and conclusion.",
    preview: "rendered",
    icon: Microscope,
    script: sugarLab,
  },
  {
    id: "pip-counts-her-friends",
    title: "Pip Counts Her Friends",
    category: "Stories",
    description:
      "A playful seven-scene counting story for young learners, featuring Pip and her animal friends.",
    preview: "rendered",
    icon: BookOpen,
    script: storybook,
  },
  {
    id: "photosynthesis-lesson",
    title: "Photosynthesis: How Plants Make Food",
    category: "Education",
    description:
      "A three-scene illustrated explainer covering a leaf’s inputs, process, and chemical equation.",
    preview: "rendered",
    icon: Sprout,
    script: photosynthesisLesson,
  },
  {
    id: "how-refrigerators-work",
    title: "How Refrigerators Work",
    category: "Education",
    description:
      "A marker-style, six-scene explanation that follows heat through the refrigeration cycle.",
    preview: "rendered",
    icon: Cpu,
    script: refrigerator,
  },
  {
    id: "race-to-the-moon",
    title: "Race to the Moon: 1957–1969",
    category: "Education",
    description:
      "A four-scene hand-drawn timeline of the space race, from Sputnik to Apollo 11.",
    preview: "rendered",
    icon: Moon,
    script: moonTimeline,
  },
  {
    id: "successive-discounts",
    title: "Successive Discounts: Worked Example",
    category: "Education",
    description:
      "A visual two-scene math lesson showing why consecutive discounts do not simply add together.",
    preview: "rendered",
    icon: Percent,
    script: discounts,
  },
  {
    id: "sql-essentials",
    title: "SQL Essentials Cheat Sheets",
    category: "Technology",
    description:
      "Three concise reference scenes covering SQL joins, window functions, and indexes.",
    preview: "rendered",
    icon: Presentation,
    script: sqlEssentials,
  },
  {
    id: "photosynthesis-quick-recall-map",
    title: "Photosynthesis Quick-Recall Map",
    category: "Process",
    description:
      "A compact, hand-drawn four-scene recall map for reviewing photosynthesis and its key questions.",
    preview: "rendered",
    icon: Lightbulb,
    script: photosynthesisRecall,
  },
  {
    id: "memory-lab",
    title: "Memory Lab: Beat the Forgetting Curve",
    category: "Education",
    description:
      "An eight-scene learning-science explainer on forgetting, spaced repetition, active recall, and building a review plan.",
    preview: "rendered",
    icon: BrainCircuit,
    script: memoryLab,
  },
  {
    id: "web-dev-basics",
    title: "Web Dev Basics: A Browser Request",
    category: "Technology",
    description:
      "A five-scene visual tour of browsers, servers, DNS, HTTP requests, rendering, and a quick knowledge check.",
    preview: "rendered",
    icon: Cpu,
    script: webDevBasics,
  },
]
