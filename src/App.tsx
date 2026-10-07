import { HashRouter, MemoryRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/ui'
import { StoreProvider } from './lib/store'
import { Dashboard, ViewPage } from './pages/Dashboard'
import { Monitorace } from './pages/Monitorace'
import { ProgramForm } from './pages/ProgramForm'
import { FillQuestionnaire } from './pages/FillQuestionnaire'
import { Kartoteka } from './pages/Kartoteka'
import { PatientForm } from './pages/PatientForm'
import { Statistiky } from './pages/Statistiky'
import { ESkill } from './pages/ESkill'
import { ESkillTest } from './pages/ESkillTest'

// HashRouter → aplikace funguje i jako jediný statický soubor bez serveru.
// Ve sdílené jednosouborové verzi (build:single) se URL nemění – MemoryRouter.
const Router = import.meta.env.MODE === 'single' ? MemoryRouter : HashRouter

function EditProgram() {
  const { id } = useParams()
  return <ProgramForm key={id} mode="edit" />
}

function EditPatient() {
  const { id } = useParams()
  return <PatientForm key={id} mode="edit" />
}

export function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="pohledy/:id" element={<ViewPage />} />
              <Route path="monitorace" element={<Monitorace />} />
              <Route path="monitorace/vytvorit" element={<ProgramForm key="new" mode="create" />} />
              <Route path="monitorace/:id/upravit" element={<EditProgram />} />
              <Route path="kartoteka" element={<Kartoteka />} />
              <Route path="kartoteka/vytvorit" element={<PatientForm key="new" mode="create" />} />
              <Route path="kartoteka/:id/upravit" element={<EditPatient />} />
              <Route path="statistiky" element={<Statistiky />} />
              <Route path="e-skill" element={<ESkill />} />
            </Route>
            <Route path="vyplnit/:qid" element={<FillQuestionnaire />} />
            <Route path="e-skill/test" element={<ESkillTest key="anon" />} />
            <Route path="e-skill/test/:patientId" element={<ESkillTest />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </StoreProvider>
  )
}
