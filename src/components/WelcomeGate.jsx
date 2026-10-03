import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Languages, Store } from 'lucide-react'
import { useStore } from '../context/useStore'

export default function WelcomeGate() {
  const { role, setRole, language, setLanguage } = useStore()
  const [open, setOpen] = useState(!sessionStorage.getItem('malik-intro-seen'))
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()
  const ur = language === 'ur'
  useEffect(() => {
    if (!open) return undefined
    if (role) {
      const timer = setTimeout(dismiss, 1500)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => setReady(true), 650)
    return () => clearTimeout(timer)
  }, [open, role])
  function choose(nextRole) {
    setRole(nextRole)
    sessionStorage.setItem('malik-intro-seen', '1')
    setOpen(false)
    navigate(nextRole === 'owner' ? '/owner' : '/')
  }
  function dismiss() { sessionStorage.setItem('malik-intro-seen', '1'); setOpen(false) }
  if (!open) return null
  return <div className="welcome-overlay" role="dialog" aria-modal="true" aria-label="Welcome to Malik Adrees">
    <div className="welcome-panel">
      <button className="language-switch welcome-language" onClick={() => setLanguage(ur ? 'en' : 'ur')}><Languages size={16} /> {ur ? 'English' : 'اردو'}</button>
      <div className={`welcome-mark ${ready ? 'welcome-mark--ready' : ''}`}><span className="welcome-spark">✦</span><Store size={32} strokeWidth={1.5} /></div>
      <div className="welcome-brand">MALIK ADREES <span>SHOP & SUPPLY</span></div>
      <h1 dir={ur ? 'rtl' : undefined}>{ur ? 'السلام علیکم' : 'Assalam-o-Alaikum'}</h1>
      <p dir={ur ? 'rtl' : undefined}>{ur ? 'ساموندری کے دکانداروں کے لیے روزمرہ سامان' : 'Everyday stock, delivered to your shop in Samundri.'}</p>
      {ready && <div className="welcome-choice" dir={ur ? 'rtl' : undefined}>
        <h2>{ur ? 'آپ کون ہیں؟' : 'Choose your entrance'}</h2>
        {role ? <button className="welcome-option welcome-option--single" onClick={dismiss}><span><Store size={19} /> {ur ? 'دکان پر جائیں' : 'Continue to your store'}</span><ArrowRight size={17} /></button> : <div className="welcome-options">
          <button className="welcome-option" onClick={() => choose('owner')}><span><Store size={19} /> {ur ? 'مالک' : 'Owner'}</span><ArrowRight size={17} /></button>
          <button className="welcome-option" onClick={() => choose('customer')}><span><Store size={19} /> {ur ? 'گاہک' : 'Customer'}</span><ArrowRight size={17} /></button>
        </div>}
      </div>}
      <span className="welcome-location">SAMUNDRI · PUNJAB</span>
    </div>
  </div>
}
