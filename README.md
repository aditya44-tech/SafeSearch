# SafeSignal

AI-powered workplace safety early-warning system. Every safety report is classified in seconds, the right departments are alerted via SMS, and corrective actions are tracked through to resolution — all in one place.

## Features

- **AI Risk Classification** — Reports are analyzed in under 2 seconds using Groq LLM, assigning risk levels (high / medium / low), hazard categories, justifications, and key phrases automatically.
- **Instant SMS Alerts** — High-risk reports trigger SMS notifications to category-mapped departments via Textbee. No manual routing required.
- **Heinrich's Law Scoring** — Site scores follow the industry-standard escalation model. Critical patterns surface before incidents occur.
- **Offline Reporting** — IndexedDB stores reports locally when there is no connectivity and auto-syncs once the network returns.
- **Task Management** — Corrective tasks are auto-generated from high-risk reports and tracked through open → in-progress → resolved states.
- **Dashboard & Analytics** — Real-time dashboards with anomaly detection, site scorecards, trend analysis, and Recharts-powered visualizations.
- **Regulatory & Safety Standards Mapping** — Curated knowledge base for upstream oil & gas. Activity-aware mapping to applicable standards (Oil Mines Regulations, OISD standards, Mines Act, etc.).
- **Audit Logging** — Every action on a report is recorded with timestamps and user attribution.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Neon serverless) |
| ORM | Prisma 7 with Neon driver adapter |
| AI | Groq LLM (OpenAI-compatible API) |
| SMS | Textbee SDK |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| PWA | Serwist (service worker) |

## Getting Started

### Prerequisites

- Node.js 18+
- A Neon PostgreSQL database (or any PostgreSQL instance)
- Groq API key
- Textbee API key (for SMS alerts)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd sif-watch

# Install dependencies
npm install

# Copy environment file (contains DATABASE_URL, GEMINI_API_KEY, etc.)
cp ../.env .env

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed sample data
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Generate Prisma client and build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
sif-watch/
├── prisma/
│   ├── schema.prisma        # Database schema (SafetyReport, Task, SiteScore, etc.)
│   ├── seed.ts              # Sample data seeder
│   └── seed-data.json       # Seed data
├── src/
│   ├── app/
│   │   ├── page.tsx         # Landing page
│   │   ├── reports/         # Report list & detail views
│   │   ├── dashboard/       # Analytics dashboard
│   │   ├── admin/           # Admin panel (task management)
│   │   ├── alerts/          # SMS alert configuration
│   │   ├── map/             # Site map view
│   │   ├── scoreboard/      # Site scoring
│   │   ├── query/           # Natural language query
│   │   ├── landing/         # Marketing landing page
│   │   └── api/             # API routes (report creation, analysis, SMS)
│   ├── components/          # Shared UI components (Navbar, RiskBadge, StatusBadge)
│   ├── lib/
│   │   ├── helpers.ts       # Department mapping, SLA calculation, scoring logic
│   │   ├── prisma.ts        # Prisma client singleton
│   │   ├── offline-queue.ts # IndexedDB offline report queue
│   │   └── org-context.tsx  # Organization context provider
│   └── generated/prisma/    # Auto-generated Prisma client
├── public/                  # Static assets
└── package.json
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon pooler) |
| `GEMINI_API_KEY` | API key for AI risk classification |

## Database Schema

Key models:

- **SafetyReport** — Core entity with report text, site, risk level, hazard category, status, SLA deadline, and audit trail.
- **Task** — Corrective actions auto-generated from high-risk reports, assigned to departments.
- **SiteScore** — Heinrich's Law scoring per site based on report frequency and severity.
- **Organization** — Multi-tenant support with per-org SMS recipients and site scores.
- **SmsRecipient** — Category-mapped phone numbers for automated SMS alerts.
- **ComplianceReference** — Curated regulatory knowledge base with activity-aware hazard mapping for upstream oil & gas operations.
- **AuditLog** — Full action history on every report.

## License

Private — SIH Demo
