# AI Career Copilot — Backend Server

A Node.js + Express REST API powering an AI-driven career coaching platform. Features resume analysis, personalized roadmap generation, and an MCP-powered AI mentor chat.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Authentication | JWT + bcryptjs |
| File Uploads | Multer |
| Resume Parsing | pdf-parse + mammoth |
| AI | Google Gemini API |
| AI Architecture | MCP (Model Context Protocol) |

---

## Features

- JWT-based authentication (signup, login, protected routes)
- User profile management (skills, goals, education, salary)
- Resume upload (PDF + DOCX), text extraction, AI analysis
- AI-generated weekly learning roadmap with goal tracking
- MCP-powered AI career mentor chat (context-aware, tool-calling)
- Super admin panel (user management, stats, role control)

---

## Project Structure

```
career-copilot-server/
├── src/
│   ├── index.js              # Express app entry point
│   ├── lib/
│   │   ├── prisma.js         # Prisma client singleton
│   │   └── ai.js             # Gemini AI functions (resume, roadmap, chat)
│   ├── middleware/
│   │   ├── auth.js           # JWT requireAuth middleware
│   │   └── admin.js          # requireAdmin middleware
│   └── routes/
│       ├── auth.js           # Signup, login, me
│       ├── profile.js        # Profile CRUD
│       ├── resume.js         # Upload + AI analysis
│       ├── roadmap.js        # Generate + goal toggle
│       ├── chat.js           # MCP-powered AI chat
│       └── admin.js          # Admin panel routes
├── mcp/
│   ├── executor.js           # Tool registry + executor
│   └── tools/
│       ├── getUserProfile.js
│       ├── getResumeAnalysis.js
│       ├── getRoadmapProgress.js
│       └── getChatHistorySummary.js
├── prisma/
│   └── schema.prisma         # Database schema (7 tables)
├── uploads/                  # Uploaded resume files
├── .env                      # Environment variables
└── package.json
```

---

## Database Schema

```
users           — id, name, email, password_hash, role, created_at
profiles        — id, user_id, education, skills[], interests[], career_goal, salary_goal, daily_study_hours
resumes         — id, user_id, file_url, raw_text, analysis_json, created_at
roadmaps        — id, user_id, title, goal, duration, generated_at
roadmap_weeks   — id, roadmap_id, week_number, theme, resources[]
roadmap_goals   — id, week_id, title, completed, completed_at
chat_messages   — id, user_id, role, content, created_at
```

---

## API Endpoints

### Auth — `/api/auth`
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | — | Register, returns JWT + user |
| POST | `/auth/login` | — | Login, returns JWT + user |
| GET | `/auth/me` | ✅ | Get current user |

### Profile — `/api/profile`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/profile` | ✅ | Get user profile |
| PUT | `/profile` | ✅ | Create or update profile |

### Resume — `/api/resume`
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/resume/upload` | ✅ | Upload PDF/DOCX, extract text, AI analysis |
| GET | `/resume/analysis` | ✅ | Get latest resume analysis |

### Roadmap — `/api/roadmap`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/roadmap` | ✅ | Get current roadmap with weeks + goals |
| POST | `/roadmap/generate` | ✅ | Generate AI roadmap from profile + resume |
| PATCH | `/roadmap/goals/:id` | ✅ | Toggle goal completed |

### Chat — `/api/chat`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/chat/history` | ✅ | Get all messages |
| POST | `/chat/message` | ✅ | Send message, get MCP-powered AI reply |
| DELETE | `/chat/history` | ✅ | Clear chat history |

### Admin — `/api/admin` (admin role required)
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/admin/stats` | ✅ Admin | Platform totals |
| GET | `/admin/users` | ✅ Admin | All users with usage counts |
| GET | `/admin/users/:id` | ✅ Admin | Full user detail |
| DELETE | `/admin/users/:id` | ✅ Admin | Delete user |
| PATCH | `/admin/users/:id/role` | ✅ Admin | Promote or demote role |

---

## MCP Architecture

The AI chat uses **Model Context Protocol** — Gemini decides which tools to call based on the user's message, fetches real user data, then generates a personalized response.

```
User message
     ↓
Gemini decides required tools
     ↓
MCP executor runs tools
     ↓
getUserProfile()        → skills, career goal
getResumeAnalysis()     → strengths, skill gaps
getRoadmapProgress()    → completed %, pending goals
getChatHistorySummary() → recent topics, questions
     ↓
Gemini generates personalized response
```

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/career-copilot-server.git
cd career-copilot-server
npm install
```

### 2. Set up environment variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
JWT_SECRET="your_long_random_secret"
GEMINI_API_KEY="your_gemini_api_key"
PORT=3000
```

- **DATABASE_URL** — Get from [neon.tech](https://neon.tech) (free PostgreSQL)
- **JWT_SECRET** — Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- **GEMINI_API_KEY** — Get from [aistudio.google.com](https://aistudio.google.com)

### 3. Run database migrations

```bash
npm run db:migrate
npm run db:generate
```

### 4. Start the server

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server runs at `http://localhost:3000`

---

## Make Yourself Admin

After signing up, run this SQL in your Neon dashboard:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `GEMINI_API_KEY` | Google Gemini API key |
| `PORT` | Server port (default 3000) |

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start with auto-reload |
| `npm start` | Start production server |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client |

---

## License

MIT
