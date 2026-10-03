import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Languages, LogOut, Package, Store, UserRound } from 'lucide-react'
import { useStore } from '../context/useStore'
import { dateTime, money } from '../lib/format'

const normalizePhone = (value) => {
  const phone = value.replace(/[\s()-]/g, '')
  return /^03\d{9}$/.test(phone) ? `+92${phone.slice(1)}` : phone
}

export default function AccountPage() {
  const { customer, customerSignOut, addCustomer, signInCustomer, orders, language, setLanguage, supabaseEnabled } = useStore()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('register')
  const navigate = useNavigate()
  const ur = language === 'ur'
  async function register(event) {
    event.preventDefault(); setError(''); setBusy(true)
    const form = new FormData(event.currentTarget)
    const details = { full_name: form.get('full_name').trim(), phone: normalizePhone(form.get('phone').trim()), shop_name: form.get('shop_name').trim(), address: form.get('address').trim() }
    try { await addCustomer(details, form.get('password')); navigate('/') } catch (issue) { setError(issue.message || 'Could not create your shop profile.'); } finally { setBusy(false) }
  }
  async function signIn(event) {
    event.preventDefault(); setError(''); setBusy(true)
    const form = new FormData(event.currentTarget)
    try { await signInCustomer(normalizePhone(form.get('phone').trim()), form.get('password')); navigate('/') } catch (issue) { setError(issue.message || 'Could not sign in.'); } finally { setBusy(false) }
  }
  const customerOrders = orders.filter((order) => order.customer_id === customer?.id || order.phone === customer?.phone)
  return <main className="account-page"><header className="account-top"><Link to="/" className="brand-lockup"><span className="brand-mark">M<span>+</span></span><span className="brand-copy"><strong>MALIK ADREES</strong><small>SHOP & SUPPLY</small></span></Link><button className="language-switch" onClick={() => setLanguage(ur ? 'en' : 'ur')}><Languages size={16} />{ur ? 'English' : 'اردو'}</button></header><Link to="/" className="back-link"><ArrowLeft size={15} /> Back to the catalogue</Link>
    {customer ? <section className="account-card"><div className="account-card-heading"><div className="account-icon"><Store size={21} /></div><div><span className="section-kicker">YOUR SHOP ACCOUNT</span><h1>{customer.shop_name}</h1><p>{customer.full_name} · {customer.phone}</p></div><button className="account-signout" onClick={async () => { await customerSignOut(); navigate('/') }}><LogOut size={15} /> Sign out</button></div><div className="account-detail"><Store size={16} /><span>{customer.address}</span></div><div className="account-orders-heading"><div><span className="section-kicker">ORDER HISTORY</span><h2>Your orders</h2></div><span className="order-count">{customerOrders.length} total</span></div>{customerOrders.length ? <div className="account-order-list">{customerOrders.map((order) => <article className="account-order" key={order.id}><div className="order-icon"><Package size={19} /></div><div className="account-order-main"><strong>Order #{String(order.id).slice(-6)}</strong><span>{dateTime(order.created_at)}</span></div><span className="status-pill">{order.status}</span><strong>{money(order.total)}</strong><details className="order-details"><summary>Details</summary><div>{(order.items || order.order_items || []).map((item) => <p key={item.id || item.product_name}>{item.product_name || item.name} × {item.quantity}</p>)}<p>Delivery: {order.delivery_location || customer.address}</p></div></details></article>)}</div> : <div className="empty-state account-empty"><Package size={24} /><h3>No orders yet</h3><p>Your order dates, items and delivery updates will appear here.</p><Link to="/" className="button button--dark">Browse the catalogue <ArrowRight size={16} /></Link></div>}</section> : <section className="register-layout"><div className="register-copy"><span className="section-kicker">A BETTER WAY TO RESTOCK</span><h1>Your shop,<br /><em>all in one place.</em></h1><p>Create your shop profile to place orders, share delivery details and keep track of your previous orders.</p><div className="register-benefit"><Check size={17} /><span>Fast repeat ordering</span></div><div className="register-benefit"><Check size={17} /><span>Order history and delivery updates</span></div><div className="register-benefit"><Check size={17} /><span>Local Samundri shop support</span></div></div><form className="register-form" onSubmit={mode === 'register' ? register : signIn}><div className="form-heading"><div className="account-icon"><UserRound size={20} /></div><div><span className="section-kicker">CUSTOMER ACCOUNT</span><h2>{mode === 'register' ? 'Set up your shop' : 'Welcome back'}</h2></div></div>{supabaseEnabled && <div className="account-mode-switch"><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>Register</button><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>Sign in</button></div>}{mode === 'register' && <><label className="field-label">Full name<input name="full_name" autoComplete="name" required placeholder="Your name" /></label></>}<label className="field-label">Phone number<input name="phone" type="tel" autoComplete="tel" required placeholder="03XX XXXXXXX" /></label>{mode === 'register' && <><label className="field-label">Shop name<input name="shop_name" required placeholder="Your shop name" /></label><label className="field-label">Shop address<textarea name="address" autoComplete="street-address" required rows="2" placeholder="Area, street and landmark" /></label></>}<label className="field-label">Password<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 6 : undefined} required placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'} /></label>{error && <p className="form-error">{error}</p>}<button className="button button--dark register-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create customer account' : 'Sign in'} <ArrowRight size={17} /></button><p className="form-hint">{supabaseEnabled ? 'Your phone number and password are secured by Supabase Auth.' : 'Preview mode stores your shop profile on this device. Connect Supabase for secure accounts and multi-device access.'}</p></form></section>}
  </main>
}
