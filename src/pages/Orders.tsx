import { Fragment, useEffect, useState } from 'react'
import { sb, bdt } from '../lib/supabase'
const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
const PAY = ['pending', 'verified', 'rejected']
export default function Orders() {
  const [rows, setR] = useState<any[]>([]), [st, setSt] = useState(''), [q, setQ] = useState(''), [open, setOpen] = useState<any>(null)
  const load = async () => { let r = sb.from('orders').select('*, order_items(*), payments(*)').order('created_at', { ascending: false }).limit(200); if (st) r = r.eq('status', st); setR((await r).data || []) }
  useEffect(() => { load() }, [st])
  const setStatus = async (o: any, s: string) => { const { error } = await sb.rpc('set_order_status', { p_order: o.id, p_status: s }); if (error) alert(error.message); else load() }
  const setPay = async (o: any, s: string) => { const { error } = await sb.rpc('set_payment_status', { p_order: o.id, p_status: s }); if (error) alert(error.message); else load() }
  const note = async (o: any) => { const n = prompt('Internal note:', o.internal_note || ''); if (n === null) return; await sb.rpc('set_order_note', { p_order: o.id, p_note: n }); load() }
  const shown = rows.filter(r => (r.order_no + r.customer_name + r.phone).toLowerCase().includes(q.toLowerCase()))
  return <div className="space-y-4"><h1 className="font-display text-3xl">Orders</h1>
    <div className="flex gap-2"><input className="inp max-w-sm" placeholder="Search order, name, phone" value={q} onChange={e => setQ(e.target.value)} />
      <select className="inp w-auto" value={st} onChange={e => setSt(e.target.value)}><option value="">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
    <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-ink/60"><th className="p-2">Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th /></tr></thead><tbody>
      {shown.map(o => <Fragment key={o.id}><tr className="border-t border-ink/10"><td className="p-2">{o.order_no}</td><td>{o.customer_name}<br /><span className="text-ink/60">{o.phone}</span></td><td>{bdt(o.total)}</td>
        <td>{o.payment_method}<select className="inp ml-2 w-auto" value={o.payment_status} onChange={e => setPay(o, e.target.value)}>{PAY.map(s => <option key={s}>{s}</option>)}</select></td>
        <td><select className="inp w-auto" value={o.status} onChange={e => setStatus(o, e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></td>
        <td className="space-x-3"><button className="underline" onClick={() => setOpen(open === o.id ? null : o.id)}>Details</button><button className="underline" onClick={() => note(o)}>Note</button></td></tr>
        {open === o.id && <tr className="bg-paper"><td colSpan={6} className="p-3"><p>{o.address}, {o.district}</p>
          {o.order_items.map((i: any) => <p key={i.id}>{i.name_snapshot} × {i.quantity} — {bdt(i.unit_price * i.quantity)}</p>)}
          <p className="mt-1">Subtotal {bdt(o.subtotal)} · Delivery {bdt(o.delivery_charge)} · Discount {bdt(o.discount)}</p>
          {o.payments?.[0]?.reference && <p>Payment reference: {o.payments[0].reference}</p>}{o.internal_note && <p>Note: {o.internal_note}</p>}</td></tr>}</Fragment>)}
    </tbody></table>{!shown.length && <p className="p-4 text-sm text-ink/60">No orders match.</p>}</div></div>
}
