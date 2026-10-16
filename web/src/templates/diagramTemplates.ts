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
import {
  CURATED_TEMPLATES,
  FEATURED_TEMPLATE_IDS,
} from "@/templates/curatedTemplates.ts"
import { createVerticalReelScript } from "@/templates/verticalReel.ts"

export { CURATED_TEMPLATES } from "@/templates/curatedTemplates.ts"
export { FEATURED_TEMPLATE_IDS } from "@/templates/curatedTemplates.ts"

export type DiagramTemplateCategory =
  | "UML"
  | "Agile"
  | "Process"
  | "Reels"
  | "Education"
  | "Science"
  | "Stories"
  | "Technology"
export type DiagramPreviewKind =
  | "use-case"
  | "class"
  | "sequence"
  | "scrum"
  | "sailboat"
  | "flowchart"
  | "agentic-rag"
  | "erd"
  | "reels"
  | "rendered"

export interface DiagramTemplate {
  id: string
  title: string
  category: DiagramTemplateCategory
  description: string
  preview: DiagramPreviewKind
  icon: LucideIcon
  script: string
}

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: "use-case",
    title: "Online Store Use Cases",
    category: "UML",
    description:
      "Explore how customers, admins, and a payment service interact with the store.",
    preview: "rendered",
    icon: UsersRound,
    script: `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #F6F1E7
BOARD plain
STYLE clean
FONT neat
STROKE 3

SCENE 1 "Use Case Diagram Template"

  # ---- title ----
  CREATE title AS TEXT
    TEXT "Online Store  /  Customer & Admin"
    POSITION 960 130
    SIZE 44
    COLOR #25364B
    DRAW 0.4s
  END

  # ---- system boundary ----
  CREATE boundary AS RECTANGLE
    POSITION 960 520
    WIDTH 1220
    HEIGHT 660
    CORNERS 24
    COLOR #D6D0C1
    FILL #FFFEFA
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
    COLOR #2E7180
    FILL #E6F2F0
    STROKE 3
    TEXT "Browse Products"
    DRAW 0.4s
  END

  CREATE ucOrder AS RECTANGLE
    POSITION 700 480
    WIDTH 300
    HEIGHT 110
    CORNERS 55
    COLOR #2E7180
    FILL #E6F2F0
    STROKE 3
    TEXT "Place Order"
    DRAW 0.4s
  END

  CREATE ucTrack AS RECTANGLE
    POSITION 700 660
    WIDTH 300
    HEIGHT 110
    CORNERS 55
    COLOR #2E7180
    FILL #E6F2F0
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
    COLOR #2E7180
    FILL #E6F2F0
    STROKE 3
    TEXT "Apply Coupon"
    DRAW 0.4s
  END

  CREATE ucPay AS RECTANGLE
    POSITION 1220 480
    WIDTH 300
    HEIGHT 110
    CORNERS 55
    COLOR #2E7180
    FILL #E6F2F0
    STROKE 3
    TEXT "Make Payment"
    DRAW 0.4s
  END

  CREATE ucManage AS RECTANGLE
    POSITION 1220 660
    WIDTH 300
    HEIGHT 110
    CORNERS 55
    COLOR #2E7180
    FILL #E6F2F0
    STROKE 3
    TEXT "Manage Products"
    DRAW 0.4s
  END

  # ---- actors ----
  CREATE actCustomer AS ICON
    POSITION 160 480
    SIZE 120
    NAME user-round
    COLOR #25364B
  END

  CREATE lblCustomer AS TEXT
    TEXT "Customer"
    POSITION 160 580
    SIZE 32
    COLOR #25364B
    DRAW 0.3s
  END

  CREATE actGateway AS ICON
    POSITION 1760 480
    SIZE 120
    NAME server
    COLOR #25364B
  END

  CREATE lblGateway AS TEXT
    TEXT "Payment API"
    POSITION 1760 580
    SIZE 32
    COLOR #25364B
    DRAW 0.3s
  END

  CREATE actAdmin AS ICON
    POSITION 1760 700
    SIZE 120
    NAME user-round
    COLOR #25364B
  END

  CREATE lblAdmin AS TEXT
    TEXT "Admin"
    POSITION 1760 800
    SIZE 32
    COLOR #25364B
    DRAW 0.3s
  END

  # ---- associations (solid, no head) ----
  ARROW actCustomer -> ucBrowse
    ROUTE straight
    HEAD none
    COLOR #30465E
    STROKE 3
    DRAW 0.3s

  ARROW actCustomer -> ucOrder
    ROUTE straight
    HEAD none
    COLOR #30465E
    STROKE 3
    DRAW 0.3s

  ARROW actCustomer -> ucTrack
    ROUTE straight
    HEAD none
    COLOR #30465E
    STROKE 3
    DRAW 0.3s

  ARROW actGateway -> ucPay
    ROUTE straight
    HEAD none
    COLOR #30465E
    STROKE 3
    DRAW 0.3s

  ARROW actAdmin -> ucManage
    ROUTE straight
    HEAD none
    COLOR #30465E
    STROKE 3
    DRAW 0.3s

  # ---- include: base use case -> included use case ----
  ARROW ucOrder -> ucPay
    ROUTE straight
    LINESTYLE dashed
    HEAD open
    LABEL "«include»"
    COLOR #1B7E75
    STROKE 3
    DRAW 0.4s

  # ---- extend: optional use case -> base use case ----
  ARROW ucCoupon -> ucOrder
    ROUTE straight
    LINESTYLE dashed
    HEAD open
    LABEL "«extend»"
    COLOR #B45C24
    STROKE 3
    DRAW 0.4s

  # ---- legend ----
  CREATE legLine1 AS LINE
    FROM 340 920
    TO 440 920
    COLOR #30465E
    STROKE 3
    DRAW 0.3s
  END

  CREATE legAssociation AS TEXT
    POSITION 535 920
    SIZE 26
    COLOR #30465E
    TEXT "Association"
    DRAW 0.3s
  END

  CREATE legLine2 AS LINE
    FROM 760 920
    TO 860 920
    COLOR #1B7E75
    STROKE 3
    LINESTYLE dashed
    DRAW 0.3s
  END

  CREATE legInclude AS TEXT
    POSITION 960 920
    SIZE 26
    COLOR #1B7E75
    TEXT "«include»"
    DRAW 0.3s
  END

  CREATE legLine3 AS LINE
    FROM 1190 920
    TO 1290 920
    COLOR #B45C24
    STROKE 3
    LINESTYLE dashed
    DRAW 0.3s
  END

  CREATE legExtend AS TEXT
    POSITION 1390 920
    SIZE 26
    COLOR #B45C24
    TEXT "«extend»"
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
    title: "Online Store Class Model",
    category: "UML",
    description:
      "Follow an order from customer to line items, products, and payment methods.",
    preview: "rendered",
    icon: Network,
    script: `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #F1F0FA
BOARD plain
STYLE clean
FONT neat
STROKE 3

SCENE 1 "Class Diagram Template"

  # ---- title ----
  CREATE title AS TEXT
    TEXT "Online Store  /  Domain Model"
    POSITION 960 105
    SIZE 44
    COLOR #30294A
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
    HEADERCOLOR #396A82
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
    HEADERCOLOR #514878
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
    HEADERCOLOR #A2536E
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
    HEADERCOLOR #396A82
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
    HEADERCOLOR #5C826A
    DRAW 0.6s
  END

  TABLE cardTbl
    POSITION 1250 780
    SIZE 300 170
    COLUMNS "«concrete» CardPayment"
    ROW "- cardNo: String"
    ROW "+ pay(): boolean"
    DIVIDER 1
    HEADERCOLOR #A2536E
    DRAW 0.6s
  END

  TABLE paypalTbl
    POSITION 1620 780
    SIZE 300 170
    COLUMNS "«concrete» PayPalPayment"
    ROW "- email: String"
    ROW "+ pay(): boolean"
    DIVIDER 1
    HEADERCOLOR #A2536E
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
    LABEL "payment"
    SOURCELABEL "1"
    TARGETLABEL "0..1"
    COLOR #514878
    STROKE 3
    DRAW 0.4s

  # ---- composition: Order owns its OrderItems ----
  ARROW itemTbl -> orderTbl
    ROUTE straight
    HEAD diamond-filled
    LABEL "part of"
    SOURCELABEL "1..*"
    TARGETLABEL "1"
    COLOR #514878
    STROKE 3
    DRAW 0.4s

  # ---- association: each OrderItem refers to one Product ----
  ARROW itemTbl -> prodTbl
    ROUTE straight
    HEAD none
    LABEL "product"
    SOURCELABEL "1..*"
    TARGETLABEL "1"
    COLOR #396A82
    STROKE 3
    DRAW 0.4s

  # ---- inheritance: concrete payments extend Payment ----
  ARROW cardTbl -> payTbl
    ROUTE elbow
    HEAD triangle
    LABEL "extends"
    COLOR #A2536E
    STROKE 3
    DRAW 0.4s

  ARROW paypalTbl -> payTbl
    ROUTE elbow
    HEAD triangle
    LABEL "extends"
    COLOR #A2536E
    STROKE 3
    DRAW 0.4s

  # ---- motion so the scene is not static ----
  ANIMATE payTbl HIGHLIGHT
    COLOR #F1DFE7
    DURATION 1s

  ANIMATE itemTbl HIGHLIGHT
    COLOR #F8EAC4
    DURATION 1s

  # ---- close scene 1 ----
END SCENE
`,
  },
  {
    id: "sequence-diagram",
    title: "Sign-In Sequence",
    category: "UML",
    description:
      "Trace a successful sign-in from the customer through credential checks to the home page.",
    preview: "rendered",
    icon: Waypoints,
    script: `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #111827
BOARD plain
STYLE clean
FONT neat
STROKE 3

SCENE 1 "Sequence Diagram - Sign In"

  # ---- title ----
  CREATE title AS TEXT
    TEXT "Sign In  /  Request → Verification → Response"
    POSITION 960 110
    SIZE 44
    COLOR #F3F4F6
    DRAW 0.4s
  END

  # ---- participants ----
  CREATE pCust AS RECTANGLE
    POSITION 330 220
    WIDTH 260
    HEIGHT 80
    CORNERS 10
    COLOR #F9FAFB
    FILL #604B33
    STROKE 3
    TEXT "Customer"
    DRAW 0.4s
  END

  CREATE pWeb AS RECTANGLE
    POSITION 750 220
    WIDTH 260
    HEIGHT 80
    CORNERS 10
    COLOR #F9FAFB
    FILL #244A68
    STROKE 3
    TEXT "Web App"
    DRAW 0.4s
  END

  CREATE pAuth AS RECTANGLE
    POSITION 1170 220
    WIDTH 260
    HEIGHT 80
    CORNERS 10
    COLOR #F9FAFB
    FILL #493A70
    STROKE 3
    TEXT "Auth Service"
    DRAW 0.4s
  END

  CREATE pDb AS RECTANGLE
    POSITION 1590 220
    WIDTH 260
    HEIGHT 80
    CORNERS 10
    COLOR #F9FAFB
    FILL #285548
    STROKE 3
    TEXT "User DB"
    DRAW 0.4s
  END

  # ---- lifelines ----
  PARALLEL
    CREATE lifeCust AS LINE
      FROM 330 260
      TO 330 960
      COLOR #627084
      STROKE 2
      LINESTYLE dashed
      DRAW 0.5s
    END
    CREATE lifeWeb AS LINE
      FROM 750 260
      TO 750 960
      COLOR #627084
      STROKE 2
      LINESTYLE dashed
      DRAW 0.5s
    END
    CREATE lifeAuth AS LINE
      FROM 1170 260
      TO 1170 960
      COLOR #627084
      STROKE 2
      LINESTYLE dashed
      DRAW 0.5s
    END
    CREATE lifeDb AS LINE
      FROM 1590 260
      TO 1590 960
      COLOR #627084
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
      COLOR #57B8C8
      FILL #193D4A
      STROKE 2
      DRAW 0.3s
    END
    CREATE actWeb AS RECTANGLE
      POSITION 750 640
      WIDTH 20
      HEIGHT 540
      COLOR #57B8C8
      FILL #193D4A
      STROKE 2
      DRAW 0.3s
    END
    CREATE actAuth AS RECTANGLE
      POSITION 1170 640
      WIDTH 20
      HEIGHT 320
      COLOR #57B8C8
      FILL #193D4A
      STROKE 2
      DRAW 0.3s
    END
    CREATE actDb AS RECTANGLE
      POSITION 1590 640
      WIDTH 20
      HEIGHT 120
      COLOR #57B8C8
      FILL #193D4A
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
    COLOR #A78BFA
    STROKE 3
    DRAW 0.5s
  END

  CREATE fragTab AS RECTANGLE
    POSITION 480 662
    WIDTH 430
    HEIGHT 44
    CORNERS 4
    COLOR #A78BFA
    FILL #312A4D
    STROKE 3
    TEXT "opt [valid credentials]"
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
    COLOR #DCE7F3
    STROKE 3
    DRAW 0.5s

  ARROW a2s -> a2t
    ROUTE straight
    HEAD end
    LABEL "2: verify(credentials)"
    COLOR #DCE7F3
    STROKE 3
    DRAW 0.5s

  ARROW a3s -> a3t
    ROUTE straight
    HEAD end
    LABEL "3: findUser(email)"
    COLOR #DCE7F3
    STROKE 3
    DRAW 0.5s

  # ---- returns: dashed line, open head ----
  ARROW a4s -> a4t
    ROUTE straight
    LINESTYLE dashed
    HEAD open
    LABEL "4: userRecord"
    COLOR #A9B5C6
    STROKE 3
    DRAW 0.5s

  ARROW a5s -> a5t
    ROUTE straight
    LINESTYLE dashed
    HEAD open
    LABEL "5: jwtToken"
    COLOR #57D6B2
    STROKE 3
    DRAW 0.5s

  ARROW a6s -> a6t
    ROUTE straight
    LINESTYLE dashed
    HEAD open
    LABEL "6: 200 OK + home page"
    COLOR #A9B5C6
    STROKE 3
    DRAW 0.5s

  ANIMATE pAuth HIGHLIGHT
    COLOR #493A70
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
    id: "agentic-rag-mcp",
    title: "Agentic RAG + MCP",
    category: "Process",
    description:
      "Show how an AI agent grounds answers in retrieved knowledge and calls external tools through MCP.",
    preview: "agentic-rag",
    icon: Network,
    script: `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #FFFFFF
BOARD plain
STYLE clean
FONT neat
STROKE 3

SCENE 1 "Agentic RAG + MCP"
  CREATE title AS TEXT
    TEXT "Agentic RAG + MCP"
    POSITION 960 110
    SIZE 54
    COLOR #1F2A44
    DRAW 0.4s
  END

  PARALLEL
    CREATE question AS RECTANGLE
      POSITION 170 500
      WIDTH 240
      HEIGHT 110
      CORNERS 18
      COLOR #1F5F82
      FILL #DCEBF7
      STROKE 3
      TEXT "User question"
      DRAW 0.7s
    END
    CREATE agent AS RECTANGLE
      POSITION 540 500
      WIDTH 280
      HEIGHT 130
      CORNERS 24
      COLOR #6B2C91
      FILL #EFE3F7
      STROKE 4
      TEXT "AI agent"
      DRAW 0.8s
    END
    CREATE answer AS RECTANGLE
      POSITION 1010 500
      WIDTH 300
      HEIGHT 110
      CORNERS 18
      COLOR #0F6B5C
      FILL #CDEBDD
      STROKE 3
      TEXT "Grounded answer"
      DRAW 0.7s
    END
    CREATE retrieval AS RECTANGLE
      POSITION 960 280
      WIDTH 280
      HEIGHT 110
      CORNERS 18
      COLOR #1F5F82
      FILL #EAF4FA
      STROKE 3
      TEXT "RAG retrieval"
      DRAW 0.7s
    END
    CREATE knowledge AS RECTANGLE
      POSITION 1500 280
      WIDTH 300
      HEIGHT 110
      CORNERS 18
      COLOR #1F5F82
      FILL #EAF4FA
      STROKE 3
      TEXT "Knowledge index"
      DRAW 0.7s
    END
    CREATE mcp AS RECTANGLE
      POSITION 960 760
      WIDTH 280
      HEIGHT 110
      CORNERS 18
      COLOR #B8431F
      FILL #FFE3D6
      STROKE 3
      TEXT "MCP server"
      DRAW 0.7s
    END
    CREATE tools AS RECTANGLE
      POSITION 1500 760
      WIDTH 300
      HEIGHT 110
      CORNERS 18
      COLOR #B8431F
      FILL #FFF1E8
      STROKE 3
      TEXT "Tools and APIs"
      DRAW 0.7s
    END
  END

  PARALLEL
    ARROW question -> agent
      ROUTE straight
      HEAD end
      COLOR #1F2A44
      STROKE 3
      DRAW 0.6s
    ARROW agent -> answer
      ROUTE straight
      HEAD end
      LABEL "plans and responds"
      COLOR #1F2A44
      STROKE 3
      DRAW 0.6s
    ARROW agent -> retrieval
      ROUTE elbow
      HEAD end
      LABEL "retrieve"
      COLOR #1F5F82
      STROKE 3
      DRAW 0.6s
    ARROW retrieval -> knowledge
      ROUTE straight
      HEAD end
      LABEL "semantic search"
      COLOR #1F5F82
      STROKE 3
      DRAW 0.6s
    ARROW knowledge -> answer
      ROUTE elbow
      HEAD end
      LABEL "relevant context"
      COLOR #0F6B5C
      STROKE 3
      DRAW 0.6s
    ARROW agent -> mcp
      ROUTE elbow
      HEAD end
      LABEL "tool request"
      COLOR #B8431F
      STROKE 3
      DRAW 0.6s
    ARROW mcp -> tools
      ROUTE straight
      HEAD end
      LABEL "MCP"
      COLOR #B8431F
      STROKE 3
      DRAW 0.6s
    ARROW tools -> answer
      ROUTE elbow
      HEAD end
      LABEL "tool results"
      COLOR #B8431F
      STROKE 3
      DRAW 0.6s
  END

  ANIMATE agent HIGHLIGHT
    COLOR #E9D8F4
    DURATION 0.8s

  ANIMATE mcp HIGHLIGHT
    COLOR #FFE0D3
    DURATION 0.8s
END SCENE
`,
  },
  {
    id: "reels-hook-tips",
    title: "3 Edits for Clearer Reels",
    category: "Reels",
    description:
      "A five-beat mini lesson on stronger hooks, clearer visuals, and useful endings.",
    preview: "rendered",
    icon: Sparkles,
    script: createVerticalReelScript({
      series: "3 EDITS FOR CLEARER REELS",
      theme: {
        background: "#FFF8E8",
        panel: "#FFFFFF",
        accent: "#D48B00",
        headline: "#182338",
        detail: "#3C4858",
        inactive: "#E4DCCB",
        focusPanel: "#FFF1C2",
        focusCorners: 12,
      },
      beats: [
        {
          scene: "Less noise, more meaning",
          headline: "Your reel feels busy?",
          focus: "ONE IDEA",
          detail: "Let one useful point lead the whole video.",
          takeaway: "If it does not support that point, cut it.",
          narration:
            "If your reel feels busy, choose the one idea you want people to remember.",
        },
        {
          scene: "Lead with the payoff",
          headline: "Give them a reason to stay",
          focus: "RESULT FIRST",
          detail: "Show the outcome before the backstory.",
          takeaway: "Earn attention before you explain.",
          narration:
            "Open on the result or the surprising moment, then explain how you got there.",
        },
        {
          scene: "Make the idea visible",
          headline: "Do not just tell them",
          focus: "SHOW ONE THING",
          detail: "Use one example, object, or clear number.",
          takeaway: "A concrete visual makes an idea stick.",
          narration:
            "Choose one visual example that makes your point easier to understand.",
        },
        {
          scene: "Explain the connection",
          headline: "Make the visual mean something",
          focus: "SAY WHY",
          detail: "Connect what they see to what it means.",
          takeaway: "One short explanation is enough.",
          narration:
            "Do not leave the audience guessing; say why the example matters.",
        },
        {
          scene: "Finish with one next step",
          headline: "Close the loop",
          focus: "ONE ACTION",
          detail: "Invite them to save, try, or share.",
          takeaway: "A clear ending beats three competing asks.",
          narration:
            "Give viewers one simple next step, and leave the rest for another video.",
        },
      ],
    }),
  },
  {
    id: "reels-before-after",
    title: "From Clutter to Clarity",
    category: "Reels",
    description:
      "A practical before-and-after showing how one takeaway can turn a crowded slide into a clear story.",
    preview: "rendered",
    icon: ArrowLeftRight,
    script: createVerticalReelScript({
      series: "BEFORE / AFTER",
      theme: {
        background: "#E8F6F1",
        panel: "#FFFFFF",
        accent: "#187A69",
        headline: "#13372F",
        detail: "#37534D",
        inactive: "#CADDD6",
        focusPanel: "#D3EFE7",
        focusCorners: 52,
      },
      beats: [
        {
          scene: "The before",
          headline: "Why is this slide so hard to read?",
          focus: "TOO MUCH AT ONCE",
          detail: "Seven labels. Three arrows. No clear starting point.",
          takeaway: "The audience has to work out what matters.",
          narration:
            "Here is a common problem: every detail is competing for attention.",
        },
        {
          scene: "Pick the point",
          headline: "Start with one takeaway",
          focus: "WHAT SHOULD THEY LEARN?",
          detail: "Write the answer in one plain sentence.",
          takeaway: "Keep only details that help explain it.",
          narration:
            "Before rearranging anything, decide what the viewer should remember.",
        },
        {
          scene: "Show the steps",
          headline: "Give the idea a simple path",
          focus: "PROBLEM → CHANGE",
          detail: "Reveal one step, then the next.",
          takeaway: "Sequence beats a wall of information.",
          narration:
            "Put the cause first, the change second, and the result last.",
        },
        {
          scene: "The after",
          headline: "Same idea. Clearer story.",
          focus: "HOOK → VISUAL → POINT",
          detail: "One entry point. One example. One conclusion.",
          takeaway: "Make the next step easy to see.",
          narration:
            "Now the viewer knows where to look and what to take away.",
        },
      ],
    }),
  },
  {
    id: "reels-product-reveal",
    title: "Product Story: FoldCup",
    category: "Reels",
    description:
      "A sample launch reel for a fictional fold-flat travel cup, built around a problem, benefit, and clear call to action.",
    preview: "rendered",
    icon: PackageOpen,
    script: createVerticalReelScript({
      series: "SAMPLE PRODUCT STORY",
      theme: {
        background: "#F8E8DE",
        panel: "#FFF9F4",
        accent: "#B95737",
        headline: "#36221C",
        detail: "#65483F",
        inactive: "#DEC7BB",
        focusPanel: "#FFF9F4",
        focusCorners: 28,
      },
      beats: [
        {
          scene: "The small frustration",
          headline: "Your bag is already full",
          focus: "ONE LESS BULKY THING",
          detail: "A demo idea for people who carry a cup.",
          takeaway: "Start with the moment your product improves.",
          narration:
            "This is FoldCup, a fictional product concept for a very real packing problem.",
        },
        {
          scene: "Meet FoldCup",
          headline: "Meet FoldCup",
          focus: "FOLDS FLAT",
          detail: "A sample silicone cup made for travel.",
          takeaway: "Name the product and its clearest benefit.",
          narration:
            "FoldCup is a sample travel cup designed to fold flat between uses.",
        },
        {
          scene: "Show the use",
          headline: "Ready when you need it",
          focus: "OPEN. FILL. GO.",
          detail: "Show the product solving one everyday moment.",
          takeaway: "A quick demonstration beats a feature list.",
          narration:
            "Show how it opens, fills, and fits into the moment your customer cares about.",
        },
        {
          scene: "Make the promise",
          headline: "Less to carry. More room to roam.",
          focus: "MADE FOR THE DAY OUT",
          detail: "Keep the promise specific and believable.",
          takeaway: "Replace this demo with your real proof.",
          narration:
            "For your own launch, swap in a real benefit your product can deliver.",
        },
        {
          scene: "Your product, your story",
          headline: "Now make it yours",
          focus: "PROBLEM → DEMO → BENEFIT",
          detail: "Add your product, real proof, and next step.",
          takeaway: "Keep the whole story focused on one promise.",
          narration:
            "Use this structure for your product: show the problem, demonstrate the fix, and invite one next step.",
        },
      ],
    }),
  },
  {
    id: "reels-quote-card",
    title: "A Line Worth Keeping",
    category: "Reels",
    description:
      "An original quote-led story about clarity, with room to add your own verified attribution.",
    preview: "rendered",
    icon: Quote,
    script: createVerticalReelScript({
      series: "A LINE WORTH KEEPING",
      theme: {
        background: "#F3ECF7",
        panel: "#FFF9FF",
        accent: "#7C51A1",
        headline: "#2A1D34",
        detail: "#51455A",
        inactive: "#D9CBE2",
        focusPanel: "#E5D6EF",
        focusCorners: 120,
      },
      beats: [
        {
          scene: "The line",
          headline: "A thought for your next project",
          focus: "CLARITY IS KINDNESS",
          detail: "A short original line for this demo.",
          takeaway: "“Make the next step clear for the person watching.”",
          narration:
            "Here is an original line to carry into your next project: make the next step clear for the person watching.",
        },
        {
          scene: "One idea at a time",
          headline: "Clarity starts with focus",
          focus: "ONE IDEA",
          detail: "Let the important thought have the frame.",
          takeaway: "Remove anything that competes with it.",
          narration:
            "When everything is emphasized, nothing feels important. Choose one idea for each moment.",
        },
        {
          scene: "Leave room",
          headline: "Give the message space",
          focus: "LESS CROWDING",
          detail: "A little breathing room helps people follow.",
          takeaway: "Readable is more memorable than packed.",
          narration:
            "Whitespace is not wasted space; it gives the message time to land.",
        },
        {
          scene: "Make it yours",
          headline: "Have a line worth sharing?",
          focus: "ADD YOUR VERIFIED CREDIT",
          detail: "Use your own words or check the source.",
          takeaway: "Never guess who said a quote.",
          narration:
            "Replace this original demo with a line you wrote or a quote whose source you have verified.",
        },
      ],
    }),
  },
  {
    id: "reels-countdown",
    title: "The 3-Beat Reel Formula",
    category: "Reels",
    description:
      "A practical hook, proof, and payoff structure you can use to storyboard a short video.",
    preview: "rendered",
    icon: Timer,
    script: createVerticalReelScript({
      series: "THE 3-BEAT REEL FORMULA",
      theme: {
        background: "#DDF3FF",
        panel: "#F7FCFF",
        accent: "#1374B8",
        headline: "#0B2E4A",
        detail: "#244963",
        inactive: "#A9CDE0",
        focusPanel: "#BDE5FA",
        focusCorners: 8,
      },
      beats: [
        {
          scene: "Start here",
          headline: "Need a simple reel structure?",
          focus: "3 → 2 → 1",
          detail: "Hook. Proof. Payoff.",
          takeaway: "Three beats. One idea.",
          narration:
            "Build a short video around three beats: hook, proof, and payoff.",
        },
        {
          scene: "3 — Hook",
          headline: "First, earn the next second",
          focus: "3 · HOOK",
          detail: "Ask a sharp question or show the result.",
          takeaway: "Skip the long introduction.",
          narration:
            "Start with a specific question or the result your viewer wants to see.",
        },
        {
          scene: "2 — Proof",
          headline: "Next, make it believable",
          focus: "2 · PROOF",
          detail: "Show one example, step, or demonstration.",
          takeaway: "One strong example is enough.",
          narration:
            "Back up the hook with one concrete example or a quick demonstration.",
        },
        {
          scene: "1 — Payoff",
          headline: "End with the useful part",
          focus: "1 · PAYOFF",
          detail: "Deliver the answer, result, or next step.",
          takeaway: "Close the promise you opened.",
          narration:
            "Give the promised answer, then choose one next step for the viewer.",
        },
        {
          scene: "Ready to make yours",
          headline: "Your turn",
          focus: "HOOK → PROOF → PAYOFF",
          detail: "Write one sentence for each beat.",
          takeaway: "Then cut every shot that does not help.",
          narration:
            "Draft one sentence per beat and keep only the shots that move the idea forward.",
        },
      ],
    }),
  },
]

export const TEMPLATE_LIBRARY: DiagramTemplate[] = [
  ...FEATURED_TEMPLATE_IDS.map((id) =>
    CURATED_TEMPLATES.find((template) => template.id === id)!
  ),
  ...CURATED_TEMPLATES.filter(
    (template) => !FEATURED_TEMPLATE_IDS.includes(template.id)
  ),
  ...DIAGRAM_TEMPLATES,
]
