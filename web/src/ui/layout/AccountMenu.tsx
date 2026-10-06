import { useEffect, useRef, useState } from "react"
import { LogOut, Moon, Sun, UserRound } from "lucide-react"
import { Link } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"
import { useTheme } from "@/components/theme-provider.tsx"
import { supabase } from "@/lib/supabase.ts"
import { trackProductEvent } from "@/analytics/productAnalytics.ts"

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const [session, setSession] = useState<Session | null>(null)
  const [logoutError, setLogoutError] = useState("")
  const [failedAvatarUrl, setFailedAvatarUrl] = useState("")
  const menuRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (!supabase) return

    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (_event === "SIGNED_IN") {
        const provider = nextSession?.user.app_metadata.provider
        window.setTimeout(() => {
          trackProductEvent({
            name: "auth_signed_in",
            properties: {
              provider: provider === "google" || provider === "github" ? provider : "other",
            },
          })
        }, 0)
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        if (menuRef.current) menuRef.current.open = false
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuRef.current?.open) {
        menuRef.current.open = false
        menuRef.current.querySelector("summary")?.focus()
      }
    }
    document.addEventListener("pointerdown", closeMenu)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeMenu)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [])

  const user = session?.user
  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <ThemeToggleButton />
        <Link
          to="/login"
          aria-label="Sign in"
          title="Sign in"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-full px-2.5 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <UserRound className="size-5" />
          {!compact && <span>Sign in</span>}
        </Link>
      </div>
    )
  }

  const metadata = user.user_metadata
  const name =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    user.email ||
    "Account"
  const avatarUrl =
    (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata.picture === "string" && metadata.picture)

  return (
    <details ref={menuRef} className="relative">
      <summary
        aria-label={`${name} account menu`}
        title={name}
        className="flex size-9 cursor-pointer list-none items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-secondary-foreground outline-none transition-shadow hover:ring-2 hover:ring-ring/40 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
      >
        {avatarUrl && failedAvatarUrl !== avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-full object-cover"
            onError={() => setFailedAvatarUrl(avatarUrl)}
          />
        ) : (
          <UserRound className="size-4" />
        )}
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl bg-popover p-2 text-popover-foreground shadow-xl ring-1 ring-black/10">
        <div className="truncate px-3 py-2">
          <p className="truncate text-sm font-semibold">{name}</p>
          {user.email && (
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          )}
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Usage analytics run while you are signed in. Scripts and exports are not collected.
          </p>
        </div>
        <div className="my-1 h-px bg-border/70" />
        <ThemeToggleButton inMenu />
        <div className="my-1 h-px bg-border/70" />
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => {
            setLogoutError("")
            void supabase?.auth.signOut().then(({ error }) => {
              if (error) setLogoutError(error.message)
              else if (menuRef.current) menuRef.current.open = false
            })
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </button>
        {logoutError && (
          <p role="alert" className="px-3 py-2 text-xs text-destructive">
            {logoutError}
          </p>
        )}
      </div>
    </details>
  )
}

function ThemeToggleButton({ inMenu = false }: { inMenu?: boolean }) {
  const { setTheme } = useTheme()

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      title="Toggle light/dark theme"
      className={
        inMenu
          ? "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          : "inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      }
      onClick={() =>
        setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")
      }
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
      {inMenu && (
        <>
          <span className="dark:hidden">Dark theme</span>
          <span className="hidden dark:inline">Light theme</span>
        </>
      )}
    </button>
  )
}
