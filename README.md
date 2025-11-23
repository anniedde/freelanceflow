# FreelanceFlow

AI-powered dashboard for freelancers and small agencies. Combines CRM, project management, revenue analytics, task tracking, and workflow automation with deep xAI Grok API integration.

## 🎯 Key Highlights

- ✅ **Production-Ready**: Fully Dockerized with multi-stage builds for frontend and backend
- ✅ **AI-Powered**: Deep integration with xAI's Grok API for smart responses, forecasting, and automation
- ✅ **Complete Feature Set**: CRM, project management, revenue analytics, real-time chat, invoicing
- ✅ **Modern Tech Stack**: React 18 + TypeScript, Node.js + Express, PostgreSQL, Redis, Socket.io
- ✅ **Multi-User Support**: Role-based access (Admin, Member, Viewer) for teams
- ✅ **Secure**: JWT authentication, bcrypt hashing, Helmet security headers, CORS configuration
- ✅ **One-Command Deploy**: `docker-compose up -d --build` starts everything

## ✨ Features

### Core Functionality
- 🔐 **Authentication** - Secure JWT-based authentication with role-based access control
- 👥 **Client Management (CRM)** - Track clients with contact info, tags, notes, and revenue history
- 📋 **Project Management** - Kanban board with drag-and-drop, status tracking, and task management
- 💰 **Revenue Analytics** - Track revenue trends, forecasts, and financial metrics
- 📊 **Analytics Dashboard** - Comprehensive metrics with interactive charts
- 📥 **Inbox** - Messages and notifications with real-time updates

### AI Features (Powered by Grok)
- 🤖 **AI Assistant** - Chat interface for smart responses and recommendations
- 📈 **Revenue Forecasting** - AI-powered revenue projections based on historical data
- ✉️ **Smart Email Responses** - Generate professional email drafts automatically
- 📅 **Schedule Optimization** - AI suggestions for task prioritization and due dates
- 📄 **Contract Review** - Summarize and analyze documents
- 💡 **AI Insights** - Actionable recommendations (e.g., "Follow up with Client X")

### Advanced Features
- 🎯 **Task Management** - Priority levels, categories, progress tracking, due dates
- 💼 **Invoice Management** - Create, track, and manage invoices with file uploads
- ⏱️ **Time Tracking** - Built-in timer to track time spent on tasks (coming soon)
- 💬 **Real-time Messaging** - Team communication with Socket.io
- 📎 **File Attachments** - Upload and manage project files
- 🔔 **Real-time Notifications** - Live updates across all features

### User Experience
- ✨ **Smooth Animations** - Framer Motion for polished transitions
- 🎨 **Modern UI Design** - Soft pastels with gradient backgrounds and clean layouts
- 📱 **Responsive Layout** - Works on desktop, tablet, and mobile
- 🚀 **Fast & Optimized** - Built with performance in mind

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Redux Toolkit** for state management
- **Tailwind CSS** for utility-first styling
- **@dnd-kit** for drag-and-drop Kanban functionality
- **Framer Motion** for smooth animations
- **Socket.io-client** for real-time updates
- **Recharts** for data visualization
- **React Router** for navigation
- **Vite** for fast development and builds
- **React Hot Toast** for notifications
- **Lucide React** for icons

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM** with **PostgreSQL 15** database
- **Redis 7** for caching and session management
- **Socket.io** for WebSocket connections
- **JWT** for authentication
- **Multer** for file uploads
- **Bcrypt** for password hashing
- **Helmet** for security headers
- **CORS** configuration for cross-origin requests
- **Winston** for logging
- **BullMQ** for Redis-based job queues (AI tasks)

### AI Integration
- **xAI Grok API** via `@xai/grok-sdk`
- **Model**: `grok-beta` for chat and analysis
- **Function Calling** for tools like invoice generation
- **Streaming Responses** for real-time UI updates

### DevOps & Deployment
- **Docker** & **Docker Compose** for containerization
- **Nginx** for serving frontend in production
- **Multi-stage builds** for optimized image sizes
- **Health checks** for service reliability
- **Volume mounts** for data persistence

## 🚀 Getting Started

### Quick Start with Docker (Recommended)

**Prerequisites:**
- Docker Desktop installed and running ([Download here](https://www.docker.com/products/docker-desktop))
- xAI API key (optional for initial testing - get at https://x.ai/api)

**Steps:**

1. **Clone the repository**
   ```bash
   git clone https://github.com/anniedde/freelanceflow.git
   cd freelanceflow
   ```

2. **(Optional) Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your xAI Grok API key:
   ```env
   GROK_API_KEY=your_key_from_x.ai/api
   ```

   **Note:** You can skip this step for initial testing. The app will work without AI features.

3. **Start the application**
   ```bash
   docker-compose up -d --build
   ```

   **Important:** Always use the `--build` flag to ensure all code changes are included.

   This command will:
   - ✅ Build the frontend and backend Docker images
   - ✅ Start PostgreSQL database and Redis cache
   - ✅ Run database migrations
   - ✅ Seed the database with demo data (users, clients, projects, tasks)
   - ✅ Start all services

   **First startup takes 1-2 minutes.** Subsequent startups are faster.

4. **Access the application**

   Open http://localhost in your browser

5. **Login with demo account**
   - Email: `admin@freelanceflow.com`
   - Password: `FreelanceFlow2024`

6. **Stop the application**
   ```bash
   docker-compose down
   ```

7. **Reset everything** (removes all data and volumes)
   ```bash
   docker-compose down -v
   docker-compose up -d --build
   ```

### Troubleshooting

**Services not starting:**
```bash
docker-compose logs -f backend    # Backend logs
docker-compose logs -f frontend   # Frontend logs
```

**Check if services are running:**
```bash
docker-compose ps
```

**Port conflicts:**
If ports are already in use, check what's using them:
```bash
lsof -i :80      # Nginx
lsof -i :3000    # Frontend dev
lsof -i :3001    # Backend
lsof -i :5432    # PostgreSQL
lsof -i :6379    # Redis
```

**Database errors:**
```bash
# Reset database and reseed
docker-compose down -v
docker-compose up -d --build
```

**AI features not working:**
Make sure you've added your `GROK_API_KEY` to the `.env` file and restart:
```bash
docker-compose down
docker-compose up -d --build
```

### Ports Used

- **Nginx (Production)**: `80` (serves frontend + proxies backend)
- **Frontend (Dev)**: `3000`
- **Backend API**: `3001`
- **PostgreSQL**: `5432`
- **Redis**: `6379`

---

## 👥 Demo Data & Test Accounts

The application comes pre-populated with realistic demo data to help you explore all features immediately.

### 🔑 Test Accounts

All test accounts use the password: **`FreelanceFlow2024`**

| User | Email | Role | Description |
|------|-------|------|-------------|
| **Admin User** | `admin@freelanceflow.com` | Admin | ⭐ **Start here!** Full access to all features |
| Sarah Miller | `sarah@freelanceflow.com` | Member | Team member with project access |
| John Smith | `john@freelanceflow.com` | Viewer | Read-only access to analytics |

### 📊 What's Included in Demo Data

- ✅ **3 users** with different roles and permissions
- ✅ **10+ clients** with contact info, tags, and revenue data
- ✅ **15+ projects** across different statuses (Draft, In Progress, Completed)
- ✅ **30+ tasks** with various priorities and due dates
- ✅ **Revenue data** for analytics and AI forecasting
- ✅ **Messages** demonstrating the inbox feature
- ✅ **Sample invoices** in different states

### 🎯 Exploring the Demo

**Recommended exploration path:**

1. **Login** as `admin@freelanceflow.com` - Landing page shows the Dashboard
2. **View Dashboard** - See KPI cards (clients, revenue, projects, tasks) with charts
3. **Navigate to Clients** - Browse client list with contact info and revenue
4. **View Projects** - See Kanban board with drag-and-drop functionality
5. **Try AI Assistant** - Use the AI card (bottom-right) to ask questions or get recommendations
6. **Check Inbox** - View messages and notifications
7. **Explore Analytics** - Deep dive into revenue trends and forecasts
8. **Try AI Features** - Generate email responses, run revenue analysis, get insights

---

## 📁 Project Structure

```
freelanceflow/
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages (Dashboard, Clients, Projects, etc.)
│   │   ├── store/         # Redux slices (auth, clients, projects, tasks, aiChat)
│   │   ├── services/      # API clients
│   │   └── utils/         # Helpers
│   ├── Dockerfile         # Multi-stage build for production
│   └── nginx.conf         # Nginx configuration
├── backend/               # Express API server
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic & AI integration
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── models/       # Prisma client
│   │   ├── socket/       # Socket.io event handlers
│   │   └── utils/        # Helpers (logger, etc.)
│   ├── prisma/           # Database schema & migrations
│   │   ├── schema.prisma # Prisma data models
│   │   ├── migrations/   # Database migrations
│   │   └── seed.ts       # Demo data seeding script
│   ├── uploads/          # File upload directory (mounted volume)
│   └── Dockerfile        # Multi-stage build for production
├── docker-compose.yml    # Container orchestration
├── nginx.conf           # Nginx reverse proxy configuration
├── .env.example         # Environment variables template
├── TECHNICAL_SPEC.md    # Detailed technical documentation
└── README.md            # This file
```

---

## 🔒 Security Features

FreelanceFlow implements multiple security best practices:

- **Authentication & Authorization**
  - JWT-based authentication with access and refresh tokens
  - Secure password hashing with bcrypt
  - Protected routes requiring valid JWT
  - Role-based access control (Admin, Member, Viewer)
  - Token refresh mechanism for session persistence

- **Security Headers**
  - Helmet middleware for security headers
  - Content Security Policy (CSP)
  - Cross-Origin Resource Policy (CORP)
  - XSS Protection headers
  - HSTS (HTTP Strict Transport Security)

- **CORS Configuration**
  - Configured for specific client origins
  - Credentials support enabled for authentication
  - Preflight request handling

- **Input Validation**
  - File upload size limits (10MB max)
  - MIME type validation for uploads
  - SQL injection prevention via Prisma ORM
  - Sanitized user inputs

- **Data Protection**
  - Passwords never stored in plain text
  - JWT secrets and API keys stored in environment variables
  - Sensitive data excluded from API responses
  - File uploads stored securely

- **AI Security**
  - Rate limiting on Grok API calls via Redis
  - BullMQ job queues to prevent timeout attacks
  - Error handling and fallbacks for API failures

---

## 📡 API Endpoints

### Base URL
`/api/v1`

### Authentication
- `POST /auth/register` - Create user/team
- `POST /auth/login` - JWT login
- `GET /users/me` - Get current user
- `PUT /users/me` - Update profile

### Clients
- `GET /clients` - List clients (filter by team, search)
- `POST /clients` - Create client (Admin/Member)
- `GET /clients/:id` - Get client details
- `PUT /clients/:id` - Update client (Admin/Member)
- `DELETE /clients/:id` - Delete client (Admin)

### Projects
- `GET /projects` - List projects (filters: status, clientId)
- `POST /projects` - Create project (Admin/Member)
- `GET /projects/:id` - Get project
- `PUT /projects/:id` - Update project (Admin/Member)
- `POST /projects/:id/tasks` - Add task to project

### Tasks
- `GET /tasks` - List tasks (priority filter, due date filter)
- `PUT /tasks/:id` - Update task progress/status

### Analytics
- `GET /analytics/revenue` - Monthly trends + projections
- `POST /analytics/run-analysis` - Trigger Grok-powered forecast (queued job)

### Inbox
- `POST /inbox/messages` - Send/reply message
- `GET /inbox` - List messages/notifications

### Files
- `POST /files/upload` - Upload file (multipart/form-data, max 10MB)

See [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) for complete API reference.

---

## 🔄 Real-time Events (Socket.io)

The application uses Socket.io for real-time updates:

- `join-team` - Join team room for updates
- `task-updated` - Broadcast task changes to team
- `message-sent` - Real-time chat in Inbox/projects
- `ai-response` - Stream Grok responses to client
- `notification` - Push alerts (e.g., invoice paid)

---

## 🤖 AI Integration (Grok API)

### Setup
1. Get API key from https://x.ai/api
2. Add to `.env`:
   ```env
   GROK_API_KEY=your_key_here
   ```
3. Restart services:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

### Features Powered by Grok
- **Chat Assistant**: Ask questions, get recommendations, automate workflows
- **Smart Email Responses**: Generate professional replies to clients
- **Revenue Forecasting**: AI-powered projections based on historical data
- **Schedule Optimization**: Intelligent task prioritization and due date suggestions
- **Contract Review**: Summarize and analyze uploaded documents
- **AI Insights**: Actionable recommendations like "Follow up with Client X"
- **Function Calling**: Tools like "generate invoice" or "summarize thread"

### Cost Monitoring
- Monitor usage via xAI dashboard
- Rate limiting implemented via Redis
- BullMQ queues for heavy tasks to prevent timeouts

---

## 🛠️ Development

### Viewing the Database

Access the database GUI to inspect data:
```bash
docker exec -it freelanceflow-backend npx prisma studio
```
Then open http://localhost:5555

### Force Re-seed Database

To reset and re-seed the database with fresh demo data:
```bash
docker-compose down -v
docker-compose up -d --build
```

**Warning:** This deletes ALL data including any clients, projects, or tasks you created.

### Docker Architecture

**Services:**
- **Frontend** (`freelanceflow-frontend`)
  - Built with Vite for optimal bundle size
  - Served by Nginx with gzip compression
  - Port: 3000 → 80

- **Backend** (`freelanceflow-backend`)
  - Multi-stage TypeScript compilation
  - Runs migrations and seeding on startup
  - Port: 3001
  - Mounted volume for file uploads

- **PostgreSQL** (`freelanceflow-postgres`)
  - PostgreSQL 15 Alpine
  - Port: 5432
  - Persistent volume for data

- **Redis** (`freelanceflow-redis`)
  - Redis 7 Alpine
  - Port: 6379
  - Persistent volume for cache and job queues

- **Nginx** (`freelanceflow-nginx`)
  - Reverse proxy for production
  - Serves static frontend files
  - Proxies `/api` to backend
  - Port: 80

**Volume Mounts:**
- `./backend/uploads:/app/uploads` - File attachments and invoices
- `postgres_data` - PostgreSQL database data
- `redis_data` - Redis cache data

**Startup Sequence:**
1. PostgreSQL and Redis start with health checks
2. Backend waits for both services to be healthy
3. Backend runs `npx prisma migrate deploy`
4. Backend runs seed script (creates demo data)
5. Backend starts Express server on port 3001
6. Frontend serves pre-built React app via Nginx on port 3000 (dev) or 80 (production)

---

## 📚 Useful Commands

### View Logs
```bash
docker-compose logs -f backend     # Backend logs
docker-compose logs -f frontend    # Frontend logs
docker-compose logs -f             # All logs
```

### Access Database CLI
```bash
docker exec -it freelanceflow-postgres psql -U postgres -d freelanceflow
```

### View Container Status
```bash
docker-compose ps                  # See all running containers
docker stats                       # See resource usage
```

### Restart Services
```bash
docker-compose restart backend     # Restart just backend
docker-compose restart frontend    # Restart just frontend
docker-compose restart             # Restart all services
```

---

## 🛡️ Security Notes

- Default JWT secrets are provided for development. **Change these in production!**
- All passwords are hashed with bcrypt
- File uploads are validated for size (10MB limit) and stored securely
- HTTPS should be enforced in production
- Rate limiting on AI calls via Redis
- Store `GROK_API_KEY` securely (never commit to git)

---

## 📖 Documentation

See [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) for:
- Detailed architecture diagrams
- Complete data models and Prisma schema
- Full API endpoint reference
- WebSocket event documentation
- Frontend component structure
- AI integration implementation details
- Authentication and authorization flows
- Deployment guidelines

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📝 License

MIT

---

**Built with React, TypeScript, Node.js, PostgreSQL, Redis, Socket.io, and xAI's Grok API**
