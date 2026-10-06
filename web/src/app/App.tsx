import { useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { AppShell } from "@/ui/layout/AppShell.tsx"
import { LandingPage } from "@/pages/LandingPage.tsx"
import { LoginPage } from "@/pages/LoginPage.tsx"
import { DocsPage } from "@/pages/DocsPage.tsx"
import { supabase } from "@/lib/supabase.ts"

function ProtectedWorkspace() {
  const [status, setStatus] = useState<"loading" | "signed-in" | "signed-out" | "error">(
    supabase ? "loading" : "signed-out"
  )
  const location = useLocation()

  useEffect(() => {
    if (!supabase) return
    let active = true
    let receivedAuthEvent = false
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedAuthEvent = true
      if (active) setStatus(session ? "signed-in" : "signed-out")
    })
    void supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (!active || receivedAuthEvent) return
      if (error) {
        console.error("Unable to verify workspace sign-in.", error.message)
        setStatus("error")
      } else {
        setStatus(sessionData.session ? "signed-in" : "signed-out")
      }
    }).catch((error: unknown) => {
      if (!active || receivedAuthEvent) return
      console.error("Unable to verify workspace sign-in.", error)
      setStatus("error")
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (status === "loading") {
    return <main className="grid h-svh place-items-center text-sm text-muted-foreground">Checking sign-in…</main>
  }
  if (status === "error") {
    return <main role="alert" className="grid h-svh place-items-center px-6 text-center text-sm text-destructive">Could not verify your sign-in. Check your connection and reload the page.</main>
  }
  if (status === "signed-out") {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <AppShell />
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/:page" element={<DocsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/workspace" element={<ProtectedWorkspace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
