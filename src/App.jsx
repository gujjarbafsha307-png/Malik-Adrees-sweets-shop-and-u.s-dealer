import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './context/StoreContext'
import { useStore } from './context/useStore'
import WelcomeGate from './components/WelcomeGate'
import Storefront from './pages/Storefront'
import AccountPage from './pages/AccountPage'
import OwnerDashboard from './pages/OwnerDashboard'
import './design.css'
import './extras.css'

function RoutedApp() {
  const { ready, supabaseEnabled } = useStore()
  if (!ready) return <div className="loading-screen"><span className="loading-mark">M</span><span>Opening the store…</span></div>
  if (import.meta.env.PROD && !supabaseEnabled) return <main className="setup-required"><span className="brand-mark">M<span>+</span></span><span className="section-kicker">MALIK ADREES · SAMUNDRI</span><h1>Store setup required</h1><p>Connect Supabase before publishing the store. Customer accounts, order protection and owner access must be configured first.</p></main>
  return <><WelcomeGate /><Routes><Route path="/" element={<Storefront />} /><Route path="/account" element={<AccountPage />} /><Route path="/owner" element={<OwnerDashboard />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></>
}

export default function App() {
  return <StoreProvider><BrowserRouter><RoutedApp /></BrowserRouter></StoreProvider>
}
