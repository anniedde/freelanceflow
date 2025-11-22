# FreelanceFlow

AI-powered dashboard for freelancers and small agencies. Combines CRM, project management, revenue analytics, task tracking, and workflow automation with deep xAI Grok API integration.

## Features

- **Multi-user support** with role-based access (Admin, Member, Viewer)
- **CRM** for client management with contact tracking and notes
- **Project Management** with Kanban board and task tracking
- **Revenue Analytics** with AI-powered forecasting
- **Real-time collaboration** via WebSockets
- **AI Assistant** powered by xAI's Grok API for smart responses and automation
- **Invoice Management** with file uploads
- **Inbox** for messages and notifications

## Tech Stack

### Frontend
- React 18 with TypeScript
- Redux Toolkit for state management
- Tailwind CSS for styling
- Vite for build tooling
- Socket.io-client for real-time updates
- Recharts for analytics visualization
- @dnd-kit for drag-and-drop Kanban
- Framer Motion for animations

### Backend
- Node.js 18 with Express
- TypeScript
- Prisma ORM with PostgreSQL 15
- Redis 7 for caching and sessions
- Socket.io for real-time communication
- JWT authentication with bcrypt
- Winston for logging
- BullMQ for job queues

### AI Integration
- xAI Grok API (@xai/grok-sdk)
- Chat assistance and smart responses
- Revenue forecasting and analysis
- Schedule optimization
- Contract review

### DevOps
- Docker & Docker Compose
- Multi-stage builds
- Nginx reverse proxy
- PostgreSQL and Redis volumes for persistence

## Project Structure

```
freelanceflow/
├── backend/              # Express API server
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic & AI integration
│   │   ├── middleware/  # Auth, validation, etc.
│   │   ├── models/      # Prisma client
│   │   └── utils/       # Helpers
│   ├── prisma/          # Database schema & migrations
│   └── Dockerfile
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route pages
│   │   ├── store/       # Redux slices
│   │   ├── services/    # API clients
│   │   └── utils/       # Helpers
│   └── Dockerfile
├── docker-compose.yml   # Container orchestration
├── nginx.conf          # Nginx configuration
├── .env.example        # Environment variables template
└── TECHNICAL_SPEC.md   # Detailed technical documentation

```

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- xAI API key (get at https://x.ai/api)

### Quick Start with Docker

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your credentials:
   - `DB_PASSWORD` - PostgreSQL password
   - `JWT_SECRET` - Random secret for JWT signing
   - `GROK_API_KEY` - Your xAI Grok API key
4. Start the services:
   ```bash
   docker-compose up -d
   ```
5. Run database migrations:
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   docker-compose exec backend npx prisma generate
   ```
6. Access the application at http://localhost

### Local Development

#### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npx prisma migrate dev
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Documentation

See [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) for:
- Detailed architecture diagrams
- Complete data models and Prisma schema
- API endpoints and WebSocket events
- Frontend component structure
- AI integration details
- Authentication and authorization
- Deployment guidelines

## API Documentation

### Base URL
`/api/v1`

### Key Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /clients` - List clients
- `GET /projects` - List projects
- `GET /tasks` - List tasks
- `GET /analytics/revenue` - Revenue analytics
- `POST /analytics/run-analysis` - Trigger AI analysis
- `GET /inbox` - Messages and notifications

See [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) for complete API reference.

## User Roles

- **Admin**: Full access to all features
- **Member**: Access to projects and tasks
- **Viewer**: Read-only access to analytics and clients

## AI Features

Powered by xAI's Grok API:
- Smart email responses
- Revenue forecasting
- Schedule optimization
- Contract summarization
- Task prioritization
- Real-time chat assistance

## License

MIT

## Support

For issues and feature requests, please create an issue in this repository.
