import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/ui/layout/AppShell.tsx"
import { LandingPage } from "@/pages/LandingPage.tsx"
import { LoginPage } from "@/pages/LoginPage.tsx"
import { DocsPage } from "@/pages/DocsPage.tsx"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/:page" element={<DocsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/workspace" element={<AppShell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
