import { HashRouter, MemoryRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/ui'
import { StoreProvider } from './lib/store'
import { Dashboard } from './pages/Dashboard'
import { FillQuestionnaire } from './pages/FillQuestionnaire'
import { Kartoteka } from './pages/Kartoteka'
import { PatientForm } from './pages/PatientForm'
import { Statistiky } from './pages/Statistiky'

// HashRouter → aplikace funguje i jako jediný statický soubor bez serveru.
// Ve sdílené jednosouborové verzi (build:single) se URL nemění – MemoryRouter.
const Router = import.meta.env.MODE === 'single' ? MemoryRouter : HashRouter

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
              <Route path="kartoteka" element={<Kartoteka />} />
              <Route path="kartoteka/vytvorit" element={<PatientForm key="new" mode="create" />} />
              <Route path="kartoteka/:id/upravit" element={<EditPatient />} />
              <Route path="statistiky" element={<Statistiky />} />
            </Route>
            <Route path="vyplnit/:qid" element={<FillQuestionnaire />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </StoreProvider>
  )
}
