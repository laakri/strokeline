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
export type DiagramPreviewKind =
  | "use-case"
  | "class"
  | "sequence"
  | "scrum"
  | "sailboat"
  | "flowchart"
  | "erd"
  | "reels"

export interface DiagramTemplate {
  id: string
  title: string
  category: DiagramTemplateCategory
  description: string
  preview: DiagramPreviewKind
  icon: LucideIcon
  script: string
}

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
    description:
      "A polished online-store use-case model with actors, relationships, and animated highlights.",
    preview: "use-case",
    icon: UsersRound,
    script: `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #F7F9FC
BOARD plain
STYLE clean
FONT neat
STROKE 3

SCENE 1 "Use Case Diagram Template"

  # ---- title ----
  CREATE title AS TEXT
    TEXT "Online Store - Use Case Diagram"
    POSITION 960 130
    SIZE 44
    COLOR #1F2A44
    DRAW 0.4s
  END

  # ---- system boundary ----
  CREATE boundary AS RECTANGLE
    POSITION 960 500
    WIDTH 1080
    HEIGHT 640
    CORNERS 24
    COLOR #8A98B3
    FILL #FFFFFF
    STROKE 3
    SHADOW 10
    DRAW 0.5s
  END

  # ---- use cases: left column (pill-shaped) ----
  CREATE ucBrowse AS RECTANGLE
    POSITION 700 300
    WIDTH 300
    HEIGHT 110
    CORNERS 55
    COLOR #1F5F82
    FILL #EAF4FA
    STROKE 3
    TEXT "Browse Products"
    DRAW 0.4s
  END

  CREATE ucOrder AS RECTANGLE
    POSITION 700 480
    WIDTH 300
    HEIGHT 110
    CORNERS 55
    COLOR #1F5F82
    FILL #EAF4FA
    STROKE 3
    TEXT "Place Order"
    DRAW 0.4s
  END

  CREATE ucTrack AS RECTANGLE
    POSITION 700 660
    WIDTH 300
    HEIGHT 110
    CORNERS 55
    COLOR #1F5F82
    FILL #EAF4FA
    STROKE 3
    TEXT "Track Order"
    DRAW 0.4s
  END

  # ---- use cases: right column ----
  CREATE ucCoupon AS RECTANGLE
    POSITION 1220 300
    WIDTH 300
    HEIGHT 110
    CORNERS 55
    COLOR #1F5F82
    FILL #EAF4FA
    STROKE 3
    TEXT "Apply Coupon"
    DRAW 0.4s
  END

  CREATE ucPay AS RECTANGLE
    POSITION 1220 480
    WIDTH 300
    HEIGHT 110
    CORNERS 55
    COLOR #1F5F82
    FILL #EAF4FA
    STROKE 3
    TEXT "Make Payment"
    DRAW 0.4s
  END

  CREATE ucManage AS RECTANGLE
    POSITION 1220 660
    WIDTH 300
    HEIGHT 110
    CORNERS 55
    COLOR #1F5F82
    FILL #EAF4FA
    STROKE 3
    TEXT "Manage Products"
    DRAW 0.4s
  END

  # ---- actors ----
  CREATE actCustomer AS ICON
    POSITION 240 480
    SIZE 120
    NAME user-round
    COLOR #1F2A44
  END

  CREATE lblCustomer AS TEXT
    TEXT "Customer"
    POSITION 240 580
    SIZE 32
    COLOR #1F2A44
    DRAW 0.3s
  END

  CREATE actGateway AS ICON
    POSITION 1700 480
    SIZE 120
    NAME server
    COLOR #1F2A44
  END

  CREATE lblGateway AS TEXT
    TEXT "Payment API"
    POSITION 1700 580
    SIZE 32
    COLOR #1F2A44
    DRAW 0.3s
  END

  CREATE actAdmin AS ICON
    POSITION 1700 700
    SIZE 120
    NAME user-round
    COLOR #1F2A44
  END

  CREATE lblAdmin AS TEXT
    TEXT "Admin"
    POSITION 1700 800
    SIZE 32
    COLOR #1F2A44
    DRAW 0.3s
  END

  # ---- associations (solid, no head) ----
  ARROW actCustomer -> ucBrowse
    ROUTE straight
    HEAD none
    COLOR #1F2A44
    STROKE 3
    DRAW 0.3s

  ARROW actCustomer -> ucOrder
    ROUTE straight
    HEAD none
    COLOR #1F2A44
    STROKE 3
    DRAW 0.3s

  ARROW actCustomer -> ucTrack
    ROUTE straight
    HEAD none
    COLOR #1F2A44
    STROKE 3
    DRAW 0.3s

  ARROW actGateway -> ucPay
    ROUTE straight
    HEAD none
    COLOR #1F2A44
    STROKE 3
    DRAW 0.3s

  ARROW actAdmin -> ucManage
    ROUTE straight
    HEAD none
    COLOR #1F2A44
    STROKE 3
    DRAW 0.3s

  # ---- include: base use case -> included use case ----
  ARROW ucOrder -> ucPay
    ROUTE straight
    LINESTYLE dashed
    HEAD open
    LABEL "«include»"
    COLOR #B8431F
    STROKE 3
    DRAW 0.4s

  # ---- extend: optional use case -> base use case ----
  ARROW ucCoupon -> ucOrder
    ROUTE straight
    LINESTYLE dashed
    HEAD open
    LABEL "«extend»"
    COLOR #6B2C91
    STROKE 3
    DRAW 0.4s

  # ---- legend ----
  CREATE legLine1 AS LINE
    FROM 480 920
    TO 600 920
    COLOR #1F2A44
    STROKE 3
    DRAW 0.3s
  END

  CREATE legLine2 AS LINE
    FROM 1000 920
    TO 1120 920
    COLOR #B8431F
    STROKE 3
    LINESTYLE dashed
    DRAW 0.3s
  END

  # ---- subtle motion ----
  ANIMATE ucOrder HIGHLIGHT
    COLOR #FFF3B0
    DURATION 1s

  ANIMATE ucPay HIGHLIGHT
    COLOR #FFF3B0
    DURATION 1s

  ANIMATE ucCoupon HIGHLIGHT
    COLOR #E9D8F4
    DURATION 1s
END SCENE
`,
  },
  {
    id: "class-diagram",
    title: "Class diagram",
    category: "UML",
    description:
      "Model an online store with expressive classes, multiplicities, composition, and inheritance.",
    preview: "class",
    icon: Network,
    script: `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #F7F9FC
BOARD plain
STYLE clean
FONT neat
STROKE 3

SCENE 1 "Class Diagram Template"

  # ---- title ----
  CREATE title AS TEXT
    TEXT "Online Store - Class Diagram"
    POSITION 960 120
    SIZE 44
    COLOR #1F2A44
    DRAW 0.4s
  END

  # ---- top row: entity, aggregate root, abstract class ----
  TABLE custTbl
    POSITION 300 300
    SIZE 340 230
    COLUMNS "«entity» Customer"
    ROW "- id: int {readOnly}"
    ROW "- name: String"
    ROW "+ placeOrder(): Order"
    DIVIDER 2
    HEADERCOLOR #1F5F82
    DRAW 0.6s
  END

  TABLE orderTbl
    POSITION 860 300
    SIZE 340 230
    COLUMNS "«aggregate root» Order"
    ROW "- orderId: int"
    ROW "+ {static} count: int"
    ROW "+ total(): Money"
    DIVIDER 2
    HEADERCOLOR #1B3A57
    DRAW 0.6s
  END

  TABLE payTbl
    POSITION 1440 300
    SIZE 340 230
    COLUMNS "«abstract» Payment"
    ROW "- amount: Money"
    ROW "# status: String"
    ROW "+ pay(): boolean {abstract}"
    DIVIDER 2
    HEADERCOLOR #6B2C91
    DRAW 0.6s
  END

  # ---- bottom row: entity, value object, concrete subclasses ----
  TABLE prodTbl
    POSITION 300 780
    SIZE 340 230
    COLUMNS "«entity» Product"
    ROW "- sku: String {unique}"
    ROW "- title: String"
    ROW "+ {static} findBySku(): Product"
    DIVIDER 2
    HEADERCOLOR #1F5F82
    DRAW 0.6s
  END

  TABLE itemTbl
    POSITION 860 780
    SIZE 340 230
    COLUMNS "«value object» OrderItem"
    ROW "- quantity: int {readOnly}"
    ROW "- unitPrice: Money"
    ROW "+ subtotal(): Money"
    DIVIDER 2
    HEADERCOLOR #0F6B5C
    DRAW 0.6s
  END

  TABLE cardTbl
    POSITION 1250 780
    SIZE 300 170
    COLUMNS "«concrete» CardPayment"
    ROW "- cardNo: String"
    ROW "+ pay(): boolean"
    DIVIDER 1
    HEADERCOLOR #8A2B5E
    DRAW 0.6s
  END

  TABLE paypalTbl
    POSITION 1620 780
    SIZE 300 170
    COLUMNS "«concrete» PayPalPayment"
    ROW "- email: String"
    ROW "+ pay(): boolean"
    DIVIDER 1
    HEADERCOLOR #8A2B5E
    DRAW 0.6s
  END

  # ---- association: Customer places Orders ----
  ARROW custTbl -> orderTbl
    ROUTE straight
    HEAD none
    LABEL "places"
    SOURCELABEL "1"
    TARGETLABEL "0..*"
    COLOR #1F2A44
    STROKE 3
    DRAW 0.4s

  # ---- association: Order is paid by Payment ----
  ARROW orderTbl -> payTbl
    ROUTE straight
    HEAD none
    LABEL "paid by"
    SOURCELABEL "1"
    TARGETLABEL "1..*"
    COLOR #1F2A44
    STROKE 3
    DRAW 0.4s

  # ---- composition: OrderItem is part of Order ----
  ARROW itemTbl -> orderTbl
    ROUTE straight
    HEAD diamond-filled
    LABEL "part of"
    SOURCELABEL "1..*"
    TARGETLABEL "1"
    COLOR #1F2A44
    STROKE 3
    DRAW 0.4s

  # ---- dependency: OrderItem refers to Product ----
  ARROW itemTbl -> prodTbl
    ROUTE straight
    LINESTYLE dashed
    HEAD open
    LABEL "refers to"
    COLOR #B8431F
    STROKE 3
    DRAW 0.4s

  # ---- inheritance: concrete payments extend Payment ----
  ARROW cardTbl -> payTbl
    ROUTE elbow
    HEAD triangle
    LABEL "extends"
    COLOR #6B2C91
    STROKE 3
    DRAW 0.4s

  ARROW paypalTbl -> payTbl
    ROUTE elbow
    HEAD triangle
    LABEL "extends"
    COLOR #6B2C91
    STROKE 3
    DRAW 0.4s

  # ---- motion so the scene is not static ----
  ANIMATE payTbl HIGHLIGHT
    COLOR #E9D8F4
    DURATION 1s

  ANIMATE itemTbl HIGHLIGHT
    COLOR #FFF3B0
    DURATION 1s

  # ---- close scene 1 ----
END SCENE
`,
  },
  {
    id: "sequence-diagram",
    title: "Sequence diagram",
    category: "UML",
    description:
      "A clear sign-in sequence across the customer, web app, auth service, and user database.",
    preview: "sequence",
    icon: Waypoints,
    script: `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #FFFFFF
BOARD plain
STYLE clean
FONT neat
STROKE 3

SCENE 1 "Sequence Diagram - Sign In"

  # ---- title ----
  CREATE title AS TEXT
    TEXT "Sign In - Sequence Diagram"
    POSITION 960 110
    SIZE 44
    COLOR #1F2A44
    DRAW 0.4s
  END

  # ---- participants ----
  CREATE pCust AS RECTANGLE
    POSITION 330 220
    WIDTH 260
    HEIGHT 80
    CORNERS 10
    COLOR #1F2A44
    FILL #FDEBD0
    STROKE 3
    TEXT "Customer"
    DRAW 0.4s
  END

  CREATE pWeb AS RECTANGLE
    POSITION 750 220
    WIDTH 260
    HEIGHT 80
    CORNERS 10
    COLOR #1F2A44
    FILL #EAF4FA
    STROKE 3
    TEXT "Web App"
    DRAW 0.4s
  END

  CREATE pAuth AS RECTANGLE
    POSITION 1170 220
    WIDTH 260
    HEIGHT 80
    CORNERS 10
    COLOR #1F2A44
    FILL #EAF4FA
    STROKE 3
    TEXT "Auth Service"
    DRAW 0.4s
  END

  CREATE pDb AS RECTANGLE
    POSITION 1590 220
    WIDTH 260
    HEIGHT 80
    CORNERS 10
    COLOR #1F2A44
    FILL #E3F4EC
    STROKE 3
    TEXT "User DB"
    DRAW 0.4s
  END

  # ---- lifelines ----
  PARALLEL
    CREATE lifeCust AS LINE
      FROM 330 260
      TO 330 960
      COLOR #8A98B3
      STROKE 2
      LINESTYLE dashed
      DRAW 0.5s
    END
    CREATE lifeWeb AS LINE
      FROM 750 260
      TO 750 960
      COLOR #8A98B3
      STROKE 2
      LINESTYLE dashed
      DRAW 0.5s
    END
    CREATE lifeAuth AS LINE
      FROM 1170 260
      TO 1170 960
      COLOR #8A98B3
      STROKE 2
      LINESTYLE dashed
      DRAW 0.5s
    END
    CREATE lifeDb AS LINE
      FROM 1590 260
      TO 1590 960
      COLOR #8A98B3
      STROKE 2
      LINESTYLE dashed
      DRAW 0.5s
    END
  END

  # ---- activation bars ----
  PARALLEL
    CREATE actCust AS RECTANGLE
      POSITION 330 640
      WIDTH 20
      HEIGHT 540
      COLOR #1F5F82
      FILL #DCE8F3
      STROKE 2
      DRAW 0.3s
    END
    CREATE actWeb AS RECTANGLE
      POSITION 750 640
      WIDTH 20
      HEIGHT 540
      COLOR #1F5F82
      FILL #DCE8F3
      STROKE 2
      DRAW 0.3s
    END
    CREATE actAuth AS RECTANGLE
      POSITION 1170 640
      WIDTH 20
      HEIGHT 320
      COLOR #1F5F82
      FILL #DCE8F3
      STROKE 2
      DRAW 0.3s
    END
    CREATE actDb AS RECTANGLE
      POSITION 1590 640
      WIDTH 20
      HEIGHT 120
      COLOR #1F5F82
      FILL #DCE8F3
      STROKE 2
      DRAW 0.3s
    END
  END

  # ---- alt fragment frame with label tab ----
  CREATE fragFrame AS RECTANGLE
    POSITION 970 795
    WIDTH 1400
    HEIGHT 310
    CORNERS 4
    COLOR #6B2C91
    STROKE 3
    DRAW 0.5s
  END

  CREATE fragTab AS RECTANGLE
    POSITION 400 662
    WIDTH 220
    HEIGHT 44
    CORNERS 4
    COLOR #6B2C91
    FILL #F1E6F8
    STROKE 3
    TEXT "alt [valid]"
    DRAW 0.3s
  END

  # ---- invisible anchors (created together, so no dead time) ----
  PARALLEL
    CREATE a1s AS RECTANGLE
      POSITION 330 380
      WIDTH 4
      HEIGHT 4
      OPACITY 0
      DRAW 0.05s
    END
    CREATE a1t AS RECTANGLE
      POSITION 750 380
      WIDTH 4
      HEIGHT 4
      OPACITY 0
      DRAW 0.05s
    END
    CREATE a2s AS RECTANGLE
      POSITION 750 480
      WIDTH 4
      HEIGHT 4
      OPACITY 0
      DRAW 0.05s
    END
    CREATE a2t AS RECTANGLE
      POSITION 1170 480
      WIDTH 4
      HEIGHT 4
      OPACITY 0
      DRAW 0.05s
    END
    CREATE a3s AS RECTANGLE
      POSITION 1170 580
      WIDTH 4
      HEIGHT 4
      OPACITY 0
      DRAW 0.05s
    END
    CREATE a3t AS RECTANGLE
      POSITION 1590 580
      WIDTH 4
      HEIGHT 4
      OPACITY 0
      DRAW 0.05s
    END
    CREATE a4s AS RECTANGLE
      POSITION 1590 700
      WIDTH 4
      HEIGHT 4
      OPACITY 0
      DRAW 0.05s
    END
    CREATE a4t AS RECTANGLE
      POSITION 1170 700
      WIDTH 4
      HEIGHT 4
      OPACITY 0
      DRAW 0.05s
    END
    CREATE a5s AS RECTANGLE
      POSITION 1170 800
      WIDTH 4
      HEIGHT 4
      OPACITY 0
      DRAW 0.05s
    END
    CREATE a5t AS RECTANGLE
      POSITION 750 800
      WIDTH 4
      HEIGHT 4
      OPACITY 0
      DRAW 0.05s
    END
    CREATE a6s AS RECTANGLE
      POSITION 750 900
      WIDTH 4
      HEIGHT 4
      OPACITY 0
      DRAW 0.05s
    END
    CREATE a6t AS RECTANGLE
      POSITION 330 900
      WIDTH 4
      HEIGHT 4
      OPACITY 0
      DRAW 0.05s
    END
  END

  # ---- calls: solid line, filled head ----
  ARROW a1s -> a1t
    ROUTE straight
    HEAD end
    LABEL "1: login(email, pwd)"
    COLOR #1F2A44
    STROKE 3
    DRAW 0.5s

  ARROW a2s -> a2t
    ROUTE straight
    HEAD end
    LABEL "2: verify(credentials)"
    COLOR #1F2A44
    STROKE 3
    DRAW 0.5s

  ARROW a3s -> a3t
    ROUTE straight
    HEAD end
    LABEL "3: findUser(email)"
    COLOR #1F2A44
    STROKE 3
    DRAW 0.5s

  # ---- returns: dashed line, open head ----
  ARROW a4s -> a4t
    ROUTE straight
    LINESTYLE dashed
    HEAD open
    LABEL "4: userRecord"
    COLOR #4A5568
    STROKE 3
    DRAW 0.5s

  ARROW a5s -> a5t
    ROUTE straight
    LINESTYLE dashed
    HEAD open
    LABEL "5: jwtToken"
    COLOR #0F6B5C
    STROKE 3
    DRAW 0.5s

  ARROW a6s -> a6t
    ROUTE straight
    LINESTYLE dashed
    HEAD open
    LABEL "6: 200 OK + home page"
    COLOR #4A5568
    STROKE 3
    DRAW 0.5s

  ANIMATE pAuth HIGHLIGHT
    COLOR #FFF3B0
    DURATION 1s

  # ---- close scene 1 ----
END SCENE
`,
  },
  {
    id: "scrum-board",
    title: "Scrum board",
    category: "Agile",
    description:
      "Animate a Sprint 12 board from planned work through review and delivery.",
    preview: "scrum",
    icon: PanelsTopLeft,
    script: `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #F4F7FB
BOARD plain
STYLE clean
FONT neat
STROKE 3

SCENE 1 "Scrum Board - Sprint 12"

  # ---- header ----
  CREATE title AS TEXT
    TEXT "Sprint 12 Board (example data)"
    POSITION 960 100
    SIZE 52
    COLOR #1F2A44
    DRAW 0.5s
  END

  # ---- stats strip ----
  PARALLEL
    CREATE chipGoal AS RECTANGLE
      POSITION 330 200
      WIDTH 390
      HEIGHT 56
      CORNERS 28
      COLOR #1F2A44
      FILL #FFFFFF
      STROKE 2
      TEXT "Goal: Checkout v2"
      DRAW 0.4s
    END
    CREATE chipDay AS RECTANGLE
      POSITION 750 200
      WIDTH 390
      HEIGHT 56
      CORNERS 28
      COLOR #1F2A44
      FILL #FFFFFF
      STROKE 2
      TEXT "Day 6 of 10"
      DRAW 0.4s
    END
    CREATE chipPlan AS RECTANGLE
      POSITION 1170 200
      WIDTH 390
      HEIGHT 56
      CORNERS 28
      COLOR #1F2A44
      FILL #FFFFFF
      STROKE 2
      TEXT "Committed: 34 pts"
      DRAW 0.4s
    END
    CREATE chipDone AS RECTANGLE
      POSITION 1590 200
      WIDTH 390
      HEIGHT 56
      CORNERS 28
      COLOR #0F6B5C
      FILL #E3F4EC
      STROKE 2
      TEXT "Done: 13 pts"
      DRAW 0.4s
    END
  END

  # ---- lanes ----
  PARALLEL
    CREATE laneTodo AS RECTANGLE
      POSITION 330 627
      WIDTH 390
      HEIGHT 545
      CORNERS 16
      COLOR #C5D0E0
      FILL #E9EEF6
      STROKE 2
      DRAW 0.6s
    END
    CREATE laneDoing AS RECTANGLE
      POSITION 750 627
      WIDTH 390
      HEIGHT 545
      CORNERS 16
      COLOR #C5D0E0
      FILL #E9EEF6
      STROKE 2
      DRAW 0.6s
    END
    CREATE laneReview AS RECTANGLE
      POSITION 1170 627
      WIDTH 390
      HEIGHT 545
      CORNERS 16
      COLOR #C5D0E0
      FILL #E9EEF6
      STROKE 2
      DRAW 0.6s
    END
    CREATE laneDone AS RECTANGLE
      POSITION 1590 627
      WIDTH 390
      HEIGHT 545
      CORNERS 16
      COLOR #C5D0E0
      FILL #E9EEF6
      STROKE 2
      DRAW 0.6s
    END
  END

  # ---- lane headers (white text on dark fills) ----
  PARALLEL
    CREATE hdrTodo AS RECTANGLE
      POSITION 330 320
      WIDTH 390
      HEIGHT 70
      CORNERS 16
      COLOR #3B4658
      FILL #3B4658
      TEXT "To Do"
      DRAW 0.4s
    END
    CREATE hdrDoing AS RECTANGLE
      POSITION 750 320
      WIDTH 390
      HEIGHT 70
      CORNERS 16
      COLOR #B8431F
      FILL #B8431F
      TEXT "In Progress"
      DRAW 0.4s
    END
    CREATE hdrReview AS RECTANGLE
      POSITION 1170 320
      WIDTH 390
      HEIGHT 70
      CORNERS 16
      COLOR #6B2C91
      FILL #6B2C91
      TEXT "In Review"
      DRAW 0.4s
    END
    CREATE hdrDone AS RECTANGLE
      POSITION 1590 320
      WIDTH 390
      HEIGHT 70
      CORNERS 16
      COLOR #0F6B5C
      FILL #0F6B5C
      TEXT "Done"
      DRAW 0.4s
    END
  END

  # ---- cards drop into each lane together ----
  PARALLEL
    CREATE cTodo1 AS RECTANGLE
      POSITION 330 440
      WIDTH 350
      HEIGHT 100
      CORNERS 12
      COLOR #3B4658
      FILL #FFFFFF
      STROKE 3
      SHADOW 6
      TEXT "US-21 Coupon codes"
      DRAW 0.5s
    END
    CREATE cTodo2 AS RECTANGLE
      POSITION 330 560
      WIDTH 350
      HEIGHT 100
      CORNERS 12
      COLOR #3B4658
      FILL #FFFFFF
      STROKE 3
      SHADOW 6
      TEXT "US-22 Order emails"
      DRAW 0.5s
    END
    CREATE cTodo3 AS RECTANGLE
      POSITION 330 680
      WIDTH 350
      HEIGHT 100
      CORNERS 12
      COLOR #3B4658
      FILL #FFFFFF
      STROKE 3
      SHADOW 6
      TEXT "US-23 Address book"
      DRAW 0.5s
    END
    CREATE cDoing1 AS RECTANGLE
      POSITION 750 440
      WIDTH 350
      HEIGHT 100
      CORNERS 12
      COLOR #B8431F
      FILL #FFFFFF
      STROKE 3
      SHADOW 6
      TEXT "US-15 Payment form"
      DRAW 0.5s
    END
    CREATE cDoing2 AS RECTANGLE
      POSITION 750 560
      WIDTH 350
      HEIGHT 100
      CORNERS 12
      COLOR #B8431F
      FILL #FFFFFF
      STROKE 3
      SHADOW 6
      TEXT "US-16 Cart summary"
      DRAW 0.5s
    END
    CREATE cReview1 AS RECTANGLE
      POSITION 1170 440
      WIDTH 350
      HEIGHT 100
      CORNERS 12
      COLOR #6B2C91
      FILL #FFFFFF
      STROKE 3
      SHADOW 6
      TEXT "US-12 Search filters"
      DRAW 0.5s
    END
    CREATE cDone1 AS RECTANGLE
      POSITION 1590 440
      WIDTH 350
      HEIGHT 100
      CORNERS 12
      COLOR #0F6B5C
      FILL #FFFFFF
      STROKE 3
      SHADOW 6
      TEXT "US-05 Product list"
      DRAW 0.5s
    END
    CREATE cDone2 AS RECTANGLE
      POSITION 1590 560
      WIDTH 350
      HEIGHT 100
      CORNERS 12
      COLOR #0F6B5C
      FILL #FFFFFF
      STROKE 3
      SHADOW 6
      TEXT "US-06 Cart basics"
      DRAW 0.5s
    END
    CREATE cDone3 AS RECTANGLE
      POSITION 1590 680
      WIDTH 350
      HEIGHT 100
      CORNERS 12
      COLOR #0F6B5C
      FILL #FFFFFF
      STROKE 3
      SHADOW 6
      TEXT "US-07 Sign up"
      DRAW 0.5s
    END
  END

  # ---- sprint progress bar (13 of 34 pts = 38%) ----
  CREATE barTrack AS RECTANGLE
    POSITION 960 975
    WIDTH 1650
    HEIGHT 20
    CORNERS 10
    COLOR #C5D0E0
    FILL #E1E8F2
    STROKE 2
    DRAW 0.4s
  END

  CREATE barFill AS RECTANGLE
    POSITION 450 975
    WIDTH 630
    HEIGHT 20
    CORNERS 10
    COLOR #0F6B5C
    FILL #2FA37F
    STROKE 2
    DRAW 0.6s
  END

  # ---- move 1: Cart summary goes to review ----
  ANIMATE cDoing2 HIGHLIGHT
    COLOR #FFE0D3
    DURATION 0.7s

  ANIMATE cDoing2 MOVE TO 1170 560 ARC 60
    DURATION 1.1s
    EASE easeInOut

  ANIMATE cDoing2 COLOR TO #6B2C91
    DURATION 0.4s
    EASE easeInOut

  # ---- move 2: Search filters passes review and lands in done ----
  ANIMATE cReview1 HIGHLIGHT
    COLOR #EBDDF5
    DURATION 0.7s

  ANIMATE cReview1 MOVE TO 1590 800 ARC -60
    DURATION 1.2s
    EASE easeInOut

  ANIMATE cReview1 COLOR TO #0F6B5C
    DURATION 0.4s
    EASE easeInOut

  # ---- progress grows from 13 to 18 pts ----
  DELETE barFill
    DURATION 0.2s

  CREATE barFill2 AS RECTANGLE
    POSITION 572 975
    WIDTH 874
    HEIGHT 20
    CORNERS 10
    COLOR #0F6B5C
    FILL #2FA37F
    STROKE 2
    DRAW 0.8s
  END

  DELETE chipDone
    DURATION 0.2s

  CREATE chipDone2 AS RECTANGLE
    POSITION 1590 200
    WIDTH 390
    HEIGHT 56
    CORNERS 28
    COLOR #0F6B5C
    FILL #BFE8D6
    STROKE 3
    TEXT "Done: 18 pts"
    DRAW 0.4s
  END

  ANIMATE chipDone2 SCALE TO 1.08
    DURATION 0.4s
    EASE bounce

  ANIMATE laneDone HIGHLIGHT
    COLOR #D5F0E6
    DURATION 1s

  # ---- close scene 1 ----
END SCENE
`,
  },
  {
    id: "sailboat-retrospective",
    title: "Sprint retro: The Sailboat",
    category: "Agile",
    description:
      "Explore sprint wins, blockers, upcoming risks, and the goal with a sailboat retrospective.",
    preview: "sailboat",
    icon: Workflow,
    script: `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #F7FAFC
BOARD plain
STYLE clean
FONT neat
STROKE 3

SCENE 1 "Sprint Retro - The Sailboat"

  # ---- title ----
  CREATE title AS TEXT
    TEXT "Sprint Retro: The Sailboat"
    POSITION 960 100
    SIZE 52
    COLOR #1F2A44
    DRAW 0.5s
  END

  # ---- zone panels ----
  PARALLEL
    CREATE panelWind AS RECTANGLE
      POSITION 330 560
      WIDTH 440
      HEIGHT 640
      CORNERS 20
      COLOR #174B68
      FILL #E8F4FB
      STROKE 3
      DRAW 0.6s
    END
    CREATE panelAnchor AS RECTANGLE
      POSITION 1590 560
      WIDTH 440
      HEIGHT 640
      CORNERS 20
      COLOR #8F3414
      FILL #FDEBD0
      STROKE 3
      DRAW 0.6s
    END
    CREATE panelRocks AS RECTANGLE
      POSITION 960 890
      WIDTH 640
      HEIGHT 170
      CORNERS 20
      COLOR #4F1F6B
      FILL #F4ECFA
      STROKE 3
      DRAW 0.6s
    END
    CREATE goalChip AS RECTANGLE
      POSITION 960 215
      WIDTH 520
      HEIGHT 70
      CORNERS 35
      COLOR #0B4F44
      FILL #D5F0E6
      STROKE 3
      TEXT "Goal: ship checkout v2"
      DRAW 0.6s
    END
  END

  # ---- zone icons ----
  PARALLEL
    CREATE icWind AS ICON
      POSITION 330 300
      SIZE 70
      NAME wind
      COLOR #174B68
    END
    CREATE icAnchor AS ICON
      POSITION 1590 300
      SIZE 70
      NAME anchor
      COLOR #8F3414
    END
    CREATE icRocks AS ICON
      POSITION 595 890
      SIZE 60
      NAME triangle-alert
      COLOR #4F1F6B
    END
    CREATE icGoal AS ICON
      POSITION 640 215
      SIZE 60
      NAME flag
      COLOR #0B4F44
    END
  END

  # ---- zone headers ----
  PARALLEL
    CREATE hdrWind AS RECTANGLE
      POSITION 330 385
      WIDTH 380
      HEIGHT 60
      CORNERS 30
      COLOR #174B68
      FILL #FFFFFF
      STROKE 3
      TEXT "Wind: what helps us"
      DRAW 0.4s
    END
    CREATE hdrAnchor AS RECTANGLE
      POSITION 1590 385
      WIDTH 380
      HEIGHT 60
      CORNERS 30
      COLOR #8F3414
      FILL #FFFFFF
      STROKE 3
      TEXT "Anchors: what slows us"
      DRAW 0.4s
    END
    CREATE hdrRocks AS RECTANGLE
      POSITION 960 840
      WIDTH 420
      HEIGHT 46
      CORNERS 23
      COLOR #4F1F6B
      FILL #FFFFFF
      STROKE 3
      TEXT "Rocks: risks ahead"
      DRAW 0.4s
    END
  END

  # ---- the boat (hand-drawn) ----
  PARALLEL
    INK hull
      POINTS 800 560, 1120 560, 1050 640, 870 640, 800 560
      COLOR #5A3A1E
      WIDTH 7
      DRAW 1s
    END
    INK mast
      POINTS 960 330, 960 560
      COLOR #5A3A1E
      WIDTH 7
      DRAW 0.8s
    END
    INK mainSail
      POINTS 975 345, 1110 540, 975 540, 975 345
      COLOR #174B68
      WIDTH 6
      DRAW 1.2s
    END
    INK jibSail
      POINTS 945 390, 945 540, 850 540, 945 390
      COLOR #0F6B5C
      WIDTH 6
      DRAW 1.2s
    END
    INK pennant
      POINTS 960 330, 1015 348, 960 366
      COLOR #E76F51
      WIDTH 6
      DRAW 0.8s
    END
  END

  # ---- water ----
  PARALLEL
    INK waveA
      POINTS 560 650, 600 638, 640 662, 680 638, 720 662, 760 638, 800 662, 840 638, 880 662, 920 638, 960 662, 1000 638, 1040 662, 1080 638, 1120 662, 1160 638, 1200 662, 1240 638, 1280 662, 1320 638, 1360 650
      COLOR #2E86AB
      WIDTH 5
      DRAW 1.2s
    END
    INK waveB
      POINTS 600 700, 640 688, 680 712, 720 688, 760 712, 800 688, 840 712, 880 688, 920 712, 960 688, 1000 712, 1040 688, 1080 712, 1120 688, 1160 712, 1200 688, 1240 712, 1280 688, 1320 700
      COLOR #6BA5C8
      WIDTH 4
      DRAW 1.2s
    END
  END

  # ---- sticky notes: wind ----
  PARALLEL
    CREATE sWind1 AS RECTANGLE
      POSITION 330 490
      WIDTH 380
      HEIGHT 90
      CORNERS 10
      COLOR #5A4A00
      FILL #FFF3B0
      STROKE 2
      SHADOW 6
      TEXT "Short daily standups"
      DRAW 0.5s
    END
    CREATE sWind2 AS RECTANGLE
      POSITION 330 610
      WIDTH 380
      HEIGHT 90
      CORNERS 10
      COLOR #5A4A00
      FILL #FFF3B0
      STROKE 2
      SHADOW 6
      TEXT "Pairing on hard bugs"
      DRAW 0.5s
    END
    CREATE sWind3 AS RECTANGLE
      POSITION 330 730
      WIDTH 380
      HEIGHT 90
      CORNERS 10
      COLOR #5A4A00
      FILL #FFF3B0
      STROKE 2
      SHADOW 6
      TEXT "Clear acceptance criteria"
      DRAW 0.5s
    END
  END

  # ---- sticky notes: anchors ----
  PARALLEL
    CREATE sAnc1 AS RECTANGLE
      POSITION 1590 490
      WIDTH 380
      HEIGHT 90
      CORNERS 10
      COLOR #7A2E10
      FILL #FFD9C7
      STROKE 2
      SHADOW 6
      TEXT "Slow code reviews"
      DRAW 0.5s
    END
    CREATE sAnc2 AS RECTANGLE
      POSITION 1590 610
      WIDTH 380
      HEIGHT 90
      CORNERS 10
      COLOR #7A2E10
      FILL #FFD9C7
      STROKE 2
      SHADOW 6
      TEXT "Flaky test suite"
      DRAW 0.5s
    END
    CREATE sAnc3 AS RECTANGLE
      POSITION 1590 730
      WIDTH 380
      HEIGHT 90
      CORNERS 10
      COLOR #7A2E10
      FILL #FFD9C7
      STROKE 2
      SHADOW 6
      TEXT "Unclear priorities"
      DRAW 0.5s
    END
  END

  # ---- sticky notes: rocks ----
  PARALLEL
    CREATE sRock1 AS RECTANGLE
      POSITION 800 925
      WIDTH 290
      HEIGHT 70
      CORNERS 10
      COLOR #4F1F6B
      FILL #E9D8F4
      STROKE 2
      SHADOW 6
      TEXT "Vendor API change"
      DRAW 0.5s
    END
    CREATE sRock2 AS RECTANGLE
      POSITION 1120 925
      WIDTH 290
      HEIGHT 70
      CORNERS 10
      COLOR #4F1F6B
      FILL #E9D8F4
      STROKE 2
      SHADOW 6
      TEXT "Key dev on leave"
      DRAW 0.5s
    END
  END

  # ---- voting dots land on the top notes ----
  PARALLEL
    CREATE vote1 AS CIRCLE
      POSITION 505 462
      RADIUS 16
      COLOR #B8431F
      FILL #E76F51
      STROKE 2
      DRAW 0.2s
    END
    CREATE vote2 AS CIRCLE
      POSITION 1765 462
      RADIUS 16
      COLOR #B8431F
      FILL #E76F51
      STROKE 2
      DRAW 0.2s
    END
    CREATE vote3 AS CIRCLE
      POSITION 1225 897
      RADIUS 16
      COLOR #B8431F
      FILL #E76F51
      STROKE 2
      DRAW 0.2s
    END
  END

  PARALLEL
    ANIMATE vote1 SCALE TO 1.5
      DURATION 0.4s
      EASE bounce
    ANIMATE vote2 SCALE TO 1.5
      DURATION 0.4s
      EASE bounce
    ANIMATE vote3 SCALE TO 1.5
      DURATION 0.4s
      EASE bounce
  END

  # ---- spotlight the most voted notes ----
  ANIMATE sWind1 HIGHLIGHT
    COLOR #FFE680
    DURATION 0.8s

  ANIMATE sAnc1 HIGHLIGHT
    COLOR #FFC2A8
    DURATION 0.8s

  ANIMATE goalChip SCALE TO 1.08
    DURATION 0.4s
    EASE bounce

  # ---- close scene 1 ----
END SCENE
`,
  },
  {
    id: "flowchart",
    title: "Flowchart",
    category: "Process",
    description:
      "Animate a support ticket from submission through validation, resolution, and closure.",
    preview: "flowchart",
    icon: Workflow,
    script: `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #FFFFFF
BOARD plain
STYLE clean
FONT neat
STROKE 3

SCENE 1 "Flowchart - Support Ticket"

  # ---- title ----
  CREATE title AS TEXT
    TEXT "Support Ticket Process"
    POSITION 960 120
    SIZE 52
    COLOR #1F2A44
    DRAW 0.4s
  END

  # ---- nodes ----
  PARALLEL
    CREATE nStart AS RECTANGLE
      POSITION 170 480
      WIDTH 200
      HEIGHT 80
      CORNERS 40
      COLOR #0F6B5C
      FILL #CDEBDD
      STROKE 3
      ROUGH on
      ROUGHNESS 1
      ROUGHSEED 3
      ROUGHFILL dots
      TEXT "Start"
      DRAW 0.8s
    END
    CREATE nSubmit AS RECTANGLE
      POSITION 440 480
      WIDTH 220
      HEIGHT 90
      CORNERS 12
      COLOR #1F5F82
      FILL #DCEBF7
      STROKE 3
      ROUGH on
      ROUGHNESS 1
      ROUGHSEED 5
      ROUGHFILL hachure
      TEXT "Submit ticket"
      DRAW 0.8s
    END
    CREATE dValid AS DIAMOND
      POSITION 730 480
      WIDTH 230
      HEIGHT 160
      COLOR #6B2C91
      FILL #EFE3F7
      STROKE 3
      ROUGH on
      ROUGHNESS 1
      ROUGHSEED 8
      ROUGHFILL cross-hatch
      TEXT "Valid?"
      DRAW 0.8s
    END
    CREATE nAssign AS RECTANGLE
      POSITION 1020 480
      WIDTH 220
      HEIGHT 90
      CORNERS 12
      COLOR #1F5F82
      FILL #DCEBF7
      STROKE 3
      ROUGH on
      ROUGHNESS 1
      ROUGHSEED 12
      ROUGHFILL hachure
      TEXT "Assign agent"
      DRAW 0.8s
    END
    CREATE dSolved AS DIAMOND
      POSITION 1300 480
      WIDTH 230
      HEIGHT 160
      COLOR #6B2C91
      FILL #EFE3F7
      STROKE 3
      ROUGH on
      ROUGHNESS 1
      ROUGHSEED 15
      ROUGHFILL cross-hatch
      TEXT "Solved?"
      DRAW 0.8s
    END
    CREATE nClose AS RECTANGLE
      POSITION 1590 480
      WIDTH 220
      HEIGHT 90
      CORNERS 12
      COLOR #1F5F82
      FILL #DCEBF7
      STROKE 3
      ROUGH on
      ROUGHNESS 1
      ROUGHSEED 18
      ROUGHFILL hachure
      TEXT "Close ticket"
      DRAW 0.8s
    END
    CREATE nInfo AS RECTANGLE
      POSITION 730 780
      WIDTH 240
      HEIGHT 90
      CORNERS 12
      COLOR #B8431F
      FILL #FFE3D6
      STROKE 3
      ROUGH on
      ROUGHNESS 1.2
      ROUGHSEED 21
      ROUGHFILL zigzag
      TEXT "Request info"
      DRAW 0.8s
    END
    CREATE nEscalate AS RECTANGLE
      POSITION 1300 780
      WIDTH 240
      HEIGHT 90
      CORNERS 12
      COLOR #B8431F
      FILL #FFE3D6
      STROKE 3
      ROUGH on
      ROUGHNESS 1.2
      ROUGHSEED 24
      ROUGHFILL zigzag
      TEXT "Escalate"
      DRAW 0.8s
    END
    CREATE nEnd AS RECTANGLE
      POSITION 1590 780
      WIDTH 200
      HEIGHT 80
      CORNERS 40
      COLOR #0F6B5C
      FILL #CDEBDD
      STROKE 3
      ROUGH on
      ROUGHNESS 1
      ROUGHSEED 27
      ROUGHFILL dots
      TEXT "End"
      DRAW 0.8s
    END
  END

  # ---- main flow: solid arrows ----
  PARALLEL
    ARROW nStart -> nSubmit
      ROUTE straight
      HEAD end
      COLOR #1F2A44
      STROKE 3
      PENFOLLOW on
      DRAW 0.7s
    ARROW nSubmit -> dValid
      ROUTE straight
      HEAD end
      COLOR #1F2A44
      STROKE 3
      PENFOLLOW on
      DRAW 0.7s
    ARROW dValid -> nAssign
      ROUTE straight
      HEAD end
      LABEL "Yes"
      COLOR #0F6B5C
      STROKE 3
      PENFOLLOW on
      DRAW 0.7s
    ARROW nAssign -> dSolved
      ROUTE straight
      HEAD end
      COLOR #1F2A44
      STROKE 3
      PENFOLLOW on
      DRAW 0.7s
    ARROW dSolved -> nClose
      ROUTE straight
      HEAD end
      LABEL "Yes"
      COLOR #0F6B5C
      STROKE 3
      PENFOLLOW on
      DRAW 0.7s
    ARROW nClose -> nEnd
      ROUTE straight
      HEAD end
      COLOR #1F2A44
      STROKE 3
      PENFOLLOW on
      DRAW 0.7s
  END

  # ---- exception branches: orange ----
  PARALLEL
    ARROW dValid -> nInfo
      ROUTE straight
      HEAD end
      LABEL "No"
      COLOR #B8431F
      STROKE 3
      PENFOLLOW on
      DRAW 0.7s
    ARROW dSolved -> nEscalate
      ROUTE straight
      HEAD end
      LABEL "No"
      COLOR #B8431F
      STROKE 3
      PENFOLLOW on
      DRAW 0.7s
  END

  # ---- loops back: dashed ----
  PARALLEL
    ARROW nInfo -> nSubmit
      ROUTE elbow
      LINESTYLE dashed
      HEAD open
      COLOR #B8431F
      STROKE 3
      PENFOLLOW on
      DRAW 0.9s
    ARROW nEscalate -> nAssign
      ROUTE elbow
      LINESTYLE dashed
      HEAD open
      COLOR #B8431F
      STROKE 3
      PENFOLLOW on
      DRAW 0.9s
  END

  # ---- token walks the happy path ----
  CREATE token AS CIRCLE
    POSITION 170 480
    RADIUS 14
    COLOR #E76F51
    FILL #E76F51
    STROKE 2
    DRAW 0.2s
  END

  ANIMATE token MOVE TO 440 480
    DURATION 0.7s
    EASE easeInOut

  ANIMATE token MOVE TO 730 480
    DURATION 0.7s
    EASE easeInOut

  ANIMATE dValid HIGHLIGHT
    COLOR #E9D8F4
    DURATION 0.6s

  ANIMATE token MOVE TO 1020 480
    DURATION 0.7s
    EASE easeInOut

  ANIMATE token MOVE TO 1300 480
    DURATION 0.7s
    EASE easeInOut

  ANIMATE dSolved HIGHLIGHT
    COLOR #E9D8F4
    DURATION 0.6s

  ANIMATE token MOVE TO 1590 480
    DURATION 0.7s
    EASE easeInOut

  ANIMATE token MOVE TO 1590 780
    DURATION 0.8s
    EASE easeOut

  ANIMATE nEnd SCALE TO 1.12
    DURATION 0.4s
    EASE bounce

  ANIMATE token OPACITY TO 0
    DURATION 0.4s
    EASE easeOut

  # ---- close scene 1 ----
END SCENE
`,
  },
  {
    id: "entity-relationship",
    title: "Entity relationship diagram",
    category: "Process",
    description:
      "Map Online Store entities, keys, and relationships in a relational schema.",
    preview: "erd",
    icon: GitBranch,
    script: `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #FFFFFF
BOARD plain
STYLE clean
FONT neat
STROKE 3

SCENE 1 "ER Diagram - Online Store"

  # ---- title ----
  CREATE title AS TEXT
    TEXT "Online Store - ER Diagram"
    POSITION 960 100
    SIZE 48
    COLOR #1F2A44
    DRAW 0.4s
  END

  # ---- entities, revealed together ----
  PARALLEL
    TABLE tCustomer
      POSITION 300 340
      SIZE 440 280
      COLUMNS "Customer" "Type" "Key"
      ROW "customer_id" "INT" "PK"
      ROW "full_name" "VARCHAR" ""
      ROW "email" "VARCHAR" "UQ"
      ROW "created_at" "DATE" ""
      HEADERCOLOR #1F5F82
      DRAW 0.8s
    END

    TABLE tOrder
      POSITION 960 340
      SIZE 440 280
      COLUMNS "Order" "Type" "Key"
      ROW "order_id" "INT" "PK"
      ROW "customer_id" "INT" "FK"
      ROW "order_date" "DATE" ""
      ROW "status" "VARCHAR" ""
      HEADERCOLOR #1B3A57
      DRAW 0.8s
    END

    TABLE tPayment
      POSITION 1620 340
      SIZE 440 280
      COLUMNS "Payment" "Type" "Key"
      ROW "payment_id" "INT" "PK"
      ROW "order_id" "INT" "FK"
      ROW "amount" "DECIMAL" ""
      ROW "method" "VARCHAR" ""
      HEADERCOLOR #6B2C91
      DRAW 0.8s
    END

    TABLE tCategory
      POSITION 300 780
      SIZE 440 280
      COLUMNS "Category" "Type" "Key"
      ROW "category_id" "INT" "PK"
      ROW "name" "VARCHAR" "UQ"
      ROW "parent_id" "INT" "FK"
      HEADERCOLOR #0F6B5C
      DRAW 0.8s
    END

    TABLE tProduct
      POSITION 960 780
      SIZE 440 280
      COLUMNS "Product" "Type" "Key"
      ROW "product_id" "INT" "PK"
      ROW "category_id" "INT" "FK"
      ROW "title" "VARCHAR" ""
      ROW "price" "DECIMAL" ""
      HEADERCOLOR #0F6B5C
      DRAW 0.8s
    END

    TABLE tItem
      POSITION 1620 780
      SIZE 440 280
      COLUMNS "OrderItem" "Type" "Key"
      ROW "order_id" "INT" "PK, FK"
      ROW "product_id" "INT" "PK, FK"
      ROW "quantity" "INT" ""
      ROW "unit_price" "DECIMAL" ""
      HEADERCOLOR #B8431F
      DRAW 0.8s
    END
  END

  # ---- relationships with cardinality ----
  PARALLEL
    ARROW tCustomer -> tOrder
      ROUTE straight
      HEAD none
      LABEL "places"
      SOURCELABEL "1"
      TARGETLABEL "0..*"
      COLOR #1F2A44
      STROKE 3
      DRAW 0.6s

    ARROW tOrder -> tPayment
      ROUTE straight
      HEAD none
      LABEL "paid by"
      SOURCELABEL "1"
      TARGETLABEL "1..*"
      COLOR #1F2A44
      STROKE 3
      DRAW 0.6s

    ARROW tCategory -> tProduct
      ROUTE straight
      HEAD none
      LABEL "groups"
      SOURCELABEL "1"
      TARGETLABEL "0..*"
      COLOR #1F2A44
      STROKE 3
      DRAW 0.6s

    ARROW tProduct -> tItem
      ROUTE straight
      HEAD none
      LABEL "sold as"
      SOURCELABEL "1"
      TARGETLABEL "0..*"
      COLOR #1F2A44
      STROKE 3
      DRAW 0.6s

    ARROW tOrder -> tItem
      ROUTE elbow
      HEAD none
      LABEL "contains"
      SOURCELABEL "1"
      TARGETLABEL "1..*"
      COLOR #B8431F
      STROKE 3
      DRAW 0.6s
  END

  # ---- motion: primary keys, then foreign keys ----
  ANIMATE tOrder HIGHLIGHT COLUMN 3
    COLOR #FFF3B0
    DURATION 1s

  ANIMATE tItem HIGHLIGHT COLUMN 3
    COLOR #FFE0D3
    DURATION 1s

  # ---- close scene 1 ----
END SCENE
`,
  },
  {
    id: "reels-hook-tips",
    title: "Hook + 3 tips",
    category: "Reels",
    description:
      "A punchy opening followed by three clear, caption-ready tips.",
    preview: "reels",
    icon: Sparkles,
    script:
      reelsHeader +
      `SCENE 1 "Three quick tips"
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
    script:
      reelsHeader +
      `SCENE 1 "Before and after"
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
    description:
      "A bold product card with space for a name, promise, and call to action.",
    preview: "reels",
    icon: PackageOpen,
    script:
      reelsHeader +
      `SCENE 1 "Product reveal"
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
    description:
      "A high-contrast quote treatment with an editable author line.",
    preview: "reels",
    icon: Quote,
    script:
      reelsHeader +
      `SCENE 1 "Quote card"
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
    description:
      "A bold 3–2–1 countdown that ends on an editable call to action.",
    preview: "reels",
    icon: Timer,
    script:
      reelsHeader +
      `SCENE 1 "Countdown"
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
