import { useEffect, useState } from 'react'
import { sb, bdt } from '../lib/supabase'
export default function Dashboard() {
  const [days, setDays] = useState(30), [orders, setO] = useState<any[]>([]), [pc, setPc] = useState(0), [low, setLow] = useState<any[]>([]), [loading, setL] = useState(true)
  useEffect(() => { (async () => { setL(true)
    const since = new Date(Date.now() - days * 864e5).toISOString()
    const [o, p, l] = await Promise.all([
      sb.from('orders').select('id,order_no,customer_name,total,status,created_at').gte('created_at', since).order('created_at', { ascending: false }),
      sb.from('products').select('id', { count: 'exact', head: true }).neq('status', 'archived'),
      sb.from('low_stock_products').select('*').limit(8)])
    setO(o.data || []); setPc(p.count || 0); setLow(l.data || []); setL(false) })() }, [days])
  const cnt = (s: string) => orders.filter(x => x.status === s).length
  const live = orders.filter(x => x.status !== 'cancelled')
  const sales = live.reduce((a, x) => a + Number(x.total), 0)
  const byDay: Record<string, number> = {}
  live.forEach(x => { const d = x.created_at.slice(0, 10); byDay[d] = (byDay[d] || 0) + Number(x.total) })
  const series = Object.entries(byDay).sort(), max = Math.max(1, ...series.map(s => s[1]))
  const cards: [string, string | number][] = [['Sales', bdt(sales)], ['Orders', orders.length], ['Pending', cnt('pending')], ['Completed', cnt('delivered')], ['Cancelled', cnt('cancelled')], ['Products', pc], ['Low stock', low.length]]
  if (loading) return <p>Loading…</p>
  return <div className="space-y-5">
    <div className="flex items-center justify-between"><h1 className="font-display text-3xl">Overview</h1>
      <select className="inp w-auto" value={days} onChange={e => setDays(+e.target.value)}>{[7, 30, 90].map(d => <option key={d} value={d}>Last {d} days</option>)}</select></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">{cards.map(([l, v]) => <div key={l} className="card"><p className="text-xs text-ink/60">{l}</p><p className="text-xl font-semibold">{v}</p></div>)}</div>
    <div className="card"><h2 className="mb-3 font-semibold">Sales by day</h2>
      {series.length ? <div className="flex h-40 items-end gap-1">{series.map(([d, v]) => <div key={d} title={`${d}: ${bdt(v)}`} className="flex-1 rounded-t bg-pine" style={{ height: `${(v / max) * 100}%` }} />)}</div> : <p className="text-sm text-ink/60">No sales in this period yet.</p>}</div>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card"><h2 className="mb-2 font-semibold">Recent orders</h2>{orders.slice(0, 6).map(o => <div key={o.id} className="flex justify-between border-t border-ink/10 py-2 text-sm"><span>{o.order_no} · {o.customer_name}</span><span>{bdt(o.total)} · {o.status}</span></div>)}{!orders.length && <p className="text-sm text-ink/60">No orders yet.</p>}</div>
      <div className="card"><h2 className="mb-2 font-semibold">Low stock</h2>{low.map(p => <div key={p.id} className="flex justify-between border-t border-ink/10 py-2 text-sm"><span>{p.name}</span><span>{p.stock_qty} left</span></div>)}{!low.length && <p className="text-sm text-ink/60">All products are above their thresholds.</p>}</div></div></div>
}
