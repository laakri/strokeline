import type { LucideIcon } from "lucide-react"
import { GitBranch, Network, PanelsTopLeft, Workflow, UsersRound, Waypoints } from "lucide-react"

export type DiagramTemplateCategory = "UML" | "Agile" | "Process"
export type DiagramPreviewKind = "use-case" | "class" | "sequence" | "scrum" | "flowchart" | "erd"

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

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: "use-case",
    title: "Use case diagram",
    category: "UML",
    description: "Map people, system boundaries, and the actions they need.",
    preview: "use-case",
    icon: UsersRound,
    script: header + `SCENE 1 "Issue tracker use cases"
  CREATE title AS TEXT
    TEXT "Issue tracker"
    POSITION 960 170
    SIZE 56
    COLOR #172554
  END
  CREATE systemBoundary AS RECTANGLE
    POSITION 960 580
    WIDTH 1130
    HEIGHT 700
    COLOR #94A3B8
    FILL #FFFFFF
    DRAW 0.5s
  END
  CREATE systemLabel AS TEXT
    TEXT "ISSUE TRACKER SYSTEM"
    POSITION 960 270
    SIZE 28
    COLOR #64748B
  END
  CREATE browseIssues AS ELLIPSE
    TEXT "Browse issues"
    POSITION 730 440
    WIDTH 310
    HEIGHT 132
    COLOR #2563EB
    FILL #EFF6FF
    DRAW 0.55s
  END
  CREATE createIssue AS ELLIPSE
    TEXT "Create an issue"
    POSITION 730 680
    WIDTH 310
    HEIGHT 132
    COLOR #2563EB
    FILL #EFF6FF
    DRAW 0.55s
  END
  CREATE manageTeam AS ELLIPSE
    TEXT "Manage team"
    POSITION 1190 440
    WIDTH 310
    HEIGHT 132
    COLOR #0F766E
    FILL #F0FDFA
    DRAW 0.55s
  END
  CREATE closeSprint AS ELLIPSE
    TEXT "Close sprint"
    POSITION 1190 720
    WIDTH 310
    HEIGHT 132
    COLOR #0F766E
    FILL #F0FDFA
    DRAW 0.55s
  END
  CREATE authenticate AS ELLIPSE
    TEXT "Authenticate"
    POSITION 730 850
    WIDTH 300
    HEIGHT 112
    COLOR #0F766E
    FILL #F0FDFA
    DRAW 0.55s
  END
  CREATE attachFile AS ELLIPSE
    TEXT "Attach a file"
    POSITION 1360 570
    WIDTH 260
    HEIGHT 112
    COLOR #C2410C
    FILL #FFF7ED
    DRAW 0.55s
  END
  CREATE member AS ICON
    POSITION 240 565
    SIZE 112
    NAME user-round
    COLOR #334155
  END
  CREATE memberLabel AS TEXT
    TEXT "Team member"
    POSITION 240 665
    SIZE 30
    COLOR #334155
  END
  CREATE admin AS ICON
    POSITION 1680 565
    SIZE 112
    NAME shield-user
    COLOR #334155
  END
  CREATE adminLabel AS TEXT
    TEXT "Administrator"
    POSITION 1680 665
    SIZE 30
    COLOR #334155
  END
  ARROW member -> browseIssues
    ROUTE straight
    HEAD none
    COLOR #64748B
    DRAW 0.65s
  ARROW member -> createIssue
    ROUTE straight
    HEAD none
    COLOR #64748B
    DRAW 0.65s
  ARROW admin -> manageTeam
    ROUTE straight
    HEAD none
    COLOR #64748B
    DRAW 0.65s
  ARROW admin -> closeSprint
    ROUTE straight
    HEAD none
    COLOR #64748B
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
]
