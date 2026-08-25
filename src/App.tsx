import { Navigate, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { SpeakerPanel } from '@/components/layout/SpeakerPanel'
import { Toaster } from '@/components/layout/Toaster'
import { GraphPage } from '@/pages/GraphPage'
import { ReviewPage } from '@/pages/ReviewPage'
import { PrepPage } from '@/pages/PrepPage'
import { CasesPage } from '@/pages/CasesPage'
import { DashboardPage } from '@/pages/DashboardPage'

export default function App() {
  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex h-full w-full bg-slate-50">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="min-h-0 flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/graph" replace />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/prep" element={<PrepPage />} />
              <Route path="/cases" element={<CasesPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>
          </main>
        </div>
        <SpeakerPanel />
        <Toaster />
      </div>
    </TooltipProvider>
  )
}
