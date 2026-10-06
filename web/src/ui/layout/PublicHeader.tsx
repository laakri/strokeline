import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Menu, X } from "lucide-react"
import type { Session } from "@supabase/supabase-js"
import logo from "@/assets/logo.png"
import blackLogo from "@/assets/black-logo.png"
import { Button } from "@/ui/button"
import { AccountMenu } from "@/ui/layout/AccountMenu.tsx"
import { supabase } from "@/lib/supabase.ts"

function pageLinkClass(active: boolean, mobile = false) {
  return `${mobile ? "block rounded-md px-3 py-2" : "rounded-md px-2.5 py-2"} text-sm transition-colors ${active ? "font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`
}

export function PublicHeader({
  activePage,
  children,
}: {
  activePage: "home" | "docs"
  children?: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!supabase) return

    let active = true
    let receivedAuthEvent = false
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true
      if (active) setSession(nextSession)
    })
    void supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (!active || receivedAuthEvent) return
      if (error) {
        console.error("Unable to check sign-in status for the public navigation.", error.message)
        return
      }
      setSession(sessionData.session)
    }).catch((error: unknown) => {
      if (active && !receivedAuthEvent) {
        console.error("Unable to check sign-in status for the public navigation.", error)
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 shrink-0 items-center gap-2 text-foreground no-underline"
        >
          <img src={blackLogo} alt="" className="size-7 shrink-0 object-contain dark:hidden" />
          <img src={logo} alt="" aria-hidden="true" className="hidden size-7 shrink-0 object-contain dark:block" />
          <span className="text-base font-semibold tracking-tight sm:text-lg">Strokeline</span>
        </Link>
        <nav aria-label="Main navigation" className="ml-auto hidden items-center gap-1 sm:flex">
          <Link to="/" aria-current={activePage === "home" ? "page" : undefined} className={pageLinkClass(activePage === "home")}>
            Home
          </Link>
          <Link to="/docs" aria-current={activePage === "docs" ? "page" : undefined} className={pageLinkClass(activePage === "docs")}>
            Docs
          </Link>
          {session && (
            <Button asChild size="sm">
              <Link to="/workspace">Open studio</Link>
            </Button>
          )}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-2">
          <AccountMenu />
          <button
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:hidden"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      <nav
        id="public-mobile-menu"
        aria-label="Main navigation"
        className={`absolute inset-x-0 top-full bg-background px-4 pb-3 shadow-lg sm:hidden ${menuOpen ? "block" : "hidden"}`}
      >
        <div className="mx-auto grid max-w-6xl gap-1">
          <Link to="/" onClick={() => setMenuOpen(false)} aria-current={activePage === "home" ? "page" : undefined} className={pageLinkClass(activePage === "home", true)}>
            Home
          </Link>
          <Link to="/docs" onClick={() => setMenuOpen(false)} aria-current={activePage === "docs" ? "page" : undefined} className={pageLinkClass(activePage === "docs", true)}>
            Docs
          </Link>
          {session && (
            <Button asChild size="sm" className="mt-1 justify-start">
              <Link to="/workspace" onClick={() => setMenuOpen(false)}>Open studio</Link>
            </Button>
          )}
        </div>
      </nav>
      {children}
    </header>
  )
}
