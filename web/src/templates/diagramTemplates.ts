import type { LucideIcon } from "lucide-react"
import {
  ArrowLeftRight,
  GitBranch,
  Network,
  PackageOpen,
  PanelsTopLeft,
  Quote,
  Sparkles,
  Timer,
  Workflow,
  UsersRound,
  Waypoints,
} from "lucide-react"

export type DiagramTemplateCategory = "UML" | "Agile" | "Process" | "Reels"
export type DiagramPreviewKind = "use-case" | "class" | "sequence" | "scrum" | "flowchart" | "erd" | "reels"

export interface DiagramTemplate {
  id: string
  title: string
  category: DiagramTemplateCategory
  description: string
  preview: DiagramPreviewKind
  icon: LucideIcon
  script: string
}

const header = `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #F8FAFC
STYLE clean
FONT neat
STROKE 3

`

const reelsHeader = `VERSION 1.0
CANVAS 1080 1920
BACKGROUND #101827
STYLE clean
FONT neat
STROKE 4

`

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: "use-case",
    title: "Use case diagram",
    category: "UML",
    description: "Explore a complete use-case model with a smooth guided camera tour.",
    preview: "use-case",
    icon: UsersRound,
    script: header.replace("CANVAS 1920 1080", "CANVAS 1920 2200") + `SCENE 1 "Issue tracker use cases"
  PARALLEL
    CREATE title AS TEXT
      TEXT "Issue tracker"
      POSITION 960 100
      SIZE 58
      COLOR #172554
    END
    CREATE systemBoundary AS RECTANGLE
      POSITION 960 1160
      WIDTH 1250
      HEIGHT 1930
      CORNERS 28
      COLOR #94A3B8
      FILL #FFFFFF
      DRAW 0.65s
    END
    CREATE systemLabel AS TEXT
      TEXT "ISSUE TRACKER SYSTEM"
      POSITION 960 245
      SIZE 28
      COLOR #64748B
    END
    CREATE discoverySection AS TEXT
      TEXT "01  DISCOVER & CREATE"
      POSITION 960 335
      SIZE 24
      COLOR #64748B
    END
    CREATE workflowSection AS TEXT
      TEXT "02  COLLABORATE"
      POSITION 960 900
      SIZE 24
      COLOR #64748B
    END
    CREATE deliverySection AS TEXT
      TEXT "03  REPORT & ADMINISTER"
      POSITION 960 1470
      SIZE 24
      COLOR #64748B
    END
    CREATE browseIssues AS ELLIPSE
      TEXT "Browse issues"
      POSITION 700 465
      WIDTH 330
      HEIGHT 132
      COLOR #2563EB
      FILL #EFF6FF
      DRAW 0.65s
    END
    CREATE createIssue AS ELLIPSE
      TEXT "Create an issue"
      POSITION 700 650
      WIDTH 330
      HEIGHT 132
      COLOR #2563EB
      FILL #EFF6FF
      DRAW 0.65s
    END
    CREATE triageIssue AS ELLIPSE
      TEXT "Triage issue"
      POSITION 1220 465
      WIDTH 330
      HEIGHT 132
      COLOR #0F766E
      FILL #F0FDFA
      DRAW 0.65s
    END
    CREATE assignIssue AS ELLIPSE
      TEXT "Assign an issue"
      POSITION 1220 650
      WIDTH 330
      HEIGHT 132
      COLOR #0F766E
      FILL #F0FDFA
      DRAW 0.65s
    END
    CREATE commentIssue AS ELLIPSE
      TEXT "Comment on issue"
      POSITION 700 1035
      WIDTH 350
      HEIGHT 132
      COLOR #2563EB
      FILL #EFF6FF
      DRAW 0.65s
    END
    CREATE attachFile AS ELLIPSE
      TEXT "Attach a file"
      POSITION 700 1220
      WIDTH 330
      HEIGHT 132
      COLOR #C2410C
      FILL #FFF7ED
      DRAW 0.65s
    END
    CREATE authenticate AS ELLIPSE
      TEXT "Authenticate"
      POSITION 1220 1035
      WIDTH 330
      HEIGHT 132
      COLOR #0F766E
      FILL #F0FDFA
      DRAW 0.65s
    END
    CREATE notifyTeam AS ELLIPSE
      TEXT "Notify team"
      POSITION 1220 1220
      WIDTH 330
      HEIGHT 132
      COLOR #0F766E
      FILL #F0FDFA
      DRAW 0.65s
    END
    CREATE viewReports AS ELLIPSE
      TEXT "View reports"
      POSITION 700 1605
      WIDTH 330
      HEIGHT 132
      COLOR #2563EB
      FILL #EFF6FF
      DRAW 0.65s
    END
    CREATE exportReport AS ELLIPSE
      TEXT "Export report"
      POSITION 700 1790
      WIDTH 330
      HEIGHT 132
      COLOR #2563EB
      FILL #EFF6FF
      DRAW 0.65s
    END
    CREATE manageTeam AS ELLIPSE
      TEXT "Manage team"
      POSITION 1220 1605
      WIDTH 330
      HEIGHT 132
      COLOR #0F766E
      FILL #F0FDFA
      DRAW 0.65s
    END
    CREATE manageRoles AS ELLIPSE
      TEXT "Manage roles"
      POSITION 1220 1790
      WIDTH 330
      HEIGHT 132
      COLOR #0F766E
      FILL #F0FDFA
      DRAW 0.65s
    END
    CREATE member AS ICON
      POSITION 180 560
      SIZE 96
      NAME user-round
      COLOR #334155
    END
    CREATE memberLabel AS TEXT
      TEXT "Team member"
      POSITION 180 635
      SIZE 26
      COLOR #334155
    END
    CREATE admin AS ICON
      POSITION 1740 1695
      SIZE 96
      NAME shield-user
      COLOR #334155
    END
    CREATE adminLabel AS TEXT
      TEXT "Administrator"
      POSITION 1740 1770
      SIZE 26
      COLOR #334155
    END
    ARROW member -> browseIssues
      ROUTE straight
      HEAD none
      COLOR #94A3B8
      DRAW 0.65s
    ARROW member -> createIssue
      ROUTE straight
      HEAD none
      COLOR #94A3B8
      DRAW 0.65s
    ARROW admin -> manageTeam
      ROUTE straight
      HEAD none
      COLOR #94A3B8
      DRAW 0.65s
    ARROW admin -> manageRoles
      ROUTE straight
      HEAD none
      COLOR #94A3B8
      DRAW 0.65s
    ARROW createIssue -> authenticate
      ROUTE straight
      LINESTYLE dashed
      HEAD open
      LABEL "«include»"
      COLOR #64748B
      DRAW 0.65s
    ARROW attachFile -> createIssue
      ROUTE straight
      LINESTYLE dashed
      HEAD open
      LABEL "«extend»"
      COLOR #64748B
      DRAW 0.65s
  END

  CAMERA ZOOM
    TARGET systemBoundary
    DURATION 1s
    EASE easeInOut
  WAIT 0.8s
  CAMERA ZOOM
    SCALE 1
    DURATION 1s
    EASE easeInOut
  CAMERA PAN
    TO 960 520
    DURATION 1.2s
    EASE easeInOut
  WAIT 0.6s
  CAMERA PAN
    TO 960 1120
    DURATION 1.2s
    EASE easeInOut
  WAIT 0.6s
  CAMERA PAN
    TO 960 1660
    DURATION 1.2s
    EASE easeInOut
  WAIT 0.8s
  CAMERA RESET
    DURATION 1s
    EASE easeInOut
END SCENE
`,
  },
  {
    id: "class-diagram",
    title: "Class diagram",
    category: "UML",
    description: "Show class fields, operations, and how the pieces relate.",
    preview: "class",
    icon: Network,
    script: header + `SCENE 1 "Issue tracker classes"
  CREATE title AS TEXT
    TEXT "Issue tracker · class model"
    POSITION 960 170
    SIZE 54
    COLOR #172554
  END
  TABLE userClass
    POSITION 345 555
    SIZE 440 510
    COLUMNS "User"
    ROW "id: UUID"
    ROW "+ createBoard()"
    DIVIDER 1
    HEADERCOLOR #DBEAFE
    FILL #FFFFFF
    COLOR #1E293B
    DRAW 0.7s
  END
  TABLE boardClass
    POSITION 960 555
    SIZE 440 510
    COLUMNS "Board"
    ROW "id: UUID"
    ROW "+ addTask()"
    DIVIDER 1
    HEADERCOLOR #CCFBF1
    FILL #FFFFFF
    COLOR #1E293B
    DRAW 0.7s
  END
  TABLE taskClass
    POSITION 1575 555
    SIZE 440 510
    COLUMNS "Task"
    ROW "id: UUID"
    ROW "status: Status"
    ROW "+ moveTo(status)"
    DIVIDER 2
    HEADERCOLOR #FEF3C7
    FILL #FFFFFF
    COLOR #1E293B
    DRAW 0.7s
  END
  ARROW userClass -> boardClass
    ROUTE straight
    HEAD end
    COLOR #475569
    DRAW 0.65s
  ARROW taskClass -> boardClass
    LABEL "composition"
    ROUTE straight
    HEAD diamond-filled
    SOURCELABEL "0..*"
    TARGETLABEL "1"
    COLOR #475569
    DRAW 0.65s
END SCENE
`,
  },
  {
    id: "sequence-diagram",
    title: "Sequence diagram",
    category: "UML",
    description: "Lay out a request, the response, and each system involved.",
    preview: "sequence",
    icon: Waypoints,
    script: header + `SCENE 1 "Sign-in sequence"
  CREATE title AS TEXT
    TEXT "Sign-in request"
    POSITION 960 170
    SIZE 54
    COLOR #172554
  END
  CREATE browser AS RECTANGLE
    TEXT "Browser"
    POSITION 330 280
    WIDTH 250
    HEIGHT 104
    COLOR #2563EB
    FILL #EFF6FF
  END
  CREATE api AS RECTANGLE
    TEXT "Auth API"
    POSITION 960 280
    WIDTH 250
    HEIGHT 104
    COLOR #0F766E
    FILL #F0FDFA
  END
  CREATE database AS RECTANGLE
    TEXT "Database"
    POSITION 1590 280
    WIDTH 250
    HEIGHT 104
    COLOR #B45309
    FILL #FFFBEB
  END
  CREATE browserLife AS LINE
    FROM 330 340
    TO 330 950
    COLOR #94A3B8
    LINESTYLE dashed
    DRAW 0.7s
  END
  CREATE apiLife AS LINE
    FROM 960 340
    TO 960 950
    COLOR #94A3B8
    LINESTYLE dashed
    DRAW 0.7s
  END
  CREATE databaseLife AS LINE
    FROM 1590 340
    TO 1590 950
    COLOR #94A3B8
    LINESTYLE dashed
    DRAW 0.7s
  END
  CREATE loginLabel AS TEXT
    TEXT "1 · Submit credentials"
    POSITION 645 415
    SIZE 28
    COLOR #334155
  END
  INK ARROW FROM 455 455 TO 835 455
    COLOR #2563EB
    WIDTH 4
    DRAW 0.55s
  END
  CREATE lookupLabel AS TEXT
    TEXT "2 · Look up account"
    POSITION 1275 540
    SIZE 28
    COLOR #334155
  END
  INK ARROW FROM 1085 580 TO 1465 580
    COLOR #0F766E
    WIDTH 4
    DRAW 0.55s
  END
  CREATE resultLabel AS TEXT
    TEXT "3 · Account found"
    POSITION 1275 665
    SIZE 28
    COLOR #334155
  END
  INK ARROW FROM 1465 705 TO 1085 705
    COLOR #B45309
    WIDTH 4
    DRAW 0.55s
  END
  CREATE responseLabel AS TEXT
    TEXT "4 · Return session"
    POSITION 645 790
    SIZE 28
    COLOR #334155
  END
  INK ARROW FROM 835 830 TO 455 830
    COLOR #2563EB
    WIDTH 4
    DRAW 0.55s
  END
END SCENE
`,
  },
  {
    id: "scrum-board",
    title: "Scrum board",
    category: "Agile",
    description: "Track a sprint across backlog, ready, active, and done.",
    preview: "scrum",
    icon: PanelsTopLeft,
    script: header + `SCENE 1 "Sprint board"
  CREATE title AS TEXT
    TEXT "Sprint 08 · Team Atlas"
    POSITION 960 170
    SIZE 54
    COLOR #172554
  END
  TABLE backlog
    POSITION 270 570
    SIZE 390 690
    COLUMNS "BACKLOG"
    ROW "Invite flow · 3 pts"
    ROW "Saved filters · 2 pts"
    HEADERCOLOR #E2E8F0
    FILL #FFFFFF
    COLOR #1E293B
    DRAW 0.7s
  END
  TABLE ready
    POSITION 730 570
    SIZE 390 690
    COLUMNS "READY"
    ROW "Filter tasks · 3 pts"
    ROW "Empty-state copy · 2 pts"
    HEADERCOLOR #DBEAFE
    FILL #FFFFFF
    COLOR #1E293B
    DRAW 0.7s
  END
  TABLE inProgress
    POSITION 1190 570
    SIZE 390 690
    COLUMNS "IN PROGRESS"
    ROW "Board drag · 5 pts"
    ROW "API integration · 8 pts"
    HEADERCOLOR #FEF3C7
    FILL #FFFFFF
    COLOR #1E293B
    DRAW 0.7s
  END
  TABLE done
    POSITION 1650 570
    SIZE 390 690
    COLUMNS "DONE"
    ROW "Sign-in · 3 pts"
    HEADERCOLOR #DCFCE7
    FILL #FFFFFF
    COLOR #1E293B
    DRAW 0.7s
  END
END SCENE
`,
  },
  {
    id: "flowchart",
    title: "Flowchart",
    category: "Process",
    description: "Sketch a process and show what happens at each decision.",
    preview: "flowchart",
    icon: Workflow,
    script: header + `SCENE 1 "Review and publish"
  CREATE title AS TEXT
    TEXT "Review and publish"
    POSITION 960 170
    SIZE 54
    COLOR #172554
  END
  CREATE start AS ELLIPSE
    TEXT "Start"
    POSITION 245 520
    WIDTH 220
    HEIGHT 112
    COLOR #2563EB
    FILL #EFF6FF
    DRAW 0.55s
  END
  CREATE review AS RECTANGLE
    TEXT "Review draft"
    POSITION 625 520
    WIDTH 260
    HEIGHT 132
    COLOR #2563EB
    FILL #EFF6FF
    DRAW 0.55s
  END
  CREATE approved AS ELLIPSE
    TEXT "Approved?"
    POSITION 1010 520
    WIDTH 240
    HEIGHT 132
    COLOR #7C3AED
    FILL #F5F3FF
    DRAW 0.55s
  END
  CREATE publish AS RECTANGLE
    TEXT "Publish"
    POSITION 1460 365
    WIDTH 260
    HEIGHT 132
    COLOR #0F766E
    FILL #F0FDFA
    DRAW 0.55s
  END
  CREATE revise AS RECTANGLE
    TEXT "Revise draft"
    POSITION 1460 710
    WIDTH 260
    HEIGHT 132
    COLOR #B45309
    FILL #FFFBEB
    DRAW 0.55s
  END
  CREATE finish AS ELLIPSE
    TEXT "Done"
    POSITION 1715 365
    WIDTH 160
    HEIGHT 112
    COLOR #0F766E
    FILL #F0FDFA
    DRAW 0.55s
  END
  ARROW start -> review
    ROUTE straight
    COLOR #64748B
    DRAW 0.6s
  ARROW review -> approved
    ROUTE straight
    COLOR #64748B
    DRAW 0.6s
  ARROW approved -> publish
    LABEL "Yes"
    VIA 1220 410
    COLOR #0F766E
    DRAW 0.6s
  ARROW approved -> revise
    LABEL "No"
    VIA 1220 650
    COLOR #B45309
    DRAW 0.6s
  ARROW publish -> finish
    ROUTE straight
    COLOR #0F766E
    DRAW 0.6s
  ARROW revise -> review
    ROUTE elbow
    VIA 1100 830 610 830
    COLOR #B45309
    DRAW 0.6s
END SCENE
`,
  },
  {
    id: "entity-relationship",
    title: "Entity relationship diagram",
    category: "Process",
    description: "Outline entities, key fields, and one-to-many relationships.",
    preview: "erd",
    icon: GitBranch,
    script: header + `SCENE 1 "Project tracker data model"
  CREATE title AS TEXT
    TEXT "Project tracker · data model"
    POSITION 960 170
    SIZE 54
    COLOR #172554
  END
  TABLE users
    POSITION 350 555
    SIZE 420 530
    COLUMNS "USER"
    ROW "PK  id: UUID"
    ROW "    name: text"
    HEADERCOLOR #DBEAFE
    FILL #FFFFFF
    COLOR #1E293B
    DRAW 0.7s
  END
  TABLE projects
    POSITION 960 555
    SIZE 420 530
    COLUMNS "PROJECT"
    ROW "PK  id: UUID"
    ROW "FK  owner_id: UUID"
    HEADERCOLOR #CCFBF1
    FILL #FFFFFF
    COLOR #1E293B
    DRAW 0.7s
  END
  TABLE tasks
    POSITION 1570 555
    SIZE 420 530
    COLUMNS "TASK"
    ROW "PK  id: UUID"
    ROW "FK  project_id: UUID"
    HEADERCOLOR #FEF3C7
    FILL #FFFFFF
    COLOR #1E293B
    DRAW 0.7s
  END
  ARROW users -> projects
    LABEL "owns 1..*"
    ROUTE straight
    HEAD none
    COLOR #475569
    DRAW 0.65s
  ARROW projects -> tasks
    LABEL "has 1..*"
    ROUTE straight
    HEAD none
    COLOR #475569
    DRAW 0.65s
END SCENE
`,
  },
  {
    id: "reels-hook-tips",
    title: "Hook + 3 tips",
    category: "Reels",
    description: "A punchy opening followed by three clear, caption-ready tips.",
    preview: "reels",
    icon: Sparkles,
    script: reelsHeader + `SCENE 1 "Three quick tips"
  CREATE hook AS TEXT
    TEXT "MAKE IT CLEAR"
    POSITION 540 390
    SIZE 78
    COLOR #F8FAFC
    DRAW 0.5s
  END
  CREATE tip1 AS TEXT
    TEXT "01  Start with one idea"
    POSITION 540 670
    SIZE 42
    COLOR #A7F3D0
    DRAW 0.4s
  END
  CREATE tip2 AS TEXT
    TEXT "02  Show, then explain"
    POSITION 540 920
    SIZE 42
    COLOR #BFDBFE
    DRAW 0.4s
  END
  CREATE tip3 AS TEXT
    TEXT "03  End with a next step"
    POSITION 540 1170
    SIZE 42
    COLOR #FDE68A
    DRAW 0.4s
  END
  SAY "Three quick tips to make your next diagram easier to follow."
    DURATION 4s
END SCENE
`,
  },
  {
    id: "reels-before-after",
    title: "Before / after",
    category: "Reels",
    description: "Contrast a messy starting point with a clean transformation.",
    preview: "reels",
    icon: ArrowLeftRight,
    script: reelsHeader + `SCENE 1 "Before and after"
  CREATE beforeCard AS RECTANGLE
    POSITION 540 660
    WIDTH 760
    HEIGHT 360
    CORNERS 32
    FILL #2B3546
    COLOR #64748B
    TEXT "BEFORE   ·   TOO MUCH AT ONCE"
    SIZE 38
    DRAW 0.6s
  END
  CREATE afterCard AS RECTANGLE
    POSITION 540 1130
    WIDTH 760
    HEIGHT 360
    CORNERS 32
    FILL #123B3A
    COLOR #34D399
    TEXT "AFTER   ·   ONE CLEAR STORY"
    SIZE 38
    DRAW 0.6s
  END
  SAY "Same idea. A clearer story."
    DURATION 2.5s
END SCENE
`,
  },
  {
    id: "reels-product-reveal",
    title: "Product reveal",
    category: "Reels",
    description: "A bold product card with space for a name, promise, and call to action.",
    preview: "reels",
    icon: PackageOpen,
    script: reelsHeader + `SCENE 1 "Product reveal"
  CREATE glow AS CIRCLE
    POSITION 540 790
    RADIUS 235
    FILL #183B55
    GRADIENT #2563EB #14B8A6
    SHADOW 32
    DRAW 0.8s
  END
  CREATE product AS TEXT
    TEXT "YOUR NEXT BIG THING"
    POSITION 540 790
    SIZE 64
    COLOR #FFFFFF
    DRAW 0.6s
  END
  CREATE promise AS TEXT
    TEXT "A simpler way to get it done."
    POSITION 540 1190
    SIZE 38
    COLOR #CBD5E1
    DRAW 0.5s
  END
  SAY "Meet the product that makes your next step simpler."
    DURATION 3.5s
END SCENE
`,
  },
  {
    id: "reels-quote-card",
    title: "Quote card",
    category: "Reels",
    description: "A high-contrast quote treatment with an editable author line.",
    preview: "reels",
    icon: Quote,
    script: reelsHeader + `SCENE 1 "Quote card"
  CREATE quotePanel AS RECTANGLE
    POSITION 540 930
    WIDTH 820
    HEIGHT 780
    CORNERS 40
    FILL #172554
    GRADIENT #172554 #134E4A
    SHADOW 24
    COLOR #60A5FA
    DRAW 0.7s
  END
  CREATE quote AS TEXT
    TEXT "“Great work is a series of small, clear steps.”"
    POSITION 540 850
    SIZE 58
    MAXWIDTH 690
    COLOR #F8FAFC
    DRAW 0.6s
  END
  CREATE author AS TEXT
    TEXT "— YOUR NAME"
    POSITION 540 1220
    SIZE 32
    COLOR #A7F3D0
    DRAW 0.4s
  END
  SAY "Great work is a series of small, clear steps."
    DURATION 3s
END SCENE
`,
  },
  {
    id: "reels-countdown",
    title: "Countdown",
    category: "Reels",
    description: "A bold 3–2–1 countdown that ends on an editable call to action.",
    preview: "reels",
    icon: Timer,
    script: reelsHeader + `SCENE 1 "Countdown"
  CREATE title AS TEXT
    TEXT "READY?"
    POSITION 540 430
    SIZE 60
    COLOR #CBD5E1
    DRAW 0.4s
  END
  CREATE count3 AS TEXT
    TEXT "3"
    POSITION 540 720
    SIZE 180
    COLOR #60A5FA
    DRAW 0.35s
  END
  CREATE count2 AS TEXT
    TEXT "2"
    POSITION 540 960
    SIZE 180
    COLOR #34D399
    DRAW 0.35s
  END
  CREATE count1 AS TEXT
    TEXT "1"
    POSITION 540 1200
    SIZE 180
    COLOR #FBBF24
    DRAW 0.35s
  END
  SAY "Three. Two. One. Let's go."
    DURATION 3s
END SCENE
`,
  },
]
