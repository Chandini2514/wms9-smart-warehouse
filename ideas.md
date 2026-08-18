# WMS-9 Design Directions

## Three visual approaches

| Theme Name | Very Brief Intro | Probability |
| --- | --- | --- |
| **Decision Rail** | A highly structured industrial control-room aesthetic where the live decision stream acts as the product’s spine. It feels precise, alert, and operable under pressure. | 0.06 |
| **Warehouse Field Notes** | A warm operational journal that uses paper-like annotations and human-centered work cues to make warehouse coordination feel approachable. | 0.03 |
| **Signal Grid** | A data-forward, high-contrast logistics cockpit with scan lines and technical calibration cues. It emphasizes speed and automation. | 0.08 |

## Chosen approach: Decision Rail

### Design Movement

**Industrial information design** meets the visual language of an **air-traffic operations console**. The interface should make decisions feel traceable, immediate, and grounded in operational evidence rather than decorative dashboard chrome.

### Core Principles

1. **Action precedes status.** High-priority panels name the recommended next move before they describe the surrounding data.
2. **The ledger is the spine.** A persistent terminal-like Decision Ledger visibly connects order, material, shipping, tracking, and collaboration events.
3. **Risk is unmistakable.** Amber, red, green, and blue have dedicated operational meanings and are never used decoratively.
4. **Dense but breathable.** Information is grouped into distinct field panels with strong typographic hierarchy, generous internal padding, and clear scan paths.

### Color Philosophy

Graphite is the operating floor: calm, non-reflective, and suitable for long shifts. The slightly lifted blue-black panels create depth without turning the application into a generic black dashboard. **Safety amber (#F5A623)** is the ownable signature color and signals a pending decision, while green marks verified resolution, red marks a material or SLA threat, and blue marks work actively moving forward.

### Layout Paradigm

The application follows an **operational rail** rather than a central-card grid. A durable left-side navigation rail defines the workspace; the main area changes by module; a right-side Decision Ledger remains visible on large screens as the shared record of system reasoning. On smaller screens, the ledger moves into an intentional bottom drawer rather than disappearing.

### Signature Elements

1. **Decision Ledger entries:** monospaced timestamp, colored signal dot, plain-language rationale, and source label.
2. **Signal tabs:** compact module headings with a vertical severity indicator, indicating where action is required.
3. **Workflow rails:** stage-based progress tracks and kanban columns that expose the next available action as a labeled control.

### Interaction Philosophy

Every interactive control progresses work, contains an explanation, or opens the evidence needed to decide. Hover states add a thin amber edge or raised surface, while changes create a new ledger event so users can understand both the consequence and rationale.

### Animation

Motion should be functional and restrained. Panels enter with a 180ms opacity-and-translate transition. A fresh ledger item pulses once in its source color, workflow items slide a short distance into their next stage, and buttons compress to 97% on click. All nonessential movement respects reduced-motion settings.

### Typography System

**Barlow Condensed** is used for sectional headers, KPI labels, and action language, set in bold uppercase with open tracking. **Inter** provides readable body copy and compact UI language, as required by the product brief. **IBM Plex Mono** is reserved for SKUs, order IDs, tracking numbers, timestamps, and ledger events. Headers should create a clear, operational hierarchy without oversized marketing-style text.

### Brand Essence

**WMS-9 is the decision layer for warehouse teams that need to resolve risk before it becomes delay.**

Personality: **decisive, traceable, floor-ready**.

### Brand Voice

The voice is concise, evidence-led, and action-oriented. Headlines use a verb or an operational conclusion; CTAs state the consequence of acting.

> “Reallocate 24 units before the 14:30 dispatch cutoff.”

> “Assign Express: VIP order has 1h 32m of SLA remaining.”

### Wordmark & Logo

The mark is a bold amber **nine-cell inventory lattice** with one cell offset forward like a moving parcel and a single black cut-through rail. It reads as warehouse bays, a decision matrix, and the number 9 without relying on typography. The wordmark uses a compact, custom-spaced Barlow Condensed treatment beside the mark.

### Signature Brand Color

**Safety amber — #F5A623.**

## Style Decisions

- The public tracking route uses the same Decision Rail language as the internal console: each checkpoint is a traceable event with a source, timestamp, location, and clear state meaning.
- Headlines state an operational conclusion or the next consequence, rather than generic reassurance.
- Warehouse and route imagery act as evidence surfaces, with route annotations and signal overlays that support the operational reading of the interface.
