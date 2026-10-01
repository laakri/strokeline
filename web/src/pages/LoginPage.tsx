import { useLayoutEffect, useState } from "react"
import { ArrowLeft, GitBranch } from "lucide-react"
import { Link } from "react-router-dom"
import logo from "@/assets/logo.png"
import { isSupabaseConfigured, supabase } from "@/lib/supabase.ts"

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5">
      <path
        fill="#FFC107"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.5 9.5 0 0 1-4.1 6.2v5h6.7c3.9-3.6 6-8.8 6-14.9Z"
      />
      <path
        fill="#FF3D00"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.7l-6.7-5c-1.8 1.2-4 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z"
      />
      <path
        fill="#4CAF50"
        d="M12.8 28a12 12 0 0 1 0-7.8V15H5.9a20 20 0 0 0 0 17.2l6.9-5.2Z"
      />
      <path
        fill="#1976D2"
        d="M24 12c3 0 5.6 1 7.7 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.9 15l6.9 5.2C14.4 15.5 18.8 12 24 12Z"
      />
    </svg>
  )
}

export function LoginPage() {
  const [notice, setNotice] = useState("")
  const [pendingProvider, setPendingProvider] = useState<"google" | "github" | null>(null)

  useLayoutEffect(() => {
    document.documentElement.classList.add("landing-mode")
    return () => document.documentElement.classList.remove("landing-mode")
  }, [])

  async function signIn(provider: "google" | "github") {
    if (!supabase) {
      setNotice("Add your Supabase URL and publishable key to web/.env.local, then restart the app.")
      return
    }

    setPendingProvider(provider)
    setNotice("")
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/workspace` },
    })

    if (error) {
      setNotice(error.message)
      setPendingProvider(null)
    }
  }

  return (
    <main className="grid min-h-svh bg-background text-foreground lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden min-h-svh flex-col justify-between overflow-hidden bg-[#17211f] px-7 py-7 text-[#f5f1e6] sm:px-12 sm:py-10 lg:flex lg:px-16">
        <Link
          to="/"
          className="flex w-fit items-center gap-2 text-sm font-semibold text-[#f5f1e6] no-underline"
        >
          <img src={logo} alt="" className="size-7 object-contain" />
          Strokeline
        </Link>
        <div className="relative z-10 max-w-lg py-12 lg:py-0">
          <p className="mb-5 text-xs font-semibold tracking-[0.22em] text-[#d8ba67] uppercase">
            A canvas for clear ideas
          </p>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Make the hard
            <br />
            ideas <span className="text-[#d8ba67]">click.</span>
          </h1>
          <p className="mt-5 max-w-sm text-base leading-7 text-[#c8d0c9]">
            Turn a script into a hand-drawn explanation, one scene at a time.
          </p>
        </div>
        <svg
          viewBox="0 0 460 220"
          aria-hidden="true"
          className="pointer-events-none absolute right-8 bottom-16 w-[min(72%,460px)] opacity-70 lg:right-12 lg:bottom-24"
        >
          <path
            d="M28 164c52-26 84-21 133-2 50 19 91 17 137-13 44-29 78-26 133-2"
            fill="none"
            stroke="#91b69a"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="2 11"
          />
          <path
            d="M81 86c14-27 55-28 72-1 7 11 7 26 0 38-6 10-17 15-36 30-19-15-30-20-36-30-8-12-7-26 0-37Z"
            fill="none"
            stroke="#e2c86f"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M298 130c0-34 28-62 62-62s62 28 62 62-28 62-62 62h-43l-25 16 8-31a61 61 0 0 1-2-17Z"
            fill="none"
            stroke="#d4e0d3"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M329 121h61M329 140h45M329 159h34"
            stroke="#d4e0d3"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        <p className="relative z-10 text-xs text-[#aebbb1]">
          Write it. Draw it. Share it.
        </p>
      </section>

      <section className="flex min-h-svh min-w-0 items-center justify-center px-4 py-8 sm:px-10 sm:py-12">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground no-underline hover:text-foreground sm:mb-12"
          >
            <ArrowLeft className="size-4" />
            Back to Strokeline
          </Link>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Welcome back
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Sign in
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a provider to continue.
          </p>

          <div className="mt-8 grid gap-3">
            <button
              type="button"
              onClick={() => void signIn("google")}
              disabled={pendingProvider !== null}
              className="flex h-12 items-center justify-center gap-3 rounded-lg bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <GoogleMark />
              {pendingProvider === "google" ? "Connecting…" : "Continue with Google"}
            </button>
            <button
              type="button"
              onClick={() => void signIn("github")}
              disabled={pendingProvider !== null}
              className="flex h-12 items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-card-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <GitBranch className="size-5" />
              {pendingProvider === "github" ? "Connecting…" : "Continue with GitHub"}
            </button>
          </div>
          <p
            role="status"
            aria-live="polite"
            className="mt-5 min-h-5 text-center text-xs text-muted-foreground"
          >
            {notice || (isSupabaseConfigured ? "Secure sign-in with Google or GitHub." : "Connect Supabase to enable sign-in.")}
          </p>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            No email or password required.
          </p>
        </div>
      </section>
    </main>
  )
}
