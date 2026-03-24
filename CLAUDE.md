# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Work Track is a task management application with a TypeScript backend and Vue 3 frontend.

## Architecture

**Backend** (`backend/`)
- Express.js server with TypeScript
- Sequelize ORM for MySQL database
- REST API at `/api/tasks` endpoints
- Task model with self-referential association (parent/child subtasks)
- Database: `track_work` (MySQL)

**Frontend** (`frontend/`)
- Vue 3 + TypeScript + Vite
- Component-based UI with task list (left) and detail view (right)
- Features: CRUD operations, subtask management, due date tracking, assignee assignment

## Commands

### Backend
```bash
cd backend
npm run dev      # Run with ts-node
npm run build    # Compile TypeScript
npm start        # Run compiled JS
```

### Frontend
```bash
cd frontend
npm run dev      # Start Vite dev server
npm run build    # Type check and build
npm run preview  # Preview production build
```

## Configuration

**Backend Database** - `backend/src/config/database.ts`:
- Database: `track_work`
- Host: `localhost`
- Edit credentials as needed

**Frontend API** - `src/App.vue`:
- Default: `http://localhost:3000/api`

## Key Files

- `backend/src/index.ts` - Server entry point, Express setup
- `backend/src/models/Task.ts` - Task model with Sequelize
- `backend/src/controllers/TaskController.ts` - CRUD logic
- `backend/src/routes/taskRoutes.ts` - API routes
- `frontend/src/App.vue` - Main Vue component with all UI logic
