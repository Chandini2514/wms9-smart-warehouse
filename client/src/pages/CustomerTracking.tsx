// Decision Rail design reminder: This public route is intentionally calmer than the internal console,
// using the same signal colors and monospaced identifiers without exposing operational cost or supplier data.
import { ArrowLeft, CheckCircle2, Circle, Clock3, MapPin, PackageCheck, Search, Truck } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

const trackingEvents = [
  { status: "Dispatched", source: "Fulfillment release", location: "Bengaluru Fulfillment Center", time: "09:18", complete: true, note: "Express carrier received the sealed shipment." },
  { status: "In Transit", source: "Carrier scan", location: "Bengaluru Distribution Hub", time: "12:40", complete: true, note: "The parcel cleared the city distribution checkpoint." },
  { status: "Out for Delivery", source: "Next carrier event", location: "Whitefield Delivery Station", time: "EST. 16:00", complete: false, note: "A delivery-run scan will confirm the final handoff window." },
  { status: "Delivered", source: "Proof of delivery", location: "Delivery address", time: "PENDING", complete: false, note: "The confirmation event appears after successful handoff." },
];

export default function CustomerTracking() {
  const [trackingNumber, setTrackingNumber] = useState("W9-EXP-884203");
  const [submittedNumber, setSubmittedNumber] = useState("W9-EXP-884203");

  return (
    <main className="customer-tracking">
      <div className="customer-shell">
        <header className="customer-nav">
          <Link href="/" className="back-link"><ArrowLeft size={16} /> Operations console</Link>
          <div className="customer-brand"><img src="/manus-storage/wms9-logo-mark_f965730e.png" alt="WMS-9 mark" /> <span>WMS<span className="amber">-9</span></span></div>
        </header>

        <section className="customer-hero">
          <div>
            <p className="eyebrow amber-text">Decision rail · shipment trace</p>
            <h1>Next confirmed handoff: city delivery run.</h1>
            <p>Read the carrier event trail below or enter a tracking number to inspect another shipment.</p>
          </div>
          <div className="tracking-search">
            <Search size={18} />
            <input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} aria-label="Tracking number" />
            <button onClick={() => setSubmittedNumber(trackingNumber || "W9-EXP-884203")}>Track</button>
          </div>
        </section>

        <section className="customer-card customer-status-card">
          <div className="status-icon"><Truck size={24} /></div>
          <div>
            <p className="eyebrow">Active trace · carrier event stream</p>
            <h2>{submittedNumber}</h2>
            <p className="muted-copy">Current consequence: <strong>delivery run confirmation is expected today, before 20:00.</strong></p>
          </div>
          <div className="delivering-status"><span className="live-dot" /> event state: in transit</div>
        </section>

        <section className="customer-card route-card">
          <div className="route-visual"><div className="route-evidence"><span>ORIGIN · BLR FC-01</span><i /><span>LIVE · HUB SCAN</span><i /><span>NEXT · LAST MILE</span></div></div>
          <div className="tracking-timeline public-timeline">
            {trackingEvents.map((event, index) => (
              <article className="timeline-event" key={event.status}>
                <div className="timeline-rail">{event.complete ? <CheckCircle2 className="success-icon" size={21} /> : <Circle size={21} />} {index < trackingEvents.length - 1 && <span />}</div>
                <div>
                  <div className="event-heading"><div><p className="event-source">{event.source}</p><h3>{event.status}</h3></div><time>{event.time}</time></div>
                  <p><MapPin size={14} /> {event.location} <b>{event.complete ? "VERIFIED" : "AWAITING SCAN"}</b></p>
                  <small>{event.note}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="customer-help">
          <PackageCheck size={22} />
          <div><strong>Exception path: quote this trace ID if the handoff window is missed.</strong><p>Your order-confirmation contact channel can locate the event trail using this tracking number.</p></div>
          <Clock3 size={21} className="muted-icon" />
        </section>
      </div>
    </main>
  );
}
