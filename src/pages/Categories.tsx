import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export default function Categories() {
  const [rows, setR] = useState<any[]>([]), [name, setN] = useState(''), [parent, setP] = useState(''), [err, setErr] = useState('')
  const load = async () => setR((await sb.from('categories').select('*').order('sort_order')).data || [])
  useEffect(() => { load() }, [])
  const add = async (e: React.FormEvent) => { e.preventDefault(); setErr('')
    const { error } = await sb.from('categories').insert({ name, slug: slug(name), parent_id: parent || null, sort_order: rows.length }); if (error) setErr(error.message); else { setN(''); load() } }
  const toggle = async (c: any) => { await sb.from('categories').update({ is_active: !c.is_active }).eq('id', c.id); load() }
  const del = async (c: any) => { if (!confirm(`Delete "${c.name}"? Its subcategories are removed too.`)) return
    const { error } = await sb.from('categories').delete().eq('id', c.id); if (error) alert(error.message); else load() }
  const nm = (id: string) => rows.find(r => r.id === id)?.name
  return <div className="space-y-4"><h1 className="font-display text-3xl">Categories</h1>
    <form onSubmit={add} className="card flex flex-wrap gap-2"><input className="inp max-w-xs" placeholder="Category name" value={name} onChange={e => setN(e.target.value)} required />
      <select className="inp max-w-xs" value={parent} onChange={e => setP(e.target.value)}><option value="">Top level</option>{rows.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <button className="btn">Add category</button>{err && <p className="w-full text-sm text-red-700">{err}</p>}</form>
    <div className="card divide-y divide-ink/10">{rows.map(c => <div key={c.id} className="flex items-center justify-between py-2 text-sm">
      <span>{c.parent_id ? `${nm(c.parent_id)} › ` : ''}{c.name}</span>
      <span className="space-x-3"><button className="underline" onClick={() => toggle(c)}>{c.is_active ? 'Deactivate' : 'Activate'}</button><button className="text-red-700 underline" onClick={() => del(c)}>Delete</button></span></div>)}
      {!rows.length && <p className="text-sm text-ink/60">No categories yet. Add your first one above.</p>}</div></div>
}
