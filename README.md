# OptiRev - Enterprise Customer Relationship Management

An AI-powered CRM system with intelligent lead scoring, pipeline management, and modern UI inspired by Salesforce and Frappe CRM.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js REST API |
| Database | Supabase (PostgreSQL) with Row Level Security |
| ML Service | Python FastAPI, scikit-learn |
| Drag & Drop | @hello-pangea/dnd |

## Project Structure

```
optirev/
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/ # React components
│   │   ├── lib/       # Utilities and API client
│   │   └── types/     # TypeScript definitions
│
├── backend/           # Express.js API
│   ├── src/
│   │   ├── controllers/ # Route handlers
│   │   ├── routes/      # API routes
│   │   ├── middleware/   # Express middleware
│   │   └── config/      # Configuration
│
└── ml-service/        # Python FastAPI ML service
    └── app/
        ├── main.py    # FastAPI application
        └── models/    # ML model files
```

## Quick Start

### 1. Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### 3. ML Service Setup

```bash
cd ml-service
pip install -r requirements.txt

# Train the model (optional)
python -m app.models.train_model

# Start the service
uvicorn app.main:app --reload --port 8000
```

## Features

### Frontend
- **Dashboard**: Overview with stats, recent activity, and pipeline visualization
- **Deals Kanban**: Drag-and-drop board with lead cards showing score badges
- **Leads Management**: Table view with search, filter, and quick actions
- **AI Lead Scoring**: Visualize ML predictions and trigger batch scoring
- **Contacts**: Contact directory with tags and last contact info
- **Settings**: Theme, notifications, and AI configuration

### Backend API
- `GET /api/leads` - List leads with pagination and filters
- `POST /api/leads` - Create new lead
- `PATCH /api/leads/:id/status` - Update lead status (Kanban)
- `POST /api/leads/score` - Get AI score prediction
- `GET /api/deals` - List deals pipeline
- `GET /api/dashboard/stats` - Dashboard statistics

### ML Service
- `POST /predict-score` - Score a single lead (0-100)
- `POST /predict-score/batch` - Batch score multiple leads
- `GET /health` - Health check

## Database Schema (Supabase)

```sql
-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'new',
  lead_score INTEGER DEFAULT 0,
  score_category TEXT DEFAULT 'low',
  owner_id TEXT,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leads" ON leads
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own leads" ON leads
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own leads" ON leads
  FOR UPDATE USING (auth.uid() = owner_id);
```

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Backend (.env)
```env
PORT=5000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ML_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:3000
```

## License

MIT
