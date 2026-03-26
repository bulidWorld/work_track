# Work Track - Deployment Guide

## ✅ Deployment Complete

Work Track has been successfully deployed with a **unified single-port architecture**!

---

## 📍 Installation Location

- **Root Directory:** `/opt/apps/work_track`
- **Frontend Build:** `/opt/apps/work_track/frontend/dist`
- **Backend:** `/opt/apps/work_track/backend`
- **Database:** PostgreSQL (`track_work` on localhost:5432)

---

## 🌐 Access URLs

| Service | Port | URL |
|---------|------|-----|
| **Unified Server** | 10512 | http://0.0.0.0:10512 |
| **Health Check** | 10512 | http://localhost:10512/health |

---

## 🚀 Architecture

```
┌─────────────────────────────────────────────────────┐
│        Unified Server (Port 10512)                  │
│                                                     │
│  ┌───────────────────┐     ┌─────────────────────┐ │
│  │  Static Files     │     │   API Proxy         │ │
│  │  (Frontend)       │────►│   → Backend:10513   │ │
│  │  /                │     │   /api/*            │ │
│  └───────────────────┘     └─────────────────────┘ │
│                                         │           │
│                                         ▼           │
│                                ┌─────────────────┐  │
│                                │  Backend        │  │
│                                │  (Express.js)   │  │
│                                │  Port: 10513    │  │
│                                └─────────────────┘  │
│                                         │           │
│                                         ▼           │
│                                ┌─────────────────┐  │
│                                │  PostgreSQL     │  │
│                                │  track_work     │  │
│                                └─────────────────┘  │
└─────────────────────────────────────────────────────┘
                     ▲
                     │
              Users access via
         http://server-ip:10512
```

**Key Points:**
- Single entry point for users (port 10512)
- Backend runs as a child process (port 10513)
- API requests use **relative paths** (`/api/*`)
- Frontend and API on same origin (no CORS issues)
- Works behind reverse proxy without configuration

---

## 🔧 Starting the Service

### Start Unified Server (includes backend)
```bash
cd /opt/apps/work_track
node server.js &
```

That's it! The unified server automatically starts the backend as a child process.

---

## 🛑 Stopping the Service

```bash
# Stop all Work Track processes
pkill -f "work_track"
```

---

## 🔧 Configuration

### Unified Server Port
Edit `server.js`:
```javascript
const PORT = process.env.PORT || 10512;
```

### Backend API Port (internal)
Edit `backend/src/index.ts`:
```typescript
const PORT: number = parseInt(process.env.PORT || '10513', 10);
```

### Database Configuration
Edit `backend/src/config/database.ts`:
```typescript
const sequelize = new Sequelize('track_work', 'naze', 'Naze666666', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres'
});
```

### Frontend API Base URL
Edit `frontend/src/App.vue`:
```typescript
const API_BASE_URL = '/api';  // Uses relative path
```

---

## 📁 Project Structure

```
/opt/apps/work_track/
├── backend/
│   ├── src/
│   │   ├── auth/           # JWT & LDAP authentication
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Task controller
│   │   ├── models/         # Sequelize models (Task, User)
│   │   ├── routes/         # API routes
│   │   ├── init/           # Admin user initialization
│   │   └── index.ts        # Server entry point
│   ├── dist/               # Compiled JavaScript
│   └── package.json
├── frontend/
│   ├── src/
│   │   └── App.vue         # Main Vue component
│   ├── dist/               # Production build
│   └── package.json
├── server.js               # Unified server (frontend + API proxy + backend)
├── package.json
└── DEPLOYMENT.md
```

---

## 🔌 API Endpoints

All API endpoints use **relative paths** and are accessed via the unified server:

### Authentication
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### Tasks
```bash
GET    /api/tasks          # List all tasks
POST   /api/tasks          # Create task
GET    /api/tasks/:id      # Get task by ID
PUT    /api/tasks/:id      # Update task
DELETE /api/tasks/:id      # Delete task
```

### Subtasks
```bash
GET    /api/tasks/:id/subtasks
POST   /api/tasks/:id/subtasks
```

### Health Check
```bash
GET /health
```

---

## 🔑 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |

---

## 🛠️ Troubleshooting

### Check if service is running
```bash
# Check processes
ps aux | grep "work_track"

# Check ports
ss -tlnp | grep -E "10512|10513"
```

### View logs
```bash
cat /tmp/work_track_unified.log
```

### Test frontend
```bash
curl http://localhost:10512/
```

### Test API
```bash
# Health check (no auth required)
curl http://localhost:10512/health

# API endpoint (auth required)
curl http://localhost:10512/api/tasks
# Returns: {"error":"Authentication required"} ✓
```

### Database connection
```bash
# Check PostgreSQL is running
ss -tlnp | grep 5432
```

---

## 📝 Features

- ✅ **Task Management**: Create, read, update, delete tasks
- ✅ **Subtasks**: Hierarchical task structure with parent/child relationships
- ✅ **Due Dates**: Track task deadlines with quick-set buttons
- ✅ **Assignees**: Assign tasks to users (admin only)
- ✅ **User Authentication**: JWT-based authentication with LDAP support
- ✅ **Responsive UI**: Vue 3 + Vite frontend with modern design
- ✅ **Single Port**: Unified server for simplified deployment
- ✅ **Relative API Paths**: Works behind any reverse proxy

---

## 🔄 Quick Restart

```bash
# Stop all
pkill -f "work_track"
sleep 1

# Start unified server
cd /opt/apps/work_track
node server.js &

# Verify
sleep 3
curl http://localhost:10512/health
curl http://localhost:10512/
```

---

## 📊 Ports Summary

| Service | Port | Binding | Description |
|---------|------|---------|-------------|
| Unified Server | 10512 | 0.0.0.0 | Frontend + API proxy (user-facing) |
| Backend API | 10513 | 0.0.0.0 | Express.js server (internal) |
| PostgreSQL | 5432 | 0.0.0.0 | Database |

---

## 🎯 Advantages of Unified Architecture

1. **Single Port**: Users only need to access one port (10512)
2. **No CORS Issues**: Frontend and API on same origin
3. **Relative API Paths**: Works behind any reverse proxy without configuration
4. **Simplified Deployment**: One command to start everything
5. **Easy Reverse Proxy**: Single backend for nginx/traefik
6. **Automatic Backend Management**: Unified server handles backend lifecycle

---

## 🔒 Reverse Proxy Examples

### nginx
```nginx
server {
    listen 80;
    server_name worktrack.example.com;

    location / {
        proxy_pass http://localhost:10512;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Apache
```apache
<VirtualHost *:80>
    ServerName worktrack.example.com

    ProxyPreserveHost On
    ProxyPass / http://localhost:10512/
    ProxyPassReverse / http://localhost:10512/
</VirtualHost>
```

### Caddy
```caddyfile
worktrack.example.com {
    reverse_proxy localhost:10512
}
```

---

**Last Updated:** 2026-03-24  
**Version:** 2.1 (Relative API Paths)
