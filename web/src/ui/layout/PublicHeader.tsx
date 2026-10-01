import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import logo from "@/assets/logo.png"
import { Button } from "@/ui/button"
import { AccountMenu } from "@/ui/layout/AccountMenu.tsx"

export function PublicHeader({
  activePage,
  children,
}: {
  activePage: "home" | "docs"
  children?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto grid min-h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2 sm:flex sm:gap-4 sm:px-6 sm:py-0">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 text-foreground no-underline"
        >
          <img src={logo} alt="" className="size-7 shrink-0 object-contain" />
          <span className="text-lg font-semibold">Strokeline</span>
        </Link>
        <div className="justify-self-end sm:order-3 sm:ml-1">
          <AccountMenu />
        </div>
        <nav
          aria-label="Main navigation"
          className="order-3 col-span-2 flex w-full items-center justify-between border-t pt-1 sm:order-2 sm:ml-auto sm:w-auto sm:justify-end sm:gap-1 sm:border-0 sm:pt-0"
        >
          <Button asChild size="sm" variant={activePage === "home" ? "secondary" : "ghost"}>
            <Link to="/" aria-current={activePage === "home" ? "page" : undefined}>Home</Link>
          </Button>
          <Button asChild size="sm" variant={activePage === "docs" ? "secondary" : "ghost"}>
            <Link to="/docs" aria-current={activePage === "docs" ? "page" : undefined}>Docs</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/workspace">Open studio</Link>
          </Button>
        </nav>
      </div>
      {children}
    </header>
  )
}
