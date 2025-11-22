# FreelanceFlow: Technical Specifications

Hey! Awesome choices—multi-user support will make this scalable for small teams right out the gate, and wiring in the real Grok API (via xAI's SDK) for AI features is a perfect fit. It's got that native "Grok vibe" while being super powerful for things like smart responses and analysis.

I've pulled together a complete technical spec as a Markdown artifact below. It's structured for easy copy-paste into Notion, GitHub, or your docs. Includes:
- **High-level overview** & assumptions
- **Architecture diagram** (simple text-based)
- **Data models** (Prisma schema)
- **API endpoints** & WebSocket events
- **Frontend components** & pages
- **AI integration** (Grok API specifics)
- **Auth & multi-user roles**
- **DevOps** (Docker setup)

If anything needs tweaks (e.g., add a specific integration), just holler. We can spin up a repo next if you're game!

---

## 📋 Project Overview

### Purpose
FreelanceFlow is a modern, AI-powered dashboard for freelancers and small agencies. It combines CRM, project management, revenue analytics, task tracking, and workflow automation into one seamless app. Key differentiator: Deep integration with xAI's Grok API for real-time AI assistance (e.g., generating responses, optimizing schedules, running revenue forecasts).

### Target Users
- Solo freelancers
- Small teams (2–5 members) with roles: Admin (full access), Member (project/task access), Viewer (read-only analytics/clients)

### Tech Stack
- **Frontend**: React 18, TypeScript, Redux Toolkit, Tailwind CSS, @dnd-kit (Kanban), Framer Motion (animations), Socket.io-client (real-time), Recharts (charts), React Router, Vite, React Hot Toast, date-fns, Lucide React
- **Backend**: Node.js 18, Express, TypeScript, Prisma ORM, PostgreSQL 15, Redis 7 (caching/sessions), Socket.io (real-time), JWT, bcrypt, Multer (uploads), Helmet (security), CORS, Winston (logging), dotenv
- **AI**: xAI Grok API (via `@xai/grok-sdk` npm package) – Models: `grok-beta` for chat/analysis
- **DevOps**: Docker, Docker Compose, Nginx (static serve), Multi-stage Docker builds, Volumes for persistence
- **Additional Tools** (added for fit):
  - Nodemailer (email notifications)
  - BullMQ (Redis-based job queues for AI tasks to avoid timeouts)
  - Stripe SDK (invoices/payments – stubbed for now, easy swap)

### Assumptions
- Multi-user: Basic role-based access (RBAC) via JWT claims. No complex permissions yet (e.g., per-project sharing).
- AI: Real Grok integration for core features (chat, analysis, automation). Uses function calling for tools like "generate invoice" or "summarize thread".
- Data: All Dockerized; local dev uses volumes for DB/Redis.
- Security: HTTPS enforced; rate-limiting on AI calls via Redis.
- Deployment: Local Docker for now; cloud-agnostic (e.g., easy AWS/EC2 later).

### Architecture (Text Diagram)
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend        │    │   Infrastructure│
│ (React/Vite)    │◄──►│ (Express/Prisma) │◄──►│ (Docker Compose)│
│ - Pages: Dash,  │    │ - API: REST/WS   │    │ - Postgres DB   │
│   Clients, etc. │    │ - AI: Grok Calls │    │ - Redis Cache   │
│ - Real-time UI  │    │ - Auth: JWT      │    │ - Nginx Proxy   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                       ┌──────────────┐
                       │ xAI Grok API │
                       │ (Chat/Analysis│
                       └──────────────┘
```

---

## 🗄️ Data Models (Prisma Schema)

Place this in `prisma/schema.prisma`. Run `npx prisma migrate dev` after setup.

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String   // Hashed with bcrypt
  role      Role     @default(MEMBER)
  avatarUrl String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  ownedTeam Team?     @relation("TeamOwner", fields: [teamId], references: [id])
  teamId    String?
  team      Team?     @relation("TeamMembers", fields: [teamId], references: [id])
  clients   Client[]
  projects  Project[]
  tasks     Task[]

  @@map("users")
}

model Team {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())

  owner   User     @relation("TeamOwner", fields: [ownerId], references: [id])
  ownerId String   @unique
  members User[]   @relation("TeamMembers")

  clients   Client[]
  projects  Project[]
  tasks     Task[]

  @@map("teams")
}

enum Role {
  ADMIN
  MEMBER
  VIEWER
}

model Client {
  id          String   @id @default(cuid())
  name        String
  email       String
  phone       String?
  avatarUrl   String?
  tags        String[] // e.g., ["VIP", "Recurring"]
  totalRevenue Float   @default(0)
  lastContact DateTime?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  userId   String
  user     User     @relation(fields: [userId], references: [id])
  teamId?  String?
  team     Team?    @relation(fields: [teamId], references: [id])
  projects Project[]

  @@map("clients")
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  type        String?  // e.g., "Web Dev", "Consulting"
  budget      Float?
  status      ProjectStatus @default(DRAFT)
  dueDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  clientId String
  client   Client   @relation(fields: [clientId], references: [id])
  userId   String
  user     User     @relation(fields: [userId], references: [id])
  teamId?  String?
  team     Team?    @relation(fields: [teamId], references: [id])
  tasks    Task[]
  invoices Invoice[]

  @@map("projects")
}

enum ProjectStatus {
  DRAFT
  IN_PROGRESS
  ON_REVIEW
  COMPLETED
  CANCELED
}

model Task {
  id          String   @id @default(cuid())
  name        String
  description String?
  dueDate     DateTime?
  progress    Int      @default(0) // 0-100
  priority    Int      @default(1) // 1-5
  category    String?  // e.g., "Follow-up", "Invoice"
  status      TaskStatus @default(PENDING)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  projectId? String?
  project    Project? @relation(fields: [projectId], references: [id])
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  teamId?    String?
  team       Team?    @relation(fields: [teamId], references: [id])

  @@map("tasks")
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
}

model Invoice {
  id          String   @id @default(cuid())
  amount      Float
  status      InvoiceStatus @default(DRAFT)
  dueDate     DateTime?
  paidDate    DateTime?
  fileUrl     String?  // Multer upload
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  projectId String
  project   Project @relation(fields: [projectId], references: [id])

  @@map("invoices")
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
}

// Revenue tracking (for analytics)
model Revenue {
  id        String   @id @default(cuid())
  amount    Float
  date      DateTime
  source    String   // e.g., "Project X"
  projected Boolean  @default(false) // For AI forecasts
  createdAt DateTime @default(now())

  @@map("revenues")
}

// Messages for Inbox
model Message {
  id          String   @id @default(cuid())
  content     String
  isFromAI    Boolean  @default(false)
  read        Boolean  @default(false)
  createdAt   DateTime @default(now())

  clientId? String?
  client    Client?  @relation(fields: [clientId], references: [id])
  projectId? String?
  project   Project? @relation(fields: [projectId], references: [id])

  @@map("messages")
}
```

---

## 🔌 Backend: API Endpoints & WebSockets

### REST API (Express routes)
Base: `/api/v1`

| Method | Endpoint | Description | Auth | Body/Params |
|--------|----------|-------------|------|-------------|
| POST | `/auth/register` | Create user/team | None | `{ email, password, name, teamName? }` |
| POST | `/auth/login` | JWT login | None | `{ email, password }` → `{ token, user, team? }` |
| GET | `/users/me` | Get current user | JWT | - |
| PUT | `/users/me` | Update profile | JWT | `{ name, avatarUrl }` |
| GET | `/clients` | List clients (filter by team) | JWT | `?search=foo&limit=20` |
| POST | `/clients` | Create client | JWT (Admin/Member) | `{ name, email, ... }` |
| GET | `/clients/:id` | Get client details | JWT | - |
| PUT | `/clients/:id` | Update client | JWT (Admin/Member) | `{ ... }` |
| DELETE | `/clients/:id` | Delete client | JWT (Admin) | - |
| GET | `/projects` | List projects (filters: status, clientId) | JWT | `?status=IN_PROGRESS&sort=dueDate` |
| POST | `/projects` | Create project | JWT (Admin/Member) | `{ name, clientId, ... }` |
| GET | `/projects/:id` | Get project | JWT | - |
| PUT | `/projects/:id` | Update (incl. status) | JWT (Admin/Member) | `{ ... }` |
| POST | `/projects/:id/tasks` | Add task to project | JWT | `{ name, dueDate, ... }` |
| GET | `/tasks` | List tasks (priority filter) | JWT | `?priority=1&due=overdue` |
| PUT | `/tasks/:id` | Update task progress/status | JWT | `{ progress, status }` |
| GET | `/analytics/revenue` | Monthly trends + projections | JWT | `?period=month` |
| POST | `/analytics/run-analysis` | Trigger Grok-powered forecast | JWT | `{ period: 'month' }` → Queued job |
| POST | `/inbox/messages` | Send/reply message | JWT | `{ content, clientId? }` |
| GET | `/inbox` | List messages/notifications | JWT | `?unread=true` |
| POST | `/files/upload` | Upload file (Multer) | JWT | Multipart form |

- **Error Handling**: Standard JSON `{ error: msg, code: 400 }`. Winston logs all.
- **Middleware**: Auth guard checks JWT + role; CORS/Helmet enabled.

### WebSockets (Socket.io Events)
- Namespace: `/ws`
- Auth: On connect, emit `auth` with JWT → Verify & join room (user/team ID).
- Events:
  - `join-team`: Join team room for real-time updates.
  - `task-updated`: Broadcast task changes to team.
  - `message-sent`: Real-time chat in Inbox/projects.
  - `ai-response`: Stream Grok responses to client.
  - `notification`: Push alerts (e.g., invoice paid).

---

## 🎨 Frontend: Pages & Components

### Routing (React Router)
- `/` → Overview (Dashboard)
- `/clients` → Clients (list/detail)
- `/projects` → Projects (list/kanban/detail)
- `/inbox` → Inbox (messages/notifications)
- `/analytics` → Analytics (deep dives)
- `/profile` → User settings

### Key Components
- **Layout**: Top nav bar (logo, nav links, user menu with avatar/notifications/+ quick add). Two-column responsive (Tailwind).
- **KPI Cards**: Recharts mini-charts; Framer Motion fade-in.
- **Kanban Board** (@dnd-kit): For Projects page – columns by status (Draft → Completed).
- **AI Assistant**: Bottom-right floating card. Tabs (LoopAI, GPT Chat, DeepSeek – but wired to Grok). Input box → Socket.io to backend → Grok API stream.
- **Charts**: Recharts for revenue (line + projected dots), analytics (bar/pie for breakdowns).
- **Tables**: Custom with sorting/search (e.g., Clients table with avatars).
- **Toasts**: React Hot Toast for actions (e.g., "Task updated!").
- **State**: Redux Toolkit slices for auth, clients, projects, tasks, aiChat.

### Page Breakdown
1. **Overview (Dashboard)**:
   - Top: 4 KPI cards (Clients: 14 +4, Revenue: $3,552 -8%, Projects: 22 +6, Tasks: count).
   - Middle-left: Revenue chart (actual vs Grok-projected) + "Run Analysis" btn (POST to /analytics).
   - Middle-right: Projects table (Client avatar, Name, Type, Due, Price, Status, More menu).
   - Right sidebar: Priority Tasks list (Follow-ups, Contract Review, etc. – clickable to /tasks).
   - Bottom-right: AI card ("How can I help?") with tabs/functions (Text Assist, Automation, etc.).

2. **Clients**:
   - List: Table/grid (Name, Photo, Contact, Tags, Projects, Revenue, Last Contact).
   - Detail: Tabs (Info, Notes, Timeline, Files, Invoices, Projects). AI summary btn.

3. **Projects**:
   - List: Search/filter/sort table + Kanban toggle.
   - Detail: Description, Checklist (tasks w/ progress), Uploads, Chat (Socket.io), Timeline (Gantt-like), Invoice section.

4. **Inbox**:
   - Tabs: Messages, Notifications.
   - Messages: Thread view per client/project; AI "Smart Response" btn (Grok generate).
   - Notifications: List w/ actions (e.g., mark read).

5. **Analytics**:
   - Sections: Revenue (trends/forecasts), Activity (cycle times, retention), AI Insights (Grok recs like "Follow up with Client X").

- **Design**: Soft pastels (Tailwind: bg-gradient-to-r from-purple-50 to-blue-50), rounded-md shadows, Inter font (via Tailwind), Lucide icons.

---

## 🤖 AI Integration (Grok API)

### Setup
- Install: `npm i @xai/grok-sdk`
- Env: `GROK_API_KEY=your_key_from_x.ai/api` (get at https://x.ai/api)
- Rate Limits: Use BullMQ to queue heavy tasks (e.g., analysis) – Redis-backed.

### Core Features
- **Chat (AI Assistant/Inbox)**: POST to Grok chat.completions.create:
  ```typescript
  import { Client } from '@xai/grok-sdk';
  const client = new Client({ apiKey: process.env.GROK_API_KEY });

  const response = await client.chat.completions.create({
    model: 'grok-beta',
    messages: [
      { role: 'system', content: 'You are a helpful freelance assistant. Use concise, actionable responses.' },
      { role: 'user', content: userInput } // e.g., "Draft a follow-up email for Client Y"
    ],
    temperature: 0.7,
    stream: true // For real-time UI via Socket.io
  });
  ```
  - Functions: Text Assistance (summarize/generate), Smart Response (reply drafts), Process Automation (e.g., "Generate invoice" via function calling).

- **Run Analysis (Revenue Projections)**:
  - System prompt: "Analyze historical revenue data: [JSON array]. Project next month with trends. Output: { projected: 4500, insights: ['Tip: Upsell to top clients'] }"
  - Function calling: Define tools like `getHistoricalData()` for DB fetch.

- **Schedule Optimization**: Grok prompt on tasks/clients: "Optimize due dates based on priorities: [data]. Suggest adjustments."
- **Other**: Contract review (summarize PDFs via vision if uploaded), Follow-up reminders (cron + Grok sentiment analysis).

- **Error Handling**: Fallback to cached responses if API down; log via Winston.
- **Costs**: Monitor via xAI dashboard; start with low-temp for consistency.

### Function Calling Example (for Automation)
```json
{
  "tools": [{
    "type": "function",
    "function": {
      "name": "generate_invoice",
      "description": "Create invoice text for a project",
      "parameters": {
        "type": "object",
        "properties": { "projectId": { "type": "string" }, "amount": { "type": "number" } }
      }
    }
  }]
}
```
- Backend executes: Fetch project → Generate PDF text → Return to Grok for refinement.

---

## 🔐 Authentication & Multi-User

- **Flow**: Register/login → JWT with claims `{ sub: userId, role, teamId? }`. Refresh tokens in Redis (exp 7d).
- **RBAC Guard** (middleware):
  ```typescript
  if (req.user.role !== 'ADMIN' && endpoint === '/clients') return 403;
  if (req.user.teamId && !resource.teamId === req.user.teamId) return 403;
  ```
- **Sessions**: Redis for active connections (Socket.io).
- **Onboarding**: New user auto-creates team; invite members via email (Nodemailer).

---

## 🐳 DevOps & Docker

### docker-compose.yml
```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: freelanceflow
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    restart: always
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@db:5432/freelanceflow
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      GROK_API_KEY: ${GROK_API_KEY}
    depends_on:
      - db
      - redis
    volumes:
      - ./backend:/app
    ports:
      - "3001:3001"

  frontend:
    build: ./frontend
    restart: always
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
    ports:
      - "3000:3000"

  nginx:
    image: nginx:alpine
    restart: always
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/dist:/usr/share/nginx/html  # Built static files
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
```

### Backend Dockerfile (Multi-Stage)
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build  # tsc

# Prod stage
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --only=production
EXPOSE 3001
CMD ["npm", "start"]
```

### Frontend Dockerfile
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Setup Commands
1. `cp .env.example .env` (add keys: DB_PASSWORD, JWT_SECRET, GROK_API_KEY)
2. `docker-compose up -d`
3. Backend: `npx prisma migrate deploy && npx prisma generate`
4. Seed data: Custom script for demo clients/projects/revenue.
5. Access: http://localhost (Nginx proxies /api to backend).

### Volumes
- DB: Persistent data.
- Uploads: `./uploads` volume for Multer files.

---

Whew, that's the full blueprint! This gets you to a MVP in ~2-4 weeks solo. What's next—want me to generate starter code for a specific part (e.g., AI service or Redux slice), or hunt down any Grok API edge cases? 🚀
