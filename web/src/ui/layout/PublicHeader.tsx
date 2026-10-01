import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight } from "lucide-react"
import logo from "@/assets/logo.png"
import { AccountMenu } from "@/ui/layout/AccountMenu.tsx"

const pageLinkClass = (active: boolean) =>
  `relative rounded-full px-3 py-2 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-[#d8c27a] after:transition-transform after:duration-200 after:content-[''] ${active ? "text-foreground" : "text-muted-foreground after:scale-x-0 hover:text-foreground hover:after:scale-x-100"}`

export function PublicHeader({
  activePage,
  children,
}: {
  activePage: "home" | "docs"
  children?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto grid min-h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2 sm:flex sm:gap-5 sm:px-6 sm:py-0">
        <Link
          to="/"
          className="group flex min-w-0 items-center gap-2.5 text-foreground no-underline"
        >
          <img src={logo} alt="" className="size-8 shrink-0 object-contain transition-transform duration-300 group-hover:-rotate-6" />
          <span className="grid leading-none">
            <span className="text-base font-semibold tracking-tight sm:text-lg">Strokeline</span>
            <span className="mt-1 text-[9px] font-medium tracking-[0.19em] text-muted-foreground uppercase">Drawn to explain</span>
          </span>
        </Link>
        <div className="justify-self-end sm:order-3 sm:ml-1">
          <AccountMenu />
        </div>
        <nav
          aria-label="Main navigation"
          className="order-3 col-span-2 flex w-full items-center justify-between pt-1 sm:order-2 sm:ml-auto sm:w-auto sm:justify-end sm:gap-2 sm:pt-0"
        >
          <Link
            to="/"
            aria-current={activePage === "home" ? "page" : undefined}
            className={pageLinkClass(activePage === "home")}
          >
            Home
          </Link>
          <Link
            to="/docs"
            aria-current={activePage === "docs" ? "page" : undefined}
            className={pageLinkClass(activePage === "docs")}
          >
            Docs
          </Link>
          <Link
            to="/workspace"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#d8c27a] px-4 text-sm font-semibold text-[#181a16] shadow-[0_2px_0_#9f8950] transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-[#e5d493] hover:shadow-[0_3px_0_#9f8950] active:translate-y-0 active:shadow-[0_1px_0_#9f8950]"
          >
            Open studio
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </nav>
      </div>
      {children}
    </header>
  )
}
