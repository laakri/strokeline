import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/ui/layout/AppShell.tsx"
import { LandingPage } from "@/pages/LandingPage.tsx"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/workspace" element={<AppShell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}