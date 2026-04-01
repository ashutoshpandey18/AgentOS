# 🤖 AgentOS - AI Agent Backend System

<p align="center">
  <a href="https://github.com/ashutoshpandey18/AgentOS">
    <img src="https://img.shields.io/badge/NestJS-11.0.1-E0234E?style=for-the-badge&logo=nestjs" alt="NestJS" />
  </a>
  <a href="https://github.com/ashutoshpandey18/AgentOS">
    <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  </a>
  <a href="https://github.com/ashutoshpandey18/AgentOS">
    <img src="https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  </a>
  <a href="https://github.com/ashutoshpandey18/AgentOS">
    <img src="https://img.shields.io/badge/PostgreSQL-14-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  </a>
</p>

<p align="center">
  Production-ready AI agent orchestration system with intelligent workflow execution, real-time WebSocket events, and comprehensive API for building autonomous agent applications.
</p>

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Production Deployment](#-production-deployment)
- [Contributing](#-contributing)

---

## ✨ Features

### 🎯 Core Capabilities

- **🤖 Intelligent Agent Orchestration** - Create and manage AI agents with customizable modes (Rule-based, LLM)
- **🔄 Workflow Execution Engine** - Intent detection, tool selection, and automated task execution
- **📊 Run History & Analytics** - Complete audit trail with pagination and filtering
- **⚡ Real-time WebSocket Events** - Live execution logs with per-run isolation
- **🛡️ Production-Grade Security** - Rate limiting (10 req/min), input validation, error handling
- **🗄️ Database Integrity** - Foreign keys, cascade deletes, optimized indexes
- **🧪 Comprehensive Testing** - 31 E2E tests covering API, edge cases, and WebSocket

### 🚀 Production Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Input Validation** | `@IsUUID`, `@MaxLength`, `@Min`, `@Max` | ✅ |
| **Rate Limiting** | 10 requests/minute via @nestjs/throttler | ✅ |
| **Response Format** | Global interceptors for consistency | ✅ |
| **Error Handling** | AllExceptionsFilter with proper HTTP codes | ✅ |
| **Database Relations** | Cascade delete, indexes, referential integrity | ✅ |
| **WebSocket Scoping** | RunId-based event isolation | ✅ |
| **Run History** | Paginated endpoints with filtering | ✅ |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                │ HTTP/REST                   │ WebSocket
                │                             │
┌───────────────▼─────────────────────────────▼───────────────┐
│                      NestJS Server                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Controllers & Gateways                     │  │
│  │  AgentsController | WorkflowController | Gateway    │  │
│  └─────────────┬────────────────────────────────────────┘  │
│                │                                             │
│  ┌─────────────▼────────────────────────────────────────┐  │
│  │                Service Layer                          │  │
│  │  • Intent Detection (Rule/LLM)                       │  │
│  │  • Tool Registry & Execution                         │  │
│  │  • Workflow Orchestration                            │  │
│  │  • Retry Logic & Error Handling                      │  │
│  └─────────────┬────────────────────────────────────────┘  │
│                │                                             │
│  ┌─────────────▼────────────────────────────────────────┐  │
│  │              Prisma ORM                               │  │
│  │  • Type-safe queries                                 │  │
│  │  • Migrations                                        │  │
│  └─────────────┬────────────────────────────────────────┘  │
└────────────────┼─────────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────────┐
│                    PostgreSQL Database                        │
│  Agent ←─[1:N]─→ AgentRun (cascade delete)                  │
└──────────────────────────────────────────────────────────────┘
```

### Workflow Execution Flow

```
User Request → Intent Detection → Tool Selection → Execution → Response
     │              │                   │              │           │
     │         (Rule/LLM)          (Registry)     (Retry)     (WebSocket)
     │              │                   │              │           │
     └──────────────┴───────────────────┴──────────────┴───────────┘
                          Logged to Database
```

---

## 🛠️ Tech Stack

### Backend Framework
- **NestJS 11.0.1** - Enterprise Node.js framework
- **TypeScript 5.6** - Type-safe development
- **Prisma 5.22.0** - Next-gen ORM

### Database
- **PostgreSQL 14** - Relational database
- **Docker** - Containerized development

### Real-time
- **Socket.io** - WebSocket communication
- **WebSocket Gateway** - NestJS native support

### Security & Validation
- **@nestjs/throttler** - Rate limiting
- **class-validator** - DTO validation
- **class-transformer** - Data transformation

### AI/LLM (Ready for integration)
- **Groq API** - Fast LLM inference
- **OpenAI-compatible** - Flexible model support

---

## 📦 Prerequisites

- **Node.js** ≥ 20.x
- **pnpm** ≥ 8.x
- **PostgreSQL** 14+ (Docker recommended)
- **Git**

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/ashutoshpandey18/AgentOS.git
cd AgentOS
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create `.env` file in project root:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/agent_os"

# Server
PORT=3000
NODE_ENV=development

# Groq API (for LLM mode - optional)
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Database Setup

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL container
docker-compose up -d

# Create database (if not exists)
docker exec -it vfri_postgres psql -U postgres -c "CREATE DATABASE agent_os;"
```

**Option B: Local PostgreSQL**

```bash
# Create database
psql -U postgres -c "CREATE DATABASE agent_os;"
```

### 5. Run Prisma Migrations

```bash
# Generate Prisma client
pnpm prisma generate

# Push schema to database
pnpm prisma db push
```

### 6. Start Development Server

```bash
pnpm start:dev
```

Server runs at: **http://localhost:3000**

### 7. Verify Installation

```bash
curl http://localhost:3000/health
# Expected: {"status":"success","data":{"status":"ok","timestamp":"..."}}
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Endpoints Overview

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| `GET` | `/health` | Health check | ✅ |
| `POST` | `/agents` | Create agent | 10/min |
| `GET` | `/agents` | List all agents | 10/min |
| `GET` | `/agents/:id` | Get agent by ID | 10/min |
| `GET` | `/agents/:id/runs` | Get agent run history | 10/min |
| `DELETE` | `/agents/:id` | Delete agent | 10/min |
| `POST` | `/agent/run` | Execute agent workflow | 10/min |
| `GET` | `/runs/:runId` | Get specific run details | 10/min |

### 1. Create Agent

**POST** `/agents`

```json
{
  "name": "Customer Support Agent",
  "description": "Handles customer emails and searches",
  "tools": ["sendEmail", "searchDb"],
  "mode": "RULE_BASED"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid-here",
    "name": "Customer Support Agent",
    "description": "Handles customer emails and searches",
    "tools": ["sendEmail", "searchDb"],
    "mode": "RULE_BASED",
    "createdAt": "2026-04-02T00:00:00.000Z"
  }
}
```

### 2. Run Agent Workflow

**POST** `/agent/run`

```json
{
  "agentId": "uuid-here",
  "task": "Send an email to john@example.com about the meeting"
}
```

**Response:**
```json
{
  "status": "success",
  "result": "Email sent to john@example.com at 2026-04-02T10:30:00.000Z",
  "logs": [
    "Intent detected: send_email",
    "Tool selected: sendEmail",
    "Email sent to john@example.com at 2026-04-02T10:30:00.000Z"
  ]
}
```

### 3. Get Agent Run History

**GET** `/agents/:id/runs?limit=20&offset=0`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "run-uuid",
      "task": "Send email...",
      "result": "Email sent...",
      "status": "success",
      "logs": [...],
      "createdAt": "2026-04-02T10:30:00.000Z"
    }
  ]
}
```

### 4. Get Specific Run

**GET** `/runs/:runId`

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "run-uuid",
    "agentId": "agent-uuid",
    "task": "Search for customers in California",
    "result": "Found 2 results...",
    "status": "success",
    "logs": [
      {
        "step": "intent",
        "message": "Intent detected: search_db",
        "timestamp": "2026-04-02T10:30:00.000Z"
      }
    ],
    "createdAt": "2026-04-02T10:30:00.000Z"
  }
}
```

### WebSocket Events

Connect to: `ws://localhost:3000`

**Events Emitted:**

```javascript
// Log events (per runId)
{
  "event": "log",
  "runId": "uuid",
  "message": "Intent detected: send_email"
}

// Completion events
{
  "event": "complete",
  "runId": "uuid",
  "result": "Email sent successfully"
}
```

### Error Responses

All errors follow this format:

```json
{
  "status": "error",
  "message": "Descriptive error message",
  "statusCode": 400
}
```

**Common Status Codes:**
- `400` - Bad Request (validation failed)
- `403` - Forbidden (unauthorized tool)
- `404` - Not Found (resource missing)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## 🧪 Testing

### Run All Tests

```bash
pnpm test:all
```

### Individual Test Suites

```bash
# API endpoint tests (13 tests)
pnpm test:api

# Edge case & validation tests (15 tests)
pnpm test:edge

# WebSocket tests (6 tests)
pnpm test:ws
```

### Test Coverage

| Suite | Tests | Coverage |
|-------|-------|----------|
| API Endpoints | 13 | CRUD, workflow execution, run history |
| Input Validation | 8 | UUID, length, required fields |
| Security | 2 | Rate limiting, tool authorization |
| Edge Cases | 7 | Boundaries, special chars, pagination |
| WebSocket | 6 | Real-time events, runId scoping |
| **Total** | **36** | **End-to-end coverage** |

### Manual Testing

```bash
# Create agent
curl -X POST http://localhost:3000/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "description": "Testing",
    "tools": ["sendEmail"],
    "mode": "RULE_BASED"
  }'

# Run agent
curl -X POST http://localhost:3000/agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "uuid-from-above",
    "task": "Send email to test@example.com"
  }'
```

---

## 📁 Project Structure

```
agent-os/
├── src/
│   ├── agents/                    # Agent CRUD module
│   │   ├── agents.controller.ts   # Agent endpoints
│   │   ├── agents.service.ts      # Agent business logic
│   │   └── dto/
│   │       ├── create-agent.dto.ts
│   │       └── pagination-query.dto.ts
│   ├── workflow/                  # Workflow execution module
│   │   ├── workflow.controller.ts # Run endpoints
│   │   ├── workflow.service.ts    # Orchestration logic
│   │   ├── workflow.gateway.ts    # WebSocket events
│   │   ├── intent-detector.ts     # Intent detection
│   │   ├── llm.service.ts         # LLM integration
│   │   └── tools/
│   │       ├── send-email.tool.ts
│   │       ├── search-db.tool.ts
│   │       └── tool.registry.ts
│   ├── common/                    # Shared utilities
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts
│   │   └── interceptors/
│   │       └── transform.interceptor.ts
│   ├── prisma/                    # Database module
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── health/                    # Health check
│   ├── config/                    # Configuration
│   ├── app.module.ts              # Root module
│   └── main.ts                    # Entry point
├── prisma/
│   └── schema.prisma              # Database schema
├── test/
│   ├── test-api.js                # API tests
│   ├── test-edge-cases.js         # Validation tests
│   ├── test-websocket.js          # WebSocket tests
│   └── run-all-tests.js           # Test runner
├── docker-compose.yml             # PostgreSQL container
├── .env.example                   # Environment template
├── TESTING.md                     # Test documentation
├── PRODUCTION_IMPLEMENTATION.md   # Feature documentation
└── package.json
```

---

## 💻 Development

### Available Scripts

```bash
# Development
pnpm start:dev          # Start with hot-reload
pnpm start:debug        # Start with debugger
pnpm build              # Compile TypeScript
pnpm start:prod         # Run production build

# Database
pnpm prisma:generate    # Generate Prisma client
pnpm prisma:push        # Push schema changes
pnpm prisma:studio      # Open Prisma Studio GUI
pnpm prisma:migrate     # Create migration

# Testing
pnpm test:all          # Run all test suites
pnpm test:api          # API tests only
pnpm test:edge         # Edge case tests
pnpm test:ws           # WebSocket tests

# Code Quality
pnpm lint              # Run ESLint
pnpm format            # Format with Prettier
```

### Development Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes**
   - Update code
   - Add tests
   - Update documentation

3. **Run tests**
   ```bash
   pnpm test:all
   ```

4. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature
   ```

---

## 🚢 Production Deployment

### Environment Variables

```bash
# Production .env
DATABASE_URL="postgresql://user:pass@prod-host:5432/agent_os"
PORT=3000
NODE_ENV=production
GROQ_API_KEY=your_production_key
```

### Build for Production

```bash
# Install dependencies (production only)
pnpm install --prod

# Generate Prisma client
pnpm prisma:generate

# Build application
pnpm build

# Run migrations
pnpm prisma:migrate deploy

# Start production server
pnpm start:prod
```

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Rate limiting enabled (10 req/min)
- [ ] CORS configured for specific origins
- [ ] Health check endpoint accessible
- [ ] Logging configured (Winston/Pino)
- [ ] Error monitoring (Sentry)
- [ ] SSL/TLS certificates installed
- [ ] Load balancer configured
- [ ] Database backups scheduled

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'feat: add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Database ORM by [Prisma](https://www.prisma.io/)
- Powered by [PostgreSQL](https://www.postgresql.org/)
- Real-time with [Socket.io](https://socket.io/)

---

## 📧 Contact

**Ashutosh Pandey** - [@ashutoshpandey18](https://github.com/ashutoshpandey18)

**Project Link:** [https://github.com/ashutoshpandey18/AgentOS](https://github.com/ashutoshpandey18/AgentOS)

---

<p align="center">Made with ❤️ by <a href="https://github.com/ashutoshpandey18">Ashutosh Pandey</a></p>

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
