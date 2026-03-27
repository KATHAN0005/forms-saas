# forms-saas

A full-stack, production-ready **Google Forms-like SaaS platform** for creating, sharing, and analysing forms. Built with React + TypeScript on the frontend and Express + Node.js on the backend, backed by a MySQL database.

---

## Features

### Form Builder
- Drag-and-drop question reordering (powered by [@dnd-kit](https://dndkit.com))
- 9 question types: Short answer, Paragraph, Multiple choice, Checkboxes, Dropdown, Date, File upload, Rating, Section break
- Multi-page form support — section break questions automatically split the form into pages with Back/Next navigation
- Live theme customisation (primary colour, background colour, font family)
- Keyboard shortcuts: `Ctrl+S` save · `Ctrl+Z` undo · `Ctrl+Shift+Z` redo · `Delete` remove question
- Auto-save (debounced) while editing

### Dashboard
- Grid and list view toggle
- Sort by: Last modified, Name A–Z, Name Z–A, Most responses
- Folder organisation with colour labels
- Duplicate, archive, and delete forms
- QR-code sharing modal with copy-to-clipboard link

### Public Form
- Password-protected forms
- Auto-save partial responses to localStorage
- Progress bar (page-based for multi-page, question-based otherwise)
- Email collection, submission limits, custom confirmation message

### Analytics
- Real-time polling — data refreshes automatically every 30 seconds
- Date-range filter: last 7 / 30 / 90 days
- Completion rate stat (responses ÷ views)
- Bar, Line, and Pie charts for choice & rating questions (Recharts)
- CSV export

### Auth
- Email + password with bcrypt hashing
- Google OAuth
- JWT access tokens + refresh token rotation
- Forgot/reset password via email

### Backend / API
- RESTful Express API with Joi validation
- Helmet, CORS, and rate limiting
- AI form generator (rule-based, no external API key required)
- Webhook support with HMAC signature verification
- Email notifications via Nodemailer
- Winston structured logging + Morgan HTTP logs

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Backend | Express 4, TypeScript, Node.js 18+ |
| Database | MySQL 8 |
| Auth | JWT, Google OAuth 2 |
| Email | Nodemailer (SMTP) |
| Logging | Winston + Morgan |

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **MySQL** 8 running locally or a hosted instance (e.g. PlanetScale, Railway, Render)

---

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/KATHAN0005/forms-saas.git
cd forms-saas
```

### 2. Set up the database

Create the database and run the schema:

```bash
mysql -u root -p -e "CREATE DATABASE forms_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p forms_saas < database/schema.sql
```

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=forms_saas

# JWT — use long random strings in production
JWT_SECRET=change_me
JWT_REFRESH_SECRET=change_me_too
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email / SMTP (optional — required for password reset & notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@formsaas.com

# Frontend URL (for CORS & email links)
FRONTEND_URL=http://localhost:5173
```

Install dependencies and start the dev server:

```bash
npm install
npm run dev      # starts on http://localhost:5000
```

### 4. Configure the frontend

```bash
cd ../frontend
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

Install dependencies and start the dev server:

```bash
npm install
npm run dev      # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | HTTP port (default `5000`) |
| `NODE_ENV` | No | `development` or `production` |
| `DB_HOST` | Yes | MySQL host |
| `DB_PORT` | No | MySQL port (default `3306`) |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | Yes | MySQL database name |
| `JWT_SECRET` | Yes | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for refresh tokens |
| `JWT_EXPIRES_IN` | No | Access token TTL (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token TTL (default `7d`) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `SMTP_HOST` | No | SMTP server host |
| `SMTP_PORT` | No | SMTP port (default `587`) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password / app password |
| `EMAIL_FROM` | No | From address for outgoing emails |
| `FRONTEND_URL` | Yes | Frontend origin for CORS & links |
| `MAX_FILE_SIZE` | No | File upload limit in bytes (default `10485760`) |
| `RATE_LIMIT_WINDOW` | No | Rate limit window in minutes (default `15`) |
| `RATE_LIMIT_MAX` | No | Max requests per window (default `100`) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Full URL of the backend API, e.g. `https://api.example.com/api` |

---

## Building for Production

### Backend

```bash
cd backend
npm run build   # compiles TypeScript → dist/
npm start       # runs dist/index.js
```

### Frontend

```bash
cd frontend
npm run build   # outputs to dist/
```

The `dist/` directory can be served by any static host (Vercel, Netlify, Cloudflare Pages, Nginx, …).

---

## Deployment

### Frontend → Vercel

1. Import the repository in the [Vercel dashboard](https://vercel.com/new).
2. Set the **Root Directory** to `frontend`.
3. Add the `VITE_API_URL` environment variable pointing to your deployed backend.
4. Vercel uses `frontend/vercel.json` automatically — all routes are rewritten to `index.html` for client-side routing.

### Backend → Render

1. Create a new **Web Service** in the [Render dashboard](https://render.com).
2. Set the **Root Directory** to `backend`.
3. Use the settings in `backend/render.yaml` as a reference or connect it directly.
4. Set all required environment variables in Render's dashboard.
5. Provision a MySQL database (Render, PlanetScale, Railway, etc.) and populate `DB_*` vars.

---

## API Overview

All endpoints are prefixed with `/api`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login |
| POST | `/auth/google` | Google OAuth |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |
| GET  | `/auth/me` | Current user |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Reset password |

### Forms
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/forms` | List your forms |
| POST | `/forms` | Create form |
| GET  | `/forms/:id` | Get form |
| PUT  | `/forms/:id` | Update form |
| DELETE | `/forms/:id` | Delete form |
| POST | `/forms/:id/duplicate` | Duplicate form |
| GET  | `/forms/public/:slug` | Get published form (public) |

### Responses & Analytics
| Method | Path | Description |
|--------|------|-------------|
| POST | `/forms/:slug/submit` | Submit a response |
| POST | `/forms/:slug/partial` | Auto-save partial response |
| GET  | `/forms/:id/responses` | List responses |
| GET  | `/forms/:id/analytics` | Analytics data |
| GET  | `/forms/:id/export` | Export responses as CSV |

### Folders
| Method | Path | Description |
|--------|------|-------------|
| POST | `/forms/folders` | Create folder |
| GET  | `/forms/folders/list` | List folders |
| PUT  | `/forms/folders/:id` | Rename / recolour folder |
| DELETE | `/forms/folders/:id` | Delete folder |

### User
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/user/profile` | Get profile |
| PUT  | `/user/profile` | Update profile |
| POST | `/user/change-password` | Change password |
| GET  | `/user/stats` | Usage stats |

### Webhooks & AI
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/forms/:id/webhooks` | List webhooks |
| POST | `/forms/:id/webhooks` | Create webhook |
| DELETE | `/forms/:id/webhooks/:wid` | Delete webhook |
| POST | `/ai/generate` | Generate form from a text prompt |

---

## Project Structure

```
forms-saas/
├── backend/
│   ├── src/
│   │   ├── config/       # Database connection pool
│   │   ├── controllers/  # Business logic
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── models/       # Database operations
│   │   ├── routes/       # Express routers
│   │   └── utils/        # Email, webhooks, logger
│   ├── render.yaml       # Render deployment config
│   └── .env.example
├── database/
│   └── schema.sql        # MySQL schema (9 tables)
├── frontend/
│   ├── src/
│   │   ├── api/          # Axios API client
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── pages/        # Page components
│   │   ├── store/        # Zustand stores
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Helpers
│   └── vercel.json       # Vercel deployment config
└── README.md
```

---

## License

MIT
