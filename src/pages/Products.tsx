import { useEffect, useState } from 'react'
import { sb, bdt } from '../lib/supabase'
const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const blank = { name: '', sku: '', category_id: '', regular_price: 0, sale_price: '', stock_qty: 0, low_stock_threshold: 5, status: 'draft', featured: false, description: '' }
export default function Products() {
  const [rows, setR] = useState<any[]>([]), [cats, setC] = useState<any[]>([]), [q, setQ] = useState(''), [f, setF] = useState<any>(null), [err, setErr] = useState('')
  const load = async () => { setR((await sb.from('products').select('*').neq('status', 'archived').order('created_at', { ascending: false })).data || [])
    setC((await sb.from('categories').select('id,name').order('name')).data || []) }
  useEffect(() => { load() }, [])
  const save = async (e: React.FormEvent) => { e.preventDefault(); setErr('')
    const { id, stock_qty, created_at, updated_at, ...rest } = f
    const body = { ...rest, slug: slug(f.name), category_id: f.category_id || null, sale_price: f.sale_price === '' ? null : +f.sale_price, regular_price: +f.regular_price }
    const r = id ? await sb.from('products').update(body).eq('id', id) : await sb.from('products').insert({ ...body, stock_qty: +stock_qty || 0 })
    if (r.error) setErr(r.error.message); else { setF(null); load() } }
  const archive = async (p: any) => { if (confirm(`Archive "${p.name}"? It will disappear from the storefront.`)) { await sb.from('products').update({ status: 'archived' }).eq('id', p.id); load() } }
  const adjust = async (p: any) => { const d = prompt(`Stock change for ${p.name} (use - to remove):`); if (!d || isNaN(+d)) return
    const { error } = await sb.rpc('adjust_stock', { p_product: p.id, p_delta: +d, p_reason: 'manual', p_note: null }); if (error) alert(error.message); else load() }
  const shown = rows.filter(r => (r.name + r.sku).toLowerCase().includes(q.toLowerCase()))
  return <div className="space-y-4">
    <div className="flex items-center justify-between"><h1 className="font-display text-3xl">Products</h1><button className="btn" onClick={() => setF(blank)}>New product</button></div>
    {f && <form onSubmit={save} className="card grid gap-3 md:grid-cols-3">
      <input className="inp" placeholder="Name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required />
      <input className="inp" placeholder="SKU" value={f.sku} onChange={e => setF({ ...f, sku: e.target.value })} required />
      <select className="inp" value={f.category_id || ''} onChange={e => setF({ ...f, category_id: e.target.value })}><option value="">No category</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <input className="inp" type="number" min="0" placeholder="Regular price ৳" value={f.regular_price} onChange={e => setF({ ...f, regular_price: e.target.value })} required />
      <input className="inp" type="number" min="0" placeholder="Sale price ৳" value={f.sale_price ?? ''} onChange={e => setF({ ...f, sale_price: e.target.value })} />
      {!f.id && <input className="inp" type="number" min="0" placeholder="Opening stock" value={f.stock_qty} onChange={e => setF({ ...f, stock_qty: e.target.value })} />}
      <select className="inp" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="draft">Draft</option><option value="active">Active</option></select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.featured} onChange={e => setF({ ...f, featured: e.target.checked })} />Featured</label>
      <textarea className="inp md:col-span-3" placeholder="Description" value={f.description || ''} onChange={e => setF({ ...f, description: e.target.value })} />
      {err && <p className="text-sm text-red-700 md:col-span-3">{err}</p>}
      <div className="space-x-2"><button className="btn">Save product</button><button type="button" className="underline" onClick={() => setF(null)}>Cancel</button></div></form>}
    <input className="inp max-w-sm" placeholder="Search name or SKU" value={q} onChange={e => setQ(e.target.value)} />
    <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-ink/60"><th className="p-2">Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead>
      <tbody>{shown.map(p => <tr key={p.id} className="border-t border-ink/10"><td className="p-2">{p.name}</td><td>{p.sku}</td>
        <td>{p.sale_price != null ? <><s className="text-ink/50">{bdt(p.regular_price)}</s> {bdt(p.sale_price)}</> : bdt(p.regular_price)}</td>
        <td className={p.stock_qty <= p.low_stock_threshold ? 'font-semibold text-red-700' : ''}>{p.stock_qty}</td><td>{p.status}</td>
        <td className="space-x-3 whitespace-nowrap"><button className="underline" onClick={() => setF(p)}>Edit</button><button className="underline" onClick={() => adjust(p)}>Adjust stock</button><button className="text-red-700 underline" onClick={() => archive(p)}>Archive</button></td></tr>)}</tbody></table>
      {!shown.length && <p className="p-4 text-sm text-ink/60">No products found.</p>}</div></div>
}
