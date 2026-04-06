# TurboDock

A self-hosted Docker Swarm and Engine management dashboard — similar to Portainer — built with Next.js, React, and Turso/LibSQL.

Manage multiple Docker endpoints, containers, services, images, volumes, networks, and swarm nodes from a single web interface with role-based access control and audit logging.

## Features

- **Multi-Endpoint Management** — Connect and switch between multiple Docker hosts
- **Container Operations** — Create, start, stop, restart, remove containers with live logs and stats
- **Swarm Management** — Manage services, nodes, and tasks across Docker Swarm clusters
- **Image Management** — View, pull, and remove Docker images
- **Network & Volume Management** — Inspect and manage Docker networks and volumes
- **User Management** — Create and manage users with role-based access control (Admin, DevOps, Support)
- **Audit Logging** — Track all management actions across the platform
- **Live Monitoring** — Real-time container stats and streaming log viewer with search and tail options
- **Modern UI** — Built with HeroUI v3, Tailwind CSS 4, and the "Architectural Monolith" design system

## Tech Stack

| Layer      | Technology                                          |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React Compiler)             |
| Frontend   | React 19, HeroUI v3, Tailwind CSS 4                 |
| Database   | Turso / LibSQL (SQLite-compatible) with Drizzle ORM |
| Auth       | JWT sessions (jose), Argon2 password hashing        |
| Docker API | Docker Engine API v1.47 via socket proxy            |
| Language   | TypeScript 5                                        |

## Prerequisites

- Node.js 20+
- Docker Engine with socket access (or a remote Docker API endpoint)
- [Docker Socket Proxy](https://github.com/Tecnativa/docker-socket-proxy) (recommended for secure access)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd docker-manage/docker-manager-web
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Database (local SQLite file or remote Turso URL)
TURSO_DATABASE_URL=file:.data/local.db
TURSO_AUTH_TOKEN=

# Session secret (generate a random 32+ character string)
SESSION_SECRET=your-random-32-char-secret

# App name
NEXT_PUBLIC_APP_NAME=TurboDock
```

### 4. Set up, the Docker Socket Proxy

```bash
cd ../docker-socket
docker compose up -d
```

This starts a proxied Docker API on `localhost:2375` with all required permissions.

### 5. Initialize the database

```bash
npm run db:push
```

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first visit, you'll be redirected to the setup page to create an admin account.

## Project Structure

```
turbodock/
├── app/
│   ├── (auth)/                    # Login and setup pages
│   ├── (dashboard)/dashboard/     # Protected dashboard pages
│   │   ├── containers/            # Container list, detail, logs, stats
│   │   ├── services/              # Service list and detail
│   │   ├── nodes/                 # Swarm node list and detail
│   │   ├── tasks/                 # Swarm task list
│   │   ├── images/                # Docker images
│   │   ├── networks/              # Docker networks
│   │   ├── volumes/               # Docker volumes
│   │   ├── endpoints/             # Docker endpoint management
│   │   ├── users/                 # User management
│   │   └── audit-logs/            # Audit log viewer
│   └── api/                       # API routes
│       ├── auth/                  # Authentication endpoints
│       ├── docker/[endpointId]/   # Docker API proxy per endpoint
│       ├── endpoints/             # Endpoint CRUD
│       ├── users/                 # User CRUD
│       └── audit-logs/            # Audit log queries
├── components/
│   ├── ui/                        # Base UI components
│   ├── layout/                    # App shell (sidebar, topbar)
│   ├── containers/                # Container-specific components
│   └── services/                  # Service-specific components
├── contexts/                      # React context providers
├── hooks/                         # Custom React hooks
├── lib/
│   ├── auth/                      # Session, RBAC, password hashing
│   ├── db/                        # Database schema and client
│   └── docker/                    # Docker API client and types
└── public/                        # Static assets
```

## Scripts

| Command               | Description                     |
| --------------------- | ------------------------------- |
| `npm run dev`         | Start development server        |
| `npm run build`       | Build for production            |
| `npm start`           | Start production server         |
| `npm run lint`        | Run ESLint                      |
| `npm run db:push`     | Push schema changes to database |
| `npm run db:generate` | Generate Drizzle migrations     |

## RBAC Roles

| Role        | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| **Admin**   | Full access — manage users, endpoints, and all Docker resources   |
| **DevOps**  | Manage containers, services, images, volumes, networks, and nodes |
| **Support** | Read-only access to containers, logs, and services                |

## Docker Socket Proxy

The included `docker-socket/docker-compose.yml` runs [Tecnativa Docker Socket Proxy](https://github.com/Tecnativa/docker-socket-proxy) to safely expose the Docker daemon API over TCP without giving direct socket access to the web app.

All Docker API categories are enabled: containers, services, nodes, swarm, networks, volumes, images, tasks, and system info.

## Deploy with Docker

### Quick Start

```bash
docker run -d \
  --name turbodock \
  -p 3000:3000 \
  -e SESSION_SECRET=your-random-32-char-secret \
  -e TURSO_DATABASE_URL=file:.data/local.db \
  -e TURSO_AUTH_TOKEN= \
  -e NEXT_PUBLIC_APP_NAME=TurboDock \
  ghcr.io/OWNER/docker-manage:latest
```

> Replace `OWNER` with your GitHub username or organization.

### Docker Compose

Create a `docker-compose.yml`:

```yaml
services:
  turbodock:
    image: ghcr.io/OWNER/docker-manage:latest
    container_name: turbodock
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - SESSION_SECRET=your-random-32-char-secret
      - TURSO_DATABASE_URL=file:.data/local.db
      - TURSO_AUTH_TOKEN=
      - NEXT_PUBLIC_APP_NAME=TurboDock
    volumes:
      - turbodock-data:/app/.data

  docker-proxy:
    image: tecnativa/docker-socket-proxy
    container_name: docker-proxy
    restart: unless-stopped
    ports:
      - "2375:2375"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - CONTAINERS=1
      - SERVICES=1
      - TASKS=1
      - NODES=1
      - NETWORKS=1
      - VOLUMES=1
      - IMAGES=1
      - SWARM=1
      - INFO=1
      - VERSION=1
      - POST=1
      - DELETE=1

volumes:
  turbodock-data:
```

```bash
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000) and create your admin account.

### Build Locally

```bash
docker build -t turbodock ./docker-manager-web
docker run -d -p 3000:3000 \
  -e SESSION_SECRET=your-random-32-char-secret \
  -e TURSO_DATABASE_URL=file:.data/local.db \
  turbodock
```

### Environment Variables

| Variable               | Required | Default     | Description                                           |
| ---------------------- | -------- | ----------- | ----------------------------------------------------- |
| `SESSION_SECRET`       | Yes      | —           | Random 32+ character string for JWT signing           |
| `TURSO_DATABASE_URL`   | Yes      | —           | SQLite file path (`file:.data/local.db`) or Turso URL |
| `TURSO_AUTH_TOKEN`     | No       | —           | Auth token for remote Turso database                  |
| `NEXT_PUBLIC_APP_NAME` | No       | `TurboDock` | Application display name                              |
| `PORT`                 | No       | `3000`      | Server port                                           |

## CI/CD

The project includes a GitHub Actions workflow at `.github/workflows/build-and-publish.yml` that automatically builds and publishes the Docker image to GitHub Container Registry (GHCR).

**Triggers:**

- Push to `main` branch → publishes `main` tag
- Push a version tag (e.g. `v1.0.0`) → publishes `1.0.0`, `1.0`, and `sha-xxxxx` tags
- Pull requests → build only (no push)

**Image tags produced:**

| Trigger        | Example Tags                                                           |
| -------------- | ---------------------------------------------------------------------- |
| Push to `main` | `ghcr.io/OWNER/docker-manage:main`                                     |
| Tag `v1.2.3`   | `ghcr.io/OWNER/docker-manage:1.2.3`, `ghcr.io/OWNER/docker-manage:1.2` |
| Any push       | `ghcr.io/OWNER/docker-manage:sha-a1b2c3d`                              |

The workflow uses GitHub's built-in `GITHUB_TOKEN` for authentication — no additional secrets needed.

## License

MIT
