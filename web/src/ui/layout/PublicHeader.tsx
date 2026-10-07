import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Menu, X } from "lucide-react"
import type { Session } from "@supabase/supabase-js"
import logo from "@/assets/logo.png"
import blackLogo from "@/assets/black-logo.png"
import { Button } from "@/ui/button"
import { AccountMenu } from "@/ui/layout/AccountMenu.tsx"
import { supabase } from "@/lib/supabase.ts"

type Page = "home" | "docs"

const links: { to: string; label: string; page: Page }[] = [
  { to: "/", label: "Home", page: "home" },
  { to: "/docs", label: "Docs", page: "docs" },
]

function desktopLink(active: boolean) {
  return `rounded-full px-4 py-1.5 text-sm transition-all ${
    active
      ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border"
      : "text-muted-foreground hover:text-foreground"
  }`
}

function mobileLink(active: boolean) {
  return `flex items-center justify-between rounded-xl px-4 py-3 text-base transition-colors ${
    active
      ? "bg-accent font-medium text-foreground"
      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
  }`
}

export function PublicHeader({
  activePage,
  children,
}: {
  activePage: Page
  children?: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!supabase) return

    let active = true
    let receivedAuthEvent = false
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true
      if (active) setSession(nextSession)
    })
    void supabase.auth
      .getSession()
      .then(({ data: sessionData, error }) => {
        if (!active || receivedAuthEvent) return
        if (error) {
          console.error(
            "Unable to check sign-in status for the public navigation.",
            error.message
          )
          return
        }
        setSession(sessionData.session)
      })
      .catch((error: unknown) => {
        if (active && !receivedAuthEvent) {
          console.error(
            "Unable to check sign-in status for the public navigation.",
            error
          )
        }
      })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  // border + blur only appear once the page has scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Escape closes the mobile menu; it also closes if the viewport grows past mobile
  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false)
    const mq = window.matchMedia("(min-width: 640px)")
    const onResize = () => mq.matches && setMenuOpen(false)
    window.addEventListener("keydown", onKey)
    mq.addEventListener("change", onResize)
    return () => {
      window.removeEventListener("keydown", onKey)
      mq.removeEventListener("change", onResize)
    }
  }, [menuOpen])

  const solid = scrolled || menuOpen

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
        solid
          ? "border-border bg-background/80 backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-3 px-4 sm:grid-cols-[1fr_auto_1fr] sm:px-6">
        <Link
          to="/"
          className="flex w-fit min-w-0 items-center gap-2.5 rounded-md text-foreground no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <img
            src={blackLogo}
            alt=""
            className="size-8 shrink-0 object-contain dark:hidden"
          />
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            className="hidden size-8 shrink-0 object-contain dark:block"
          />
          <span className="text-lg font-semibold tracking-tight">
            Strokeline
          </span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 rounded-full border bg-muted/50 p-1 sm:flex"
        >
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              aria-current={activePage === l.page ? "page" : undefined}
              className={desktopLink(activePage === l.page)}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2">
          {session && (
            <Button
              asChild
              size="sm"
              className="hidden h-9 rounded-full px-4 sm:inline-flex"
            >
              <Link
                to="/workspace"
                className="inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                Open studio <ArrowRight className="size-3.5 shrink-0" />
              </Link>
            </Button>
          )}
          <AccountMenu />
          <button
            type="button"
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:hidden"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* mobile menu: slides open instead of popping in */}
      <div
        id="public-mobile-menu"
        className={`grid transition-[grid-template-rows,visibility] duration-300 sm:hidden ${
          menuOpen ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
        }`}
      >
        <nav aria-label="Main navigation" className="overflow-hidden">
          <div className="mx-auto grid max-w-6xl gap-1 px-3 pt-1 pb-4">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                aria-current={activePage === l.page ? "page" : undefined}
                className={mobileLink(activePage === l.page)}
              >
                {l.label}
                {activePage === l.page && (
                  <span className="size-1.5 rounded-full bg-primary" />
                )}
              </Link>
            ))}
            {session && (
              <Button asChild className="mt-2 h-11 rounded-xl">
                <Link
                  to="/workspace"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-2"
                >
                  Open studio <ArrowRight className="size-4 shrink-0" />
                </Link>
              </Button>
            )}
          </div>
        </nav>
      </div>
      {children}
    </header>
  )
}
