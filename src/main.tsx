import React, { useEffect, useState, createContext, useContext } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom'
import { sb } from './lib/supabase'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Categories from './pages/Categories'
import './index.css'

const Auth = createContext<any>(null)
export const useAuth = () => useContext(Auth)

function Login() {
  const [email, setE] = useState(''), [pw, setP] = useState(''), [err, setErr] = useState('')
  const go = async (e: React.FormEvent) => { e.preventDefault()
    const { error } = await sb.auth.signInWithPassword({ email, password: pw }); if (error) setErr(error.message) }
  return <div className="grid min-h-screen place-items-center bg-pine p-4">
    <form onSubmit={go} className="card w-full max-w-sm space-y-3">
      <h1 className="font-display text-3xl">INAYA Admin</h1>
      <input className="inp" type="email" placeholder="Email" value={email} onChange={e => setE(e.target.value)} required />
      <input className="inp" type="password" placeholder="Password" value={pw} onChange={e => setP(e.target.value)} required />
      {err && <p className="text-sm text-red-700">{err}</p>}
      <button className="btn w-full">Sign in</button></form></div>
}

function Shell() {
  const { profile } = useAuth(); const [open, setOpen] = useState(true)
  if (!profile?.role || !profile.active) return <div className="grid min-h-screen place-items-center p-6 text-center">
    <div><p className="mb-3">This account is not authorized for the admin panel.</p><button className="btn" onClick={() => sb.auth.signOut()}>Sign out</button></div></div>
  const links = [['/', 'Overview'], ['/orders', 'Orders'], ['/products', 'Products'], ['/categories', 'Categories']]
  return <div className="flex min-h-screen">
    <aside className={`${open ? 'w-56' : 'w-0 overflow-hidden'} shrink-0 bg-pine text-white transition-all`}>
      <div className="p-5 font-display text-2xl">INAYA</div>
      <nav className="space-y-1 px-3">{links.map(([to, l]) => <NavLink key={to} to={to} end={to === '/'}
        className={({ isActive }) => `block rounded-md px-3 py-2 text-sm ${isActive ? 'bg-saffron text-ink font-semibold' : 'hover:bg-white/10'}`}>{l}</NavLink>)}</nav></aside>
    <div className="min-w-0 flex-1">
      <header className="flex items-center justify-between border-b border-ink/10 bg-white px-4 py-3">
        <button aria-label="Toggle sidebar" className="rounded px-2 py-1 hover:bg-ink/5" onClick={() => setOpen(!open)}>☰</button>
        <div className="flex items-center gap-3 text-sm"><span>{profile.full_name || 'Admin'} · {profile.role}</span>
          <button className="underline" onClick={() => sb.auth.signOut()}>Sign out</button></div></header>
      <main className="p-4 md:p-6"><Outlet /></main></div></div>
}

function App() {
  const [session, setS] = useState<any>(undefined), [profile, setProf] = useState<any>(null)
  useEffect(() => { sb.auth.getSession().then(({ data }) => setS(data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => setS(s)); return () => data.subscription.unsubscribe() }, [])
  useEffect(() => { if (session) sb.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => setProf(data)); else setProf(null) }, [session])
  if (session === undefined) return <p className="p-8">Loading…</p>
  if (!session) return <Login />
  return <Auth.Provider value={{ session, profile }}><Routes><Route element={<Shell />}>
    <Route index element={<Dashboard />} /><Route path="orders" element={<Orders />} />
    <Route path="products" element={<Products />} /><Route path="categories" element={<Categories />} />
    <Route path="*" element={<Navigate to="/" />} /></Route></Routes></Auth.Provider>
}
ReactDOM.createRoot(document.getElementById('root')!).render(<BrowserRouter><App /></BrowserRouter>)
