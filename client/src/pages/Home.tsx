// Decision Rail design reminder: this is an industrial operations console where the persistent Decision Ledger
// explains why the next action is being suggested. Amber signals pending decisions; signal colors carry operational meaning.
import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle, ArrowRight, Bot, Boxes, CheckCircle2, ChevronRight, CircleDotDashed,
  ClipboardCheck, Clock3, Command, Download, Factory, Globe2, History, MapPin,
  MessageSquareText, PackageCheck, PackageOpen, PanelRight, Radio, Search, Send,
  ShieldAlert, ShieldCheck, ShoppingCart, Sparkles, Truck, Users, Warehouse, X, Zap,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type View = "dashboard" | "orders" | "inventory" | "fulfillment" | "materials" | "shipping" | "tracking" | "chat" | "analytics";
type Signal = "info" | "warning" | "critical" | "success";
type Stage = "created" | "allocated" | "picking" | "packing" | "qc" | "dispatched" | "qc-hold";
type IssueStatus = "quarantined" | "return" | "scrapped" | "released";
type TrackingState = "dispatched" | "in-transit" | "out-for-delivery" | "delivered" | "delivery-failed";

interface Order {
  id: string;
  customer: string;
  tier: "VIP" | "Priority" | "Standard";
  sku: string;
  units: number;
  priority: number;
  sla: string;
  slaHours: number;
  stage: Stage;
  destination: string;
}

interface InventoryItem {
  sku: string;
  name: string;
  supplier: string;
  bin: string;
  available: number;
  quarantine: number;
  reorderPoint: number;
  dailyUsage: number;
  leadTime: number;
  safetyStock: number;
}

interface MaterialIssue {
  id: string;
  sku: string;
  supplier: string;
  type: string;
  qty: number;
  batch: string;
  reportedBy: string;
  status: IssueStatus;
  reportedAt: string;
}

interface LedgerEntry { id: number; time: string; source: string; message: string; signal: Signal; }
interface Shipment { id: string; orderIds: string[]; carrier: string; service: "economy" | "standard" | "express"; tracking: string; cost: number; status: TrackingState; location: string; createdAt: string; }
interface ChatMessage { id: number; channel: string; author: string; role: string; text: string; time: string; template?: string; }

const stages: Array<{ key: Exclude<Stage, "qc-hold">; label: string }> = [
  { key: "created", label: "Created" }, { key: "allocated", label: "Allocated" }, { key: "picking", label: "Picking" },
  { key: "packing", label: "Packing" }, { key: "qc", label: "QC" }, { key: "dispatched", label: "Dispatched" },
];

const navItems: Array<{ id: View; label: string; icon: typeof Warehouse; }> = [
  { id: "dashboard", label: "Command center", icon: Command }, { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "inventory", label: "Inventory", icon: Boxes }, { id: "fulfillment", label: "Fulfillment", icon: PackageOpen },
  { id: "materials", label: "Material issues", icon: ShieldAlert }, { id: "shipping", label: "Shipping", icon: Truck },
  { id: "tracking", label: "Tracking", icon: MapPin }, { id: "chat", label: "Team chat", icon: MessageSquareText },
  { id: "analytics", label: "Analytics", icon: History },
];

const initialOrders: Order[] = [
  { id: "ORD-4507", customer: "Asha Electronics", tier: "VIP", sku: "SK-2088", units: 24, priority: 94, sla: "1h 32m", slaHours: 1.5, stage: "qc", destination: "Bengaluru" },
  { id: "ORD-4513", customer: "Nexon Retail", tier: "Priority", sku: "SK-1042", units: 18, priority: 81, sla: "3h 18m", slaHours: 3.3, stage: "packing", destination: "Bengaluru" },
  { id: "ORD-4520", customer: "Urban Pantry", tier: "Standard", sku: "SK-2088", units: 12, priority: 69, sla: "5h 42m", slaHours: 5.7, stage: "picking", destination: "Mysuru" },
  { id: "ORD-4526", customer: "Cobalt Home", tier: "Priority", sku: "SK-3177", units: 10, priority: 76, sla: "4h 10m", slaHours: 4.2, stage: "allocated", destination: "Chennai" },
  { id: "ORD-4531", customer: "Paper Kite", tier: "Standard", sku: "SK-1042", units: 16, priority: 55, sla: "7h 48m", slaHours: 7.8, stage: "created", destination: "Bengaluru" },
  { id: "ORD-4535", customer: "Motif Studio", tier: "VIP", sku: "SK-4401", units: 8, priority: 88, sla: "2h 24m", slaHours: 2.4, stage: "qc-hold", destination: "Hyderabad" },
];

const initialInventory: InventoryItem[] = [
  { sku: "SK-2088", name: "Flux dock, 65W", supplier: "Vertex Components", bin: "A-12-04", available: 84, quarantine: 16, reorderPoint: 96, dailyUsage: 18, leadTime: 4, safetyStock: 24 },
  { sku: "SK-1042", name: "Cable kit, braided", supplier: "Nara Supply Co.", bin: "B-04-02", available: 214, quarantine: 0, reorderPoint: 108, dailyUsage: 22, leadTime: 3, safetyStock: 42 },
  { sku: "SK-3177", name: "Stackable sensor", supplier: "Vertex Components", bin: "C-06-11", available: 42, quarantine: 0, reorderPoint: 54, dailyUsage: 9, leadTime: 4, safetyStock: 18 },
  { sku: "SK-4401", name: "Retail display hub", supplier: "Lantern Goods", bin: "D-09-01", available: 108, quarantine: 0, reorderPoint: 72, dailyUsage: 12, leadTime: 3, safetyStock: 36 },
];

const initialIssues: MaterialIssue[] = [
  { id: "MIS-090", sku: "SK-2088", supplier: "Vertex Components", type: "Incoming defect", qty: 16, batch: "VC-7751", reportedBy: "Riya / QC", status: "quarantined", reportedAt: "08:42" },
  { id: "MIS-089", sku: "SK-3177", supplier: "Vertex Components", type: "Mislabeled", qty: 8, batch: "VC-7728", reportedBy: "Arun / Receiving", status: "quarantined", reportedAt: "07:18" },
  { id: "MIS-087", sku: "SK-1042", supplier: "Nara Supply Co.", type: "Damaged in storage", qty: 6, batch: "NS-4902", reportedBy: "Kunal / Picker", status: "return", reportedAt: "Yesterday" },
];

const initialLedger: LedgerEntry[] = [
  { id: 1, time: "09:18:42", source: "Shipping", signal: "warning", message: "ORD-4507 has 1h 32m SLA remaining and VIP tier. Express is recommended despite +₹120 cost." },
  { id: 2, time: "09:03:08", source: "Materials", signal: "critical", message: "Batch VC-7751 was quarantined. SK-2088 is now 12 units below its reorder point; replenish recommendation created." },
  { id: 3, time: "08:54:31", source: "Allocation", signal: "success", message: "ORD-4526 allocated from bin C-06-11. Stock remains above safety threshold after allocation." },
  { id: 4, time: "08:42:12", source: "QC", signal: "critical", message: "Riya placed ORD-4535 on QC hold: retail display hub requires visual inspection before carrier assignment." },
];

const initialShipments: Shipment[] = [
  { id: "SHP-2048", orderIds: ["ORD-4492"], carrier: "Swiftlane", service: "express", tracking: "W9-EXP-884203", cost: 280, status: "in-transit", location: "Bengaluru Distribution Hub", createdAt: "09:18" },
  { id: "SHP-2047", orderIds: ["ORD-4489", "ORD-4490"], carrier: "ParcelGo", service: "standard", tracking: "W9-STD-884198", cost: 190, status: "out-for-delivery", location: "Whitefield Delivery Station", createdAt: "08:40" },
];

const volumeData = [{ day: "Mon", orders: 64 }, { day: "Tue", orders: 72 }, { day: "Wed", orders: 61 }, { day: "Thu", orders: 83 }, { day: "Fri", orders: 78 }, { day: "Sat", orders: 94 }, { day: "Sun", orders: 87 }];
const riskData = [{ name: "Healthy", count: 17, fill: "#3DDC84" }, { name: "Watch", count: 6, fill: "#F5A623" }, { name: "Critical", count: 3, fill: "#FF5A5F" }];

const nowStamp = () => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
const signalLabel: Record<Signal, string> = { info: "Information", warning: "Decision required", critical: "Exception", success: "Resolved" };
const nextStageLabel: Record<Exclude<Stage, "qc-hold" | "dispatched">, string> = { created: "Allocate", allocated: "Start picking", picking: "Move to packing", packing: "Send to QC", qc: "Ready to ship" };

function stageName(stage: Stage) { return stage === "qc-hold" ? "QC Hold" : stages.find((item) => item.key === stage)?.label ?? stage; }
function fmtCurrency(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value); }

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [issues, setIssues] = useState<MaterialIssue[]>(initialIssues);
  const [ledger, setLedger] = useState<LedgerEntry[]>(initialLedger);
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState("# shift-a");
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, channel: "# shift-a", author: "Meera", role: "Supervisor", text: "Shift handoff is complete. Please keep an eye on SK-2088 quarantine impact.", time: "08:51" },
    { id: 2, channel: "# shift-a", author: "Arun", role: "Receiving", text: "@Riya I have isolated the mislabeled sensor batch in Quarantine.", time: "09:01" },
    { id: 3, channel: "ORD-4507", author: "Riya", role: "QC", text: "QC passed. Unit count and seal checks match allocation.", time: "09:12" },
  ]);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  const openIssues = issues.filter((issue) => issue.status === "quarantined");
  const readyToShip = orders.filter((order) => order.stage === "qc");
  const totalAtRisk = inventory.filter((item) => item.available < item.reorderPoint).length;
  const orderProgress = useMemo(() => {
    const result = new Map<string, number>();
    orders.forEach((order) => result.set(order.id, order.stage === "qc-hold" ? 4 : stages.findIndex((stage) => stage.key === order.stage)));
    return result;
  }, [orders]);

  const logDecision = (source: string, message: string, signal: Signal = "info") => {
    setLedger((current) => [{ id: Date.now(), time: nowStamp(), source, message, signal }, ...current].slice(0, 18));
  };

  const advanceOrder = (id: string) => {
    const order = orders.find((item) => item.id === id);
    if (!order || order.stage === "qc-hold" || order.stage === "dispatched") return;
    const currentIndex = stages.findIndex((stage) => stage.key === order.stage);
    const next = stages[currentIndex + 1]?.key;
    if (!next) return;
    setOrders((current) => current.map((item) => item.id === id ? { ...item, stage: next } : item));
    logDecision("Fulfillment", `${id} advanced from ${stageName(order.stage)} to ${stageName(next)}. The next operational handoff is now available.`, next === "qc" ? "warning" : "success");
  };

  const reportMaterialIssue = (sku: string) => {
    const item = inventory.find((entry) => entry.sku === sku);
    if (!item || item.available < 6) return;
    const quantity = Math.min(8, item.available);
    const issue: MaterialIssue = { id: `MIS-${Date.now().toString().slice(-3)}`, sku, supplier: item.supplier, type: "Damaged in storage", qty: quantity, batch: `INT-${Date.now().toString().slice(-4)}`, reportedBy: "You / Floor", status: "quarantined", reportedAt: nowStamp() };
    setIssues((current) => [issue, ...current]);
    setInventory((current) => current.map((entry) => entry.sku === sku ? { ...entry, available: entry.available - quantity, quarantine: entry.quarantine + quantity } : entry));
    logDecision("Materials", `${quantity} units of ${sku} moved to Quarantine. The allocation engine will exclude this batch immediately.`, "critical");
    if (item.available - quantity < item.reorderPoint) logDecision("Replenishment", `${sku} fell below its reorder point after quarantine. Recommend a purchase order for ${item.reorderPoint + item.safetyStock - (item.available - quantity)} units.`, "warning");
  };

  const resolveIssue = (issueId: string, resolution: IssueStatus) => {
    const issue = issues.find((item) => item.id === issueId);
    if (!issue) return;
    setIssues((current) => current.map((item) => item.id === issueId ? { ...item, status: resolution } : item));
    if (resolution === "released") setInventory((current) => current.map((item) => item.sku === issue.sku ? { ...item, available: item.available + issue.qty, quarantine: Math.max(0, item.quarantine - issue.qty) } : item));
    if (resolution !== "released") setInventory((current) => current.map((item) => item.sku === issue.sku ? { ...item, quarantine: Math.max(0, item.quarantine - issue.qty) } : item));
    const label = resolution === "released" ? "released back to allocatable stock" : resolution === "return" ? "marked for supplier return" : "scrapped and removed from stock";
    logDecision("Materials", `${issue.id} (${issue.sku}) was ${label}. Disposition recorded by the operations team.`, resolution === "released" ? "success" : "warning");
  };

  const assignShipment = (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order || order.stage !== "qc") return;
    const service: Shipment["service"] = order.tier === "VIP" || order.slaHours <= 2 ? "express" : order.slaHours <= 4 ? "standard" : "economy";
    const carrier = service === "express" ? "Swiftlane" : service === "standard" ? "ParcelGo" : "Economy Freight";
    const cost = service === "express" ? 280 : service === "standard" ? 160 : 92;
    const shipment: Shipment = { id: `SHP-${2050 + shipments.length}`, orderIds: [orderId], carrier, service, tracking: `W9-${service.slice(0, 3).toUpperCase()}-${884210 + shipments.length}`, cost, status: "dispatched", location: "Bengaluru Fulfillment Center", createdAt: nowStamp() };
    setShipments((current) => [shipment, ...current]);
    setOrders((current) => current.map((item) => item.id === orderId ? { ...item, stage: "dispatched" } : item));
    const rationale = service === "express" ? `${order.sla} SLA remaining and ${order.tier} tier` : `${order.sla} SLA remaining; lowest viable service`;
    logDecision("Shipping", `${order.id}: ${rationale} → assigned ${carrier} ${service} at ${fmtCurrency(cost)}.`, service === "express" ? "warning" : "success");
  };

  const suggestConsolidation = () => {
    const candidates = readyToShip.filter((order) => order.destination === "Bengaluru" && order.slaHours > 2);
    logDecision("Shipping", candidates.length > 1 ? `Manifest opportunity: combine ${candidates.map((order) => order.id).join(" + ")} for Bengaluru. No order is SLA-critical; estimated savings ${fmtCurrency(110)}.` : "No safe consolidation is currently available. SLA-critical and destination-mismatched orders remain separate.", candidates.length > 1 ? "success" : "info");
  };

  const advanceTracking = (shipmentId: string) => {
    const shipment = shipments.find((entry) => entry.id === shipmentId);
    if (!shipment || shipment.status === "delivered" || shipment.status === "delivery-failed") return;
    const route: TrackingState[] = ["dispatched", "in-transit", "out-for-delivery", "delivered"];
    const next = route[route.indexOf(shipment.status) + 1];
    const location = next === "in-transit" ? "Bengaluru Distribution Hub" : next === "out-for-delivery" ? "Whitefield Delivery Station" : "Customer delivery address";
    setShipments((current) => current.map((entry) => entry.id === shipmentId ? { ...entry, status: next, location } : entry));
    logDecision("Tracking", `${shipment.tracking} advanced to ${next.replaceAll("-", " ")} at ${location}.`, next === "delivered" ? "success" : "info");
  };

  const triggerDeliveryIssue = (shipmentId: string) => {
    const shipment = shipments.find((entry) => entry.id === shipmentId);
    if (!shipment) return;
    setShipments((current) => current.map((entry) => entry.id === shipmentId ? { ...entry, status: "delivery-failed", location: "Whitefield Delivery Station" } : entry));
    logDecision("Tracking", `${shipment.tracking} reported a delivery failure. Create a proactive customer alert and schedule the next delivery window.`, "critical");
    logDecision("Resolution", `If redelivery fails, recommend reshipment through the standard allocation engine; fresh inventory will be reserved, not reused from the failed parcel.`, "warning");
  };

  const downloadLabel = (shipment: Shipment) => {
    const body = `WMS-9 SHIPPING LABEL\nTracking: ${shipment.tracking}\nCarrier: ${shipment.carrier}\nService: ${shipment.service}\nOrders: ${shipment.orderIds.join(", ")}\nDestination: ${shipment.location}`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${shipment.tracking}-label.txt`; anchor.click(); URL.revokeObjectURL(url);
    logDecision("Shipping", `Label preview exported for ${shipment.tracking}.`, "info");
  };

  const sendChat = (template?: string) => {
    const text = template ?? chatDraft.trim();
    if (!text) return;
    const message: ChatMessage = { id: Date.now(), channel: activeChannel, author: "You", role: "Shift lead", text, time: nowStamp(), template };
    setChatMessages((current) => [...current, message]); setChatDraft("");
    logDecision("Team chat", `${activeChannel}: ${template ? `quick action “${template}”` : "message"} recorded by You.`, template ? "warning" : "info");
    if (template === "QC hold") {
      const candidate = orders.find((order) => order.stage === "qc");
      if (candidate) { setOrders((current) => current.map((order) => order.id === candidate.id ? { ...order, stage: "qc-hold" } : order)); logDecision("QC", `${candidate.id} moved to QC hold from the chat quick action. Carrier assignment is blocked until release.`, "critical"); }
    }
  };

  const viewMeta: Record<View, { eyebrow: string; title: string; description: string }> = {
    dashboard: { eyebrow: "Shift A · Bengaluru FC", title: "Command center", description: "Resolve the next constraint before it slows the order flow." },
    orders: { eyebrow: "Priority engine", title: "Order control", description: "Orders are ranked by SLA exposure, customer tier, and allocation confidence." },
    inventory: { eyebrow: "Allocatable stock", title: "Inventory signal", description: "Stock math separates available inventory from quarantined material." },
    fulfillment: { eyebrow: "Floor workflow", title: "Fulfillment board", description: "Advance only the next valid handoff; QC holds deliberately block shipping." },
    materials: { eyebrow: "Inbound & quality", title: "Material issues", description: "Quarantine removes unreliable stock before it can create an outbound failure." },
    shipping: { eyebrow: "Carrier intelligence", title: "Shipping desk", description: "Carrier choice balances SLA exposure against dispatch cost." },
    tracking: { eyebrow: "Post-dispatch", title: "Tracking control", description: "Simulate live checkpoints and convert delivery exceptions into recovery decisions." },
    chat: { eyebrow: "Floor coordination", title: "Team chat", description: "Operational conversations stay attached to the exception or order they affect." },
    analytics: { eyebrow: "Operational learning", title: "Analytics", description: "Use throughput, inventory health, and supplier signals to prevent repeat exceptions." },
  };

  return (
    <div className="ops-shell">
      <aside className="sidebar">
        <div className="brand"><img className="brand-mark" src="/manus-storage/wms9-logo-mark_f965730e.png" alt="WMS-9" /><span>WMS<span>-9</span></span></div>
        <div className="facility-chip"><span className="pulse" /> FC-01 · LIVE</div>
        <nav aria-label="Operations modules">
          <p className="nav-label">Operations</p>
          {navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-link ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)}><Icon size={18} /><span>{item.label}</span>{item.id === "materials" && openIssues.length > 0 && <b>{openIssues.length}</b>}</button>; })}
        </nav>
        <div className="sidebar-footer"><div className="operator-avatar">MS</div><div><strong>Meera Singh</strong><small>Shift supervisor</small></div><ChevronRight size={16} /></div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div><p className="eyebrow">{viewMeta[view].eyebrow}</p><h1>{viewMeta[view].title}</h1><p>{viewMeta[view].description}</p></div>
          <div className="header-actions"><Link href="/track" className="customer-link"><Globe2 size={16} /> Customer tracking</Link><button className="ledger-mobile-button" onClick={() => setIsLedgerOpen(true)}><PanelRight size={17} /> Ledger</button><button className="shift-button"><Users size={17} /> 12 active</button></div>
        </header>

        <div className="workspace-content">
          {view === "dashboard" && <Dashboard orders={orders} inventory={inventory} openIssues={openIssues.length} setView={setView} onShip={assignShipment} />}
          {view === "orders" && <OrdersView orders={orders} onSelect={setSelectedOrderId} />}
          {view === "inventory" && <InventoryView inventory={inventory} onReport={reportMaterialIssue} />}
          {view === "fulfillment" && <FulfillmentView orders={orders} progress={orderProgress} onAdvance={advanceOrder} />}
          {view === "materials" && <MaterialsView issues={issues} inventory={inventory} onResolve={resolveIssue} onReport={reportMaterialIssue} />}
          {view === "shipping" && <ShippingView shipments={shipments} readyOrders={readyToShip} onAssign={assignShipment} onConsolidate={suggestConsolidation} onDownload={downloadLabel} />}
          {view === "tracking" && <TrackingView shipments={shipments} onAdvance={advanceTracking} onIssue={triggerDeliveryIssue} />}
          {view === "chat" && <ChatView channel={activeChannel} setChannel={setActiveChannel} messages={chatMessages} draft={chatDraft} setDraft={setChatDraft} onSend={sendChat} />}
          {view === "analytics" && <AnalyticsView inventory={inventory} />}
        </div>
      </section>

      <aside className={`decision-ledger ${isLedgerOpen ? "ledger-open" : ""}`}>
        <div className="ledger-head"><div><p className="eyebrow amber-text"><Bot size={14} /> System reasoning</p><h2>Decision Ledger</h2></div><button aria-label="Close decision ledger" className="close-ledger" onClick={() => setIsLedgerOpen(false)}><X size={19} /></button></div>
        <div className="ledger-subhead"><span><Radio size={13} /> LIVE FEED</span><small>{ledger.length} events</small></div>
        <div className="ledger-list">
          {ledger.map((entry) => <article className="ledger-entry" key={entry.id}><div className={`signal-dot ${entry.signal}`} title={signalLabel[entry.signal]} /><div><p><time>{entry.time}</time><span>{entry.source}</span></p><div>{entry.message}</div></div></article>)}
        </div>
        <footer className="ledger-foot"><Sparkles size={16} /><span>Every operational action is traceable.</span></footer>
      </aside>

      {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrderId(null)} onAdvance={advanceOrder} onShip={assignShipment} />}
    </div>
  );
}

function Dashboard({ orders, inventory, openIssues, setView, onShip }: { orders: Order[]; inventory: InventoryItem[]; openIssues: number; setView: (view: View) => void; onShip: (id: string) => void; }) {
  const slaRisk = orders.filter((order) => order.slaHours < 3 && order.stage !== "dispatched").length;
  const qcOrder = orders.find((order) => order.stage === "qc");
  return <>
    <section className="hero-decision">
      <div className="hero-copy"><p className="eyebrow amber-text"><Zap size={14} /> Highest-leverage next move</p><h2>{qcOrder ? `Ship ${qcOrder.id} via Express.` : "Clear the QC hold before dispatch."}</h2><p>{qcOrder ? `${qcOrder.customer} is a VIP order with ${qcOrder.sla} remaining. Express protects the dispatch commitment.` : "A QC hold is blocking carrier assignment. Review the hold reason and release or rework."}</p><div><button className="primary-action" onClick={() => qcOrder ? onShip(qcOrder.id) : setView("fulfillment")}>{qcOrder ? "Assign carrier" : "Open fulfillment"} <ArrowRight size={17} /></button><button className="quiet-action" onClick={() => setView("orders")}>See evidence</button></div></div>
      <div className="hero-signal"><div className="signal-ring"><span>{qcOrder ? qcOrder.priority : 88}</span><small>Priority</small></div><p><span className="pulse amber-pulse" /> Decision pending</p></div>
    </section>
    <section className="kpi-grid">
      <Kpi label="Orders moving" value="42" delta="+8% vs. last shift" icon={<PackageCheck />} tone="blue" />
      <Kpi label="SLA at risk" value={String(slaRisk)} delta="Action in the next 2h" icon={<Clock3 />} tone="amber" />
      <Kpi label="Material holds" value={String(openIssues)} delta="Quarantine is active" icon={<ShieldAlert />} tone="red" />
      <Kpi label="Allocatable rate" value={`${Math.round((inventory.reduce((sum, item) => sum + item.available, 0) / (inventory.reduce((sum, item) => sum + item.available + item.quarantine, 0))) * 100)}%`} delta="Excludes Quarantine" icon={<ShieldCheck />} tone="green" />
    </section>
    <section className="dashboard-grid">
      <div className="field-panel chart-panel"><div className="panel-header"><div><p className="eyebrow">Shift velocity</p><h2>Orders by operational stage</h2></div><button className="icon-button" onClick={() => setView("analytics")}><ArrowRight size={17} /></button></div><StageBars orders={orders} /></div>
      <div className="field-panel bottleneck-panel"><div className="panel-header"><div><p className="eyebrow">Attention queue</p><h2>Resolve before it spreads</h2></div><span className="status-count">{slaRisk + openIssues}</span></div><button className="bottleneck-row" onClick={() => setView("materials")}><span className="alert-icon red"><ShieldAlert size={18} /></span><span><strong>SK-2088 quarantine</strong><small>Below reorder point after QC isolation</small></span><ChevronRight size={17} /></button><button className="bottleneck-row" onClick={() => setView("orders")}><span className="alert-icon amber"><Clock3 size={18} /></span><span><strong>VIP shipment needs carrier</strong><small>ORD-4507 reaches cutoff in 1h 32m</small></span><ChevronRight size={17} /></button><button className="bottleneck-row" onClick={() => setView("tracking")}><span className="alert-icon blue"><Truck size={18} /></span><span><strong>Two parcels near delivery</strong><small>Advance checkpoint to confirm proof of delivery</small></span><ChevronRight size={17} /></button></div>
    </section>
  </>;
}

function Kpi({ label, value, delta, icon, tone }: { label: string; value: string; delta: string; icon: React.ReactNode; tone: string }) { return <article className="kpi-card"><div className={`kpi-icon ${tone}`}>{icon}</div><div><p>{label}</p><strong>{value}</strong><small>{delta}</small></div></article>; }

function StageBars({ orders }: { orders: Order[] }) { const counts = stages.map((stage) => ({ label: stage.label, value: orders.filter((order) => order.stage === stage.key).length })); return <div className="stage-bars">{counts.map((item) => <div className="stage-bar" key={item.label}><div className="bar-rail"><span style={{ height: `${Math.max(16, item.value * 36)}px` }} /></div><b>{item.value}</b><small>{item.label}</small></div>)}</div>; }

function OrdersView({ orders, onSelect }: { orders: Order[]; onSelect: (id: string) => void }) { return <section className="field-panel table-panel"><div className="panel-header"><div><p className="eyebrow">Priority sorted queue</p><h2>Every order includes its allocation evidence</h2></div><div className="table-filter"><Search size={16} /> Search orders</div></div><div className="responsive-table"><div className="table-row table-head"><span>Order</span><span>Customer / tier</span><span>Priority</span><span>SLA exposure</span><span>Stage</span><span /></div>{[...orders].sort((a,b) => b.priority - a.priority).map((order) => <button className="table-row order-row" key={order.id} onClick={() => onSelect(order.id)}><span className="mono strong">{order.id}<small>{order.sku} · {order.units} units</small></span><span><strong>{order.customer}</strong><small className={`tier ${order.tier.toLowerCase()}`}>{order.tier}</small></span><span className="priority-score"><i><b style={{ width: `${order.priority}%` }} /></i><strong>{order.priority}</strong></span><span className={order.slaHours < 3 ? "sla urgent" : "sla"}><Clock3 size={15} /> {order.sla}</span><span><span className={`stage-badge ${order.stage}`}>{stageName(order.stage)}</span></span><ChevronRight size={18} /></button>)}</div></section>; }

function InventoryView({ inventory, onReport }: { inventory: InventoryItem[]; onReport: (sku: string) => void }) { return <section className="field-panel table-panel"><div className="panel-header"><div><p className="eyebrow">Reorder point = daily usage × lead time + safety stock</p><h2>Allocation-safe inventory</h2></div><span className="legend"><i className="green-dot" /> available <i className="red-dot" /> quarantine</span></div><div className="responsive-table"><div className="table-row inventory-head table-head"><span>SKU / bin</span><span>Supplier</span><span>Available</span><span>Reorder math</span><span>Status</span><span /></div>{inventory.map((item) => { const low = item.available < item.reorderPoint; return <div className="table-row inventory-row" key={item.sku}><span className="mono strong">{item.sku}<small>{item.name} · {item.bin}</small></span><span>{item.supplier}</span><span><strong>{item.available}</strong><small>{item.quarantine} in Quarantine</small></span><span className="mono">{item.dailyUsage} × {item.leadTime} + {item.safetyStock} = <b>{item.reorderPoint}</b></span><span className={`stock-status ${low ? "low" : "healthy"}`}>{low ? "Reorder" : "Healthy"}</span><button className="text-button" onClick={() => onReport(item.sku)}>Report issue</button></div>; })}</div></section>; }

function FulfillmentView({ orders, progress, onAdvance }: { orders: Order[]; progress: Map<string, number>; onAdvance: (id: string) => void }) { return <div className="fulfillment-wrap"><div className="batch-callout"><CircleDotDashed size={19} /><div><strong>Suggested batch pick</strong><span>Pick ORD-4520 and ORD-4526 together from zones B–C; estimated 6 minutes saved.</span></div><button>Accept batch</button></div><section className="kanban-board">{stages.slice(0, 5).map((stage, index) => <div className="kanban-column" key={stage.key}><div className="kanban-head"><span>{stage.label}</span><b>{orders.filter((order) => order.stage === stage.key).length}</b></div>{orders.filter((order) => order.stage === stage.key).map((order) => <article className="order-card" key={order.id}><div><span className="mono">{order.id}</span><span className={`tier ${order.tier.toLowerCase()}`}>{order.tier}</span></div><h3>{order.customer}</h3><p>{order.sku} · {order.units} units</p><div className="card-bottom"><span className={order.slaHours < 3 ? "sla urgent" : "sla"}><Clock3 size={14} />{order.sla}</span>{index < 4 && <button onClick={() => onAdvance(order.id)}>{nextStageLabel[stage.key as Exclude<Stage, "qc-hold" | "dispatched">]} <ArrowRight size={14} /></button>}</div></article>)}{stage.key === "qc" && orders.filter((order) => order.stage === "qc-hold").map((order) => <article className="order-card qc-hold-card" key={order.id}><div><span className="mono">{order.id}</span><span className="tier vip">HOLD</span></div><h3>{order.customer}</h3><p>QC must release before shipping.</p></article>)}</div>)}</section><div className="workflow-rail">{stages.map((stage) => <span className="rail-step" key={stage.key}><i className={orders.some((order) => progress.get(order.id) === stages.findIndex((item) => item.key === stage.key)) ? "active" : ""} />{stage.label}</span>)}</div></div>; }

function MaterialsView({ issues, inventory, onResolve, onReport }: { issues: MaterialIssue[]; inventory: InventoryItem[]; onResolve: (id: string, status: IssueStatus) => void; onReport: (sku: string) => void; }) { return <div className="materials-layout"><section className="field-panel quarantine-panel"><div className="quarantine-image" /><div className="quarantine-overlay"><p className="eyebrow amber-text">Virtual bin · Q-01</p><h2>Quarantine is a decision, not a label.</h2><p>Flagged material becomes invisible to allocation immediately. Only an explicit disposition can release it.</p></div></section><section className="field-panel issues-panel"><div className="panel-header"><div><p className="eyebrow">Disposition queue</p><h2>{issues.filter((issue) => issue.status === "quarantined").length} batches need a resolution</h2></div></div>{issues.filter((issue) => issue.status === "quarantined").map((issue) => <article className="issue-card" key={issue.id}><div className="issue-top"><span className="issue-id">{issue.id}</span><span className="issue-type">{issue.type}</span><time>{issue.reportedAt}</time></div><h3>{issue.sku} <small>· {issue.qty} units · batch {issue.batch}</small></h3><p>{issue.supplier} · reported by {issue.reportedBy}</p><div className="issue-actions"><button onClick={() => onResolve(issue.id, "return")}>Return to supplier</button><button onClick={() => onResolve(issue.id, "scrapped")}>Scrap</button><button className="release" onClick={() => onResolve(issue.id, "released")}>Release false alarm</button></div></article>)}</section><section className="field-panel report-panel"><p className="eyebrow">Floor signal</p><h2>Report a new material issue</h2><p>Select a SKU to isolate an affected batch, remove it from allocation, and evaluate its reorder exposure.</p>{inventory.map((item) => <button className="report-sku" key={item.sku} onClick={() => onReport(item.sku)}><span className="mono">{item.sku}</span><span>{item.name}</span><ArrowRight size={15} /></button>)}</section></div>; }

function ShippingView({ shipments, readyOrders, onAssign, onConsolidate, onDownload }: { shipments: Shipment[]; readyOrders: Order[]; onAssign: (id: string) => void; onConsolidate: () => void; onDownload: (shipment: Shipment) => void; }) { return <div className="shipping-layout"><section className="field-panel carrier-panel"><div className="panel-header"><div><p className="eyebrow">Carrier decision engine</p><h2>Ready-to-ship orders</h2></div><button className="text-button" onClick={onConsolidate}>Check consolidation <Sparkles size={15} /></button></div>{readyOrders.length ? readyOrders.map((order) => <article className="ship-order" key={order.id}><div><span className="mono">{order.id}</span><h3>{order.customer}</h3><p>{order.destination} · {order.units} units · <span className={order.slaHours < 3 ? "urgent" : ""}>{order.sla} SLA</span></p></div><div className="carrier-recommendation"><small>Recommended</small><strong>{order.tier === "VIP" || order.slaHours <= 2 ? "Swiftlane Express" : "ParcelGo Standard"}</strong><p>{order.tier === "VIP" || order.slaHours <= 2 ? "Protects VIP SLA" : "Lowest viable cost"}</p></div><button className="primary-action small" onClick={() => onAssign(order.id)}>Assign</button></article>) : <EmptyState icon={<Truck />} title="No QC-passed orders waiting" text="Advance an order through QC to activate a carrier decision." />}</section><section className="field-panel manifest-panel"><div className="manifest-visual" /><div><p className="eyebrow amber-text">Manifest intelligence</p><h2>Combine only when the clock allows it.</h2><p>Orders going to the same region can share a manifest if neither is SLA-critical. The ledger records the cost rationale.</p><button onClick={onConsolidate}>Evaluate current queue <ArrowRight size={16} /></button></div></section><section className="field-panel shipment-table"><div className="panel-header"><div><p className="eyebrow">Recently dispatched</p><h2>Labels and manifests</h2></div></div>{shipments.map((shipment) => <div className="shipment-row" key={shipment.id}><div className="shipment-carrier"><Truck size={18} /><div><strong>{shipment.carrier}</strong><small className="mono">{shipment.tracking}</small></div></div><span className={`service-badge ${shipment.service}`}>{shipment.service}</span><span>{shipment.orderIds.join(" + ")}</span><span className="mono">{fmtCurrency(shipment.cost)}</span><button className="icon-button" title="Download shipping label" onClick={() => onDownload(shipment)}><Download size={17} /></button></div>)}</section></div>; }

function TrackingView({ shipments, onAdvance, onIssue }: { shipments: Shipment[]; onAdvance: (id: string) => void; onIssue: (id: string) => void; }) { return <div className="tracking-layout"><section className="field-panel tracking-hero"><div className="tracking-map" /><div><p className="eyebrow amber-text">Live simulation</p><h2>Advance the real-world handoff.</h2><p>Each demo checkpoint adds a time-and-place event to the ledger. A delivery failure becomes an owned resolution path instead of a dead-end red badge.</p><Link href="/track" className="customer-link dark-link"><Globe2 size={16} /> Open customer view</Link></div></section><section className="shipment-cards">{shipments.map((shipment) => <article className="field-panel shipment-card" key={shipment.id}><div className="shipment-card-head"><div><span className="mono">{shipment.tracking}</span><h2>{shipment.carrier} <small>· {shipment.orderIds.join(", ")}</small></h2></div><span className={`stage-badge ${shipment.status}`}>{shipment.status.replaceAll("-", " ")}</span></div><div className="tracking-steps">{(["dispatched", "in-transit", "out-for-delivery", "delivered"] as TrackingState[]).map((step, index) => { const order = ["dispatched", "in-transit", "out-for-delivery", "delivered"]; const activeIndex = shipment.status === "delivery-failed" ? 2 : order.indexOf(shipment.status); return <div className={index <= activeIndex ? "complete" : ""} key={step}><i>{index < activeIndex ? <CheckCircle2 size={14} /> : index + 1}</i><span>{step.replaceAll("-", " ")}</span></div>; })}</div><div className="checkpoint"><MapPin size={18} /><div><small>Current checkpoint</small><strong>{shipment.location}</strong></div><time>{shipment.createdAt}</time></div><div className="shipment-actions"><button className="primary-action small" disabled={shipment.status === "delivered" || shipment.status === "delivery-failed"} onClick={() => onAdvance(shipment.id)}>Advance status <ArrowRight size={15} /></button><button className="quiet-action danger" disabled={shipment.status === "delivered" || shipment.status === "delivery-failed"} onClick={() => onIssue(shipment.id)}>Simulate delivery issue</button></div></article>)}</section></div>; }

function ChatView({ channel, setChannel, messages, draft, setDraft, onSend }: { channel: string; setChannel: (channel: string) => void; messages: ChatMessage[]; draft: string; setDraft: (value: string) => void; onSend: (template?: string) => void; }) { const channels = ["# shift-a", "ORD-4507", "MIS-090"]; return <div className="chat-layout"><aside className="field-panel channel-list"><p className="eyebrow">Active context</p>{channels.map((item) => <button key={item} className={channel === item ? "active" : ""} onClick={() => setChannel(item)}><MessageSquareText size={16} /><span>{item}</span>{item === "# shift-a" && <b>6</b>}</button>)}<div className="presence"><p className="eyebrow">On shift now</p><span><i className="presence-dot" /> Meera · Supervisor</span><span><i className="presence-dot" /> Riya · QC</span><span><i className="presence-dot away" /> Arun · Receiving</span></div></aside><section className="field-panel conversation"><div className="chat-title"><div><p className="eyebrow">Thread</p><h2>{channel}</h2></div><span><Users size={15} /> 4 participants</span></div><div className="messages">{messages.filter((message) => message.channel === channel).map((message) => <article className="chat-message" key={message.id}><div className="message-avatar">{message.author.slice(0, 2).toUpperCase()}</div><div><p><strong>{message.author}</strong><small>{message.role} · {message.time}</small></p><div>{message.text}</div></div></article>)}{messages.filter((message) => message.channel === channel).length === 0 && <EmptyState icon={<MessageSquareText />} title="No messages in this thread" text="Use a quick action to log a floor event with its operational context." />}</div><div className="quick-actions">{["Need backup at bin", "Item not found", "QC hold", "Ready for pickup"].map((template) => <button key={template} onClick={() => onSend(template)}>{template}</button>)}</div><div className="chat-compose"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSend(); }} placeholder={`Message ${channel}`} /><button onClick={() => onSend()}><Send size={17} /></button></div></section></div>; }

function AnalyticsView({ inventory }: { inventory: InventoryItem[] }) { const supplier = [{ name: "Vertex Components", defect: 5.7, time: "4h 18m", status: "Watch" }, { name: "Nara Supply Co.", defect: 1.3, time: "1h 44m", status: "Healthy" }, { name: "Lantern Goods", defect: 0.8, time: "1h 12m", status: "Healthy" }]; return <div className="analytics-grid"><section className="field-panel line-chart-panel"><div className="panel-header"><div><p className="eyebrow">Throughput trend</p><h2>Orders completed per day</h2></div><span className="trend-up">+16.4%</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={volumeData}><defs><linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F5A623" stopOpacity={0.42}/><stop offset="100%" stopColor="#F5A623" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis hide /><Tooltip contentStyle={{ background: "#1B212B", border: "1px solid #2B3240", borderRadius: 0 }} /><Area type="monotone" dataKey="orders" stroke="#F5A623" strokeWidth={3} fill="url(#ordersFill)" /></AreaChart></ResponsiveContainer></div></section><section className="field-panel health-chart-panel"><div className="panel-header"><div><p className="eyebrow">Inventory health</p><h2>SKU risk split</h2></div></div><div className="chart-wrap compact"><ResponsiveContainer width="100%" height="100%"><BarChart data={riskData} layout="vertical"><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={65} /><Tooltip contentStyle={{ background: "#1B212B", border: "1px solid #2B3240" }} /><Bar dataKey="count" radius={0} /></BarChart></ResponsiveContainer></div></section><section className="field-panel supplier-table"><div className="panel-header"><div><p className="eyebrow">Supplier scorecard</p><h2>Quality impacts allocation confidence</h2></div></div>{supplier.map((row) => <div className="supplier-row" key={row.name}><Factory size={18} /><strong>{row.name}</strong><span><small>Defect rate</small>{row.defect}%</span><span><small>Avg resolution</small>{row.time}</span><span className={`stock-status ${row.status === "Watch" ? "low" : "healthy"}`}>{row.status}</span></div>)}</section><section className="field-panel risk-list"><p className="eyebrow">Top at-risk SKUs</p>{inventory.filter((item) => item.available < item.reorderPoint).map((item) => <article key={item.sku}><span className="alert-icon red"><AlertTriangle size={16} /></span><div><strong>{item.sku} · {item.name}</strong><p>{item.available} available vs {item.reorderPoint} reorder point</p></div><button>Plan reorder</button></article>)}</section></div>; }

function OrderDetail({ order, onClose, onAdvance, onShip }: { order: Order; onClose: () => void; onAdvance: (id: string) => void; onShip: (id: string) => void; }) { const canAdvance = order.stage !== "qc-hold" && order.stage !== "dispatched"; return <div className="modal-backdrop" role="presentation"><section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title"><button className="close-modal" onClick={onClose}><X size={19} /></button><p className="eyebrow amber-text">Order intelligence</p><h2 id="order-detail-title">{order.id} <span className={`tier ${order.tier.toLowerCase()}`}>{order.tier}</span></h2><p className="modal-customer">{order.customer} · {order.destination}</p><div className="detail-grid"><div><small>Priority score</small><strong>{order.priority}/100</strong></div><div><small>SLA remaining</small><strong className={order.slaHours < 3 ? "urgent" : ""}>{order.sla}</strong></div><div><small>Current stage</small><strong>{stageName(order.stage)}</strong></div><div><small>Allocation</small><strong>Bin-safe</strong></div></div><div className="reasoning-box"><Bot size={20} /><div><p className="eyebrow">Allocation reasoning</p><strong>Selected in-stock batch with the shortest walk path.</strong><span>{order.sku} has verified available stock; quarantined quantities were excluded. Allocation preserves safety stock after reserving {order.units} units.</span></div></div><div className="modal-actions">{order.stage === "qc" && <button className="primary-action" onClick={() => { onShip(order.id); onClose(); }}>Assign carrier <Truck size={16} /></button>}{canAdvance && order.stage !== "qc" && <button className="primary-action" onClick={() => { onAdvance(order.id); onClose(); }}>{nextStageLabel[order.stage as Exclude<Stage, "qc-hold" | "dispatched">]} <ArrowRight size={16} /></button>}<button className="quiet-action" onClick={onClose}>Close detail</button></div></section></div>; }

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{text}</p></div>; }
