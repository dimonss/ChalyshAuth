# 🔐 ChalyshAuth

> Global authentication microservice supporting Telegram Login & Google OAuth, built with Fastify, TypeScript, and SQLite.

---

## 📖 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Admin Panel](#-admin-panel)
- [Database](#-database)
- [Scheduled Tasks](#-scheduled-tasks)
- [Scripts](#-scripts)
- [License](#-license)
- [🇷🇺 Русская версия](#-русская-версия)

---

## ✨ Features

- **Telegram Login** — authenticate users via Telegram Login Widget with HMAC-SHA256 signature verification
- **Google OAuth2** — sign in with Google using Google ID Token verification
- **JWT Tokens** — issue access & refresh token pairs with configurable expiration
- **Token Verification** — lightweight `GET <BASE_URL>/auth/verify` endpoint to check token validity without database overhead
- **Token Refresh & Rotation** — seamlessly rotate refresh tokens on each refresh call to prevent token reuse
- **Automated Token Cleanup** — scheduled daily cron task to remove expired refresh tokens
- **User Profiles** — unified user accounts supporting Telegram, Google, or linked profiles
- **Additional Fields** — flexible JSON storage for arbitrary per-user data (e.g. game scores, user preferences)
- **Leaderboard** — built-in endpoint to retrieve top players by game high scores
- **Admin Panel** — web UI (`/admin`) for administrators with Telegram and Google Sign-In, statistics, user search, filtering, and data editing
- **Swagger / OpenAPI** — interactive API documentation UI available at `<BASE_URL>/docs`
- **Public Pages** — static Privacy Policy and Terms of Service endpoints
- **Input Validation** — strict request/response validation via Zod schemas
- **SQLite** — fast, zero-config local database powered by `better-sqlite3` and Drizzle ORM
- **CORS** — configurable cross-origin support out of the box
- **Health Check** — built-in `GET <BASE_URL>/health` endpoint

---

## 🛠 Tech Stack

| Layer         | Technology                                                        |
| ------------- | ----------------------------------------------------------------- |
| Runtime       | Node.js 24 (see `.nvmrc`)                                         |
| Language      | TypeScript (strict mode)                                          |
| Framework     | Fastify 5                                                         |
| Database      | SQLite via `better-sqlite3`                                       |
| ORM           | Drizzle ORM                                                       |
| Validation    | Zod + `fastify-type-provider-zod`                                 |
| Auth          | `@fastify/jwt`, Telegram Login Widget, Google OAuth2 ID Tokens     |
| Docs          | `@fastify/swagger`, `@fastify/swagger-ui` (OpenAPI 3.1)            |
| Scheduling    | `node-cron`                                                       |
| Logging       | Pino (`pino-pretty`)                                              |

---

## 📁 Project Structure

```
ChalyshAuth/
├── src/
│   ├── server.ts              # Entry point — loads env, DB, starts Fastify
│   ├── app.ts                 # App builder — plugins, routes, static pages, error handling
│   ├── config/
│   │   └── env.ts             # Zod-validated environment config & admin email helper
│   ├── db/
│   │   ├── connection.ts      # SQLite connection setup
│   │   ├── migrate.ts         # Drizzle migration runner
│   │   └── schema.ts          # Database schema (users, refresh_tokens)
│   ├── modules/
│   │   ├── admin/
│   │   │   ├── admin.guard.ts     # Pre-handler guard verifying admin permissions
│   │   │   ├── admin.routes.ts    # Admin dashboard & management endpoints
│   │   │   ├── admin.schemas.ts   # Zod validation schemas for admin API
│   │   │   └── admin.service.ts   # Admin metrics & CRUD operations
│   │   ├── auth/
│   │   │   ├── auth.routes.ts     # Auth endpoints (Telegram, Google, refresh, verify)
│   │   │   ├── auth.schemas.ts    # Zod schemas for auth
│   │   │   ├── auth.service.ts    # Auth business logic & user upsert
│   │   │   ├── google.service.ts  # Google OAuth2 ID token verification
│   │   │   ├── telegram.service.ts# Telegram HMAC-SHA256 signature verification
│   │   │   └── token.service.ts   # JWT issuance, rotation & cleanup
│   │   └── user/
│   │       ├── user.routes.ts     # User profile, additional fields & leaderboard
│   │       ├── user.schemas.ts    # Zod schemas for user
│   │       └── user.service.ts    # User business logic & score rankings
│   ├── plugins/
│   │   ├── cors.plugin.ts     # CORS configuration
│   │   ├── cron.plugin.ts     # Background scheduler for token cleanup
│   │   ├── jwt.plugin.ts      # Fastify JWT plugin configuration
│   │   └── swagger.plugin.ts  # Swagger & Swagger UI integration
│   └── public/
│       ├── admin.html         # Admin dashboard single-page application
│       ├── privacy-policy.html# Privacy Policy HTML page
│       └── terms-of-service.html # Terms of Service HTML page
├── drizzle/                   # Auto-generated database migrations
├── drizzle.config.ts          # Drizzle Kit configuration
├── tsconfig.json
├── package.json
├── .env.example
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 24 (see `.nvmrc`)
- **npm**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ChalyshAuth.git
cd ChalyshAuth

# Use the correct Node version
nvm use

# Install dependencies
npm install

# Copy environment template and fill in your values
cp .env.example .env
```

### Run Database Migrations

```bash
npm run db:generate   # Generate migration SQL from schema
npm run db:migrate    # Apply migrations to SQLite database
```

### Start Development Server

```bash
npm run dev
```

The server starts on `http://localhost:3000` (or the configured `PORT`).

### Production Build & Running

```bash
# Build TypeScript and copy static assets into dist/
npm run build

# Run production build with Node
npm start

# Or run with PM2
npm run start:prod
```

---

## 🔧 Environment Variables

Configure your `.env` file based on `.env.example`:

| Variable                  | Description                                                | Default                  |
| ------------------------- | ---------------------------------------------------------- | ------------------------ |
| `DATABASE_PATH`           | Path to SQLite database file                               | `./data/chalysh_auth.db` |
| `TELEGRAM_BOT_TOKEN`      | Telegram Bot token from [@BotFather](https://t.me/BotFather)| `""`                     |
| `GOOGLE_CLIENT_ID`        | Google OAuth2 Client ID for Google Sign-In                 | `""`                     |
| `JWT_SECRET`              | Secret key used to sign JWTs                               | *required* (min 16 chars)|
| `ACCESS_TOKEN_EXPIRES_IN` | Access token expiration duration (e.g. `15m`, `1h`)        | `15m`                    |
| `REFRESH_TOKEN_EXPIRES_IN`| Refresh token expiration duration (e.g. `30d`, `7d`)       | `30d`                    |
| `PORT`                    | HTTP port to listen on                                     | `3000`                   |
| `BASE_URL`                | Route prefix for all API endpoints                         | `/api`                   |
| `ADMIN_EMAILS`            | Comma-separated list of emails with admin panel privileges | `null@gmail.com`         |
| `ADMIN_TELEGRAM_USERNAMES`| Comma-separated list of Telegram usernames with admin privileges| `""`                |
| `TELEGRAM_BOT_USERNAME`   | Telegram bot username without @ for Telegram Login Widget  | `""` (auto-detected)     |
| `CRON_TIMEZONE`           | Timezone for scheduled cron tasks (e.g. daily cleanup)      | `Asia/Bishkek`           |

---

## 📡 API Reference

> **Note:** All API routes are mounted under the configurable prefix `BASE_URL` (default: `/api`, e.g. in `.env.example`: `/auth/api`). In the examples below, `/api` is used.

### Interactive API Docs

Interactive Swagger UI is available at:
```
http://localhost:3000/api/docs
```
*(Replace `/api` with your configured `BASE_URL`)*

---

### General & Static Endpoints

| Method | Endpoint                    | Auth | Description                     |
| ------ | --------------------------- | ---- | ------------------------------- |
| GET    | `/api/health`               | ✗    | Health check                    |
| GET    | `/api/docs`                 | ✗    | Swagger / OpenAPI UI            |
| GET    | `/admin` or `/api/admin`    | ✗    | Admin panel web application     |
| GET    | `/api/privacy-policy`       | ✗    | Privacy policy HTML page        |
| GET    | `/api/terms-of-service`     | ✗    | Terms of service HTML page      |

#### `GET /api/health`

**Response `200`:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-14T04:00:00.000Z"
}
```

---

### Authentication (`/api/auth`)

| Method | Endpoint              | Auth | Description                                 |
| ------ | --------------------- | ---- | ------------------------------------------- |
| GET    | `/api/auth/verify`    | 🔒   | Verify access token validity                |
| POST   | `/api/auth/telegram`  | ✗    | Sign in or register via Telegram Widget     |
| POST   | `/api/auth/google`    | ✗    | Sign in or register via Google ID token     |
| POST   | `/api/auth/refresh`   | ✗    | Rotate and issue new access & refresh tokens|
| POST   | `/api/auth/logout`    | ✗    | Revoke refresh token                        |

#### `GET /api/auth/verify`  🔒 *Requires Bearer token*

Verifies access token signature and expiration without querying the database.

**Header:**
```http
Authorization: Bearer <accessToken>
```

**Response `200`:**
```json
{
  "valid": true,
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

#### `POST /api/auth/telegram`

**Body:**
```json
{
  "id": 123456789,
  "first_name": "John",
  "last_name": "Doe",
  "username": "johndoe",
  "photo_url": "https://t.me/i/userpic/...",
  "auth_date": 1700000000,
  "hash": "d147...telegram_hmac_hash"
}
```

**Response `200`:**
```json
{
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "telegramId": "123456789",
    "googleId": null,
    "email": null,
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "photoUrl": "https://t.me/i/userpic/...",
    "additionalFields": {},
    "createdAt": "2026-09-14T04:00:00.000Z",
    "updatedAt": "2026-09-14T04:00:00.000Z"
  },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "c928cf69-1234-4567-89ab-cdef01234567"
}
```

#### `POST /api/auth/google`

**Body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response `200`:**
```json
{
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "telegramId": null,
    "googleId": "109876543210987654321",
    "email": "user@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "username": "user",
    "photoUrl": "https://lh3.googleusercontent.com/...",
    "additionalFields": {},
    "createdAt": "2026-09-14T04:00:00.000Z",
    "updatedAt": "2026-09-14T04:00:00.000Z"
  },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "c928cf69-1234-4567-89ab-cdef01234567"
}
```

#### `POST /api/auth/refresh`

Rotates the provided refresh token: revokes the old token and issues a fresh access & refresh token pair.

**Body:**
```json
{
  "refreshToken": "c928cf69-1234-4567-89ab-cdef01234567"
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "d821ae54-5678-4321-98ba-fedcba987654"
}
```

#### `POST /api/auth/logout`

Revokes the refresh token from the database.

**Body:**
```json
{
  "refreshToken": "d821ae54-5678-4321-98ba-fedcba987654"
}
```

**Response `200`:**
```json
{
  "message": "Logged out successfully"
}
```

---

### User Profile (`/api/user`)  🔒 *Requires Bearer token*

| Method | Endpoint                    | Description                                         |
| ------ | --------------------------- | --------------------------------------------------- |
| GET    | `/api/user/me`              | Get current user profile                            |
| GET    | `/api/user/me/fields`       | Get `additionalFields` only                         |
| PATCH  | `/api/user/me/fields`       | Deep-merge JSON properties into `additionalFields`  |
| DELETE | `/api/user/me/fields/:key`  | Remove a top-level key from `additionalFields`       |
| GET    | `/api/user/leaderboard`     | Get Top 10 users by high score                      |

#### `GET /api/user/me`

**Response `200`:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "telegramId": "123456789",
  "googleId": null,
  "email": null,
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "photoUrl": "https://t.me/...",
  "additionalFields": {
    "spaceShooterGame": {
      "bestScore": 1450,
      "level": 7
    }
  },
  "createdAt": "2026-09-14T04:00:00.000Z",
  "updatedAt": "2026-09-14T04:00:00.000Z"
}
```

#### `PATCH /api/user/me/fields`

**Body:**
```json
{
  "spaceShooterGame": {
    "bestScore": 1800,
    "level": 8
  },
  "preferences": {
    "theme": "dark"
  }
}
```

**Response `200`:**
```json
{
  "additionalFields": {
    "spaceShooterGame": {
      "bestScore": 1800,
      "level": 8
    },
    "preferences": {
      "theme": "dark"
    }
  }
}
```

#### `DELETE /api/user/me/fields/:key`

Deletes the key `:key` from the top level of `additionalFields`.

**Response `200`:**
```json
{
  "additionalFields": {
    "preferences": {
      "theme": "dark"
    }
  }
}
```

#### `GET /api/user/leaderboard`

Returns top 10 users ranked by `additionalFields.spaceShooterGame.bestScore`.

**Response `200`:**
```json
{
  "leaderboard": [
    {
      "username": "ace_pilot",
      "firstName": "Alex",
      "bestScore": 3200
    },
    {
      "username": "johndoe",
      "firstName": "John",
      "bestScore": 1800
    }
  ]
}
```

---

## 🛡 Admin Panel

The service includes a built-in admin web interface served at `/admin` (or `<BASE_URL>/admin`). It allows authorized administrators to view system statistics, browse registered users, filter by auth provider (Telegram / Google), search across records, edit user profiles/additional fields, and delete accounts.

Access to admin endpoints is strictly restricted by email whitelist defined in `ADMIN_EMAILS` and Telegram usernames defined in `ADMIN_TELEGRAM_USERNAMES`.

> [!NOTE]
> **Telegram Usernames**: Specify administrator Telegram usernames (with or without `@`) in `ADMIN_TELEGRAM_USERNAMES` separated by commas (e.g. `chalysh,myadmin`). Note that usernames in Telegram can be changed by users.

### Admin API Endpoints (`/api/admin`)

| Method | Endpoint                    | Auth             | Description                                                   |
| ------ | --------------------------- | ---------------- | ------------------------------------------------------------- |
| GET    | `/api/admin/config`         | ✗                | Returns `{ googleClientId, telegramBotUsername }` for login  |
| POST   | `/api/admin/auth/telegram`  | ✗                | Authenticates admin via Telegram Login Widget data            |
| POST   | `/api/admin/auth/google`    | ✗                | Authenticates admin via Google ID token (validates email)     |
| GET    | `/api/admin/me`           | 🔒 Admin Bearer  | Verifies admin session and returns current admin details      |
| GET    | `/api/admin/stats`        | 🔒 Admin Bearer  | Total users, Telegram/Google count, active refresh tokens     |
| GET    | `/api/admin/users`        | 🔒 Admin Bearer  | Paginated users with search, provider filter, and sorting     |
| GET    | `/api/admin/users/:id`    | 🔒 Admin Bearer  | Full user profile by UUID                                     |
| PATCH  | `/api/admin/users/:id`    | 🔒 Admin Bearer  | Update user fields and/or `additionalFields`                  |
| DELETE | `/api/admin/users/:id`    | 🔒 Admin Bearer  | Delete user and cascade their active refresh tokens           |

#### `GET /api/admin/stats`

**Response `200`:**
```json
{
  "totalUsers": 120,
  "telegramUsers": 95,
  "googleUsers": 25,
  "activeRefreshTokens": 110
}
```

#### `GET /api/admin/users`

**Query Parameters:**
- `page` (number, default `1`)
- `limit` (number, default `20`, max `100`)
- `search` (string, optional — searches in ID, email, username, firstName, lastName, telegramId, googleId)
- `provider` (`"all"` | `"telegram"` | `"google"`, default `"all"`)
- `sortBy` (`"createdAt"` | `"updatedAt"` | `"firstName"` | `"username"` | `"email"`, default `"createdAt"`)
- `sortOrder` (`"asc"` | `"desc"`, default `"desc"`)

---

## 🗄 Database

The project uses **SQLite** with **Drizzle ORM**.

### `users`

| Column              | Type    | Constraints                  | Description                               |
| ------------------- | ------- | ---------------------------- | ----------------------------------------- |
| `id`                | TEXT    | PRIMARY KEY                  | UUID, auto-generated                      |
| `telegram_id`       | INTEGER | UNIQUE, NULLABLE             | Telegram user ID                          |
| `google_id`         | TEXT    | UNIQUE, NULLABLE             | Google user ID (`sub`)                    |
| `email`             | TEXT    | NULLABLE                     | User email address                        |
| `first_name`        | TEXT    | NOT NULL                     | First name                                |
| `last_name`         | TEXT    | NULLABLE                     | Last name                                 |
| `username`          | TEXT    | NULLABLE                     | Telegram username or email alias          |
| `photo_url`         | TEXT    | NULLABLE                     | Profile picture avatar URL                |
| `additional_fields` | TEXT    | DEFAULT `'{}'`               | JSON payload for arbitrary user metadata  |
| `created_at`        | TEXT    | DEFAULT `datetime('now')`    | ISO creation timestamp                    |
| `updated_at`        | TEXT    | DEFAULT `datetime('now')`    | ISO update timestamp                      |

### `refresh_tokens`

| Column        | Type    | Constraints                             | Description                     |
| ------------- | ------- | --------------------------------------- | ------------------------------- |
| `id`          | TEXT    | PRIMARY KEY                             | UUID, auto-generated            |
| `user_id`     | TEXT    | FOREIGN KEY (`users.id` ON DELETE CASCADE) | Owner user ID                |
| `token`       | TEXT    | UNIQUE, NOT NULL                        | UUID refresh token string       |
| `expires_at`  | TEXT    | NOT NULL                                | Expiration datetime (ISO string)|
| `created_at`  | TEXT    | DEFAULT `datetime('now')`               | Creation datetime (ISO string)  |

### Database Commands

```bash
npm run db:generate   # Generate SQL migrations based on schema.ts
npm run db:migrate    # Run pending migrations
npm run db:studio     # Launch Drizzle Studio web interface
```

---

## ⏰ Scheduled Tasks

The service includes an automated background scheduler using `node-cron`:
- **Expired Token Cleanup**: Runs daily at `04:00 AM` in the timezone specified by `CRON_TIMEZONE` (default: `Asia/Bishkek`). Removes all expired refresh tokens from the `refresh_tokens` table.
- Automatically and gracefully terminates when Fastify shuts down.

---

## 📜 Scripts

| Script        | Command                                                                                  | Description                                           |
| ------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `dev`         | `tsx watch src/server.ts`                                                                | Start development server with live reload             |
| `build`       | `tsc && rm -rf dist/public && cp -r src/public dist/public`                              | Compile TypeScript and copy static UI assets to `dist/`|
| `start`       | `node dist/server.js`                                                                    | Start production server                               |
| `start:prod`  | `pm2 start dist/server.js --name chalysh_auth --interpreter <node_path>`                  | Start production process managed by PM2               |
| `db:generate` | `drizzle-kit generate`                                                                   | Generate migration files from schema                  |
| `db:migrate`  | `tsx src/db/migrate.ts`                                                                  | Apply database migrations                             |
| `db:studio`   | `drizzle-kit studio`                                                                     | Open Drizzle Studio visual database editor            |

---

## 📄 License

ISC

---
---

# 🇷🇺 Русская версия

# 🔐 ChalyshAuth

> Глобальный микросервис аутентификации через Telegram Login и Google OAuth, построенный на Fastify, TypeScript и SQLite.

---

## 📖 Оглавление

- [Возможности](#-возможности)
- [Стек технологий](#-стек-технологий)
- [Структура проекта](#-структура-проекта)
- [Быстрый старт](#-быстрый-старт)
- [Переменные окружения](#-переменные-окружения)
- [API](#-api)
- [Панель администратора](#-панель-администратора)
- [База данных](#-база-данных)
- [Фоновые задачи (Cron)](#-фоновые-задачи-cron)
- [Скрипты](#-скрипты)
- [Лицензия](#-лицензия)

---

## ✨ Возможности

- **Вход через Telegram** — аутентификация через Telegram Login Widget с проверкой цифровой подписи HMAC-SHA256
- **Google OAuth2** — вход через учетную запись Google с валидацией Google ID Token
- **JWT-токены** — выдача связки access и refresh токенов с настраиваемым временем жизни
- **Проверка токена** — быстрый эндпоинт `GET <BASE_URL>/auth/verify` для валидации токена без нагрузки на базу данных
- **Ротация refresh-токенов** — автоматическая замена refresh-токена при каждом обновлении для защиты от повторного использования
- **Автоматическая очистка** — встроенный ежедневный cron-планировщик для удаления просроченных refresh-токенов
- **Профили пользователей** — единые учетные записи с поддержкой Telegram, Google и объединения данных
- **Дополнительные поля** — гибкое JSON-хранилище для произвольных пользовательских данных (рекорды в играх, настройки и т.д.)
- **Таблица лидеров** — готовый эндпоинт для получения рейтинга игроков по очкам
- **Панель администратора** — встроенный веб-интерфейс (`/admin`) со входом через Telegram и Google, статистикой, поиском, фильтрацией и редактированием пользователей
- **Swagger / OpenAPI** — интерактивная документация API, доступная по адресу `<BASE_URL>/docs`
- **Публичные страницы** — статические страницы Политики конфиденциальности и Условий использования
- **Валидация** — строгая валидация входящих и исходящих данных на базе схем Zod
- **SQLite** — быстрая локальная база данных без необходимости отдельной настройки на `better-sqlite3` + Drizzle ORM
- **CORS** — встроенная настройка кросс-доменных запросов
- **Health Check** — эндпоинт проверки работоспособности сервиса `GET <BASE_URL>/health`

---

## 🛠 Стек технологий

| Слой            | Технология                                                       |
| --------------- | ---------------------------------------------------------------- |
| Среда           | Node.js 24 (см. `.nvmrc`)                                        |
| Язык            | TypeScript (strict mode)                                         |
| Фреймворк       | Fastify 5                                                        |
| База данных      | SQLite через `better-sqlite3`                                    |
| ORM             | Drizzle ORM                                                      |
| Валидация        | Zod + `fastify-type-provider-zod`                                |
| Аутентификация   | `@fastify/jwt`, Telegram Login Widget, Google OAuth2 ID Tokens    |
| Документация    | `@fastify/swagger`, `@fastify/swagger-ui` (OpenAPI 3.1)           |
| Планировщик     | `node-cron`                                                      |
| Логирование      | Pino (`pino-pretty`)                                             |

---

## 📁 Структура проекта

```
ChalyshAuth/
├── src/
│   ├── server.ts              # Точка входа — загрузка env, БД, запуск Fastify
│   ├── app.ts                 # Сборка приложения — плагины, маршруты, статика, ошибки
│   ├── config/
│   │   └── env.ts             # Конфигурация окружения (Zod) и проверка email админов
│   ├── db/
│   │   ├── connection.ts      # Подключение к SQLite
│   │   ├── migrate.ts         # Запуск миграций Drizzle
│   │   └── schema.ts          # Схема БД (users, refresh_tokens)
│   ├── modules/
│   │   ├── admin/
│   │   │   ├── admin.guard.ts     # Guard проверки прав администратора
│   │   │   ├── admin.routes.ts    # Маршруты админ-панели и управления пользователями
│   │   │   ├── admin.schemas.ts   # Zod-схемы для админ-панели
│   │   │   └── admin.service.ts   # Статистика и CRUD-операции администратора
│   │   ├── auth/
│   │   │   ├── auth.routes.ts     # Маршруты аутентификации (Telegram, Google, токены)
│   │   │   ├── auth.schemas.ts    # Zod-схемы для аутентификации
│   │   │   ├── auth.service.ts    # Бизнес-логика входа и upsert пользователей
│   │   │   ├── google.service.ts  # Валидация Google ID Token
│   │   │   ├── telegram.service.ts# Проверка HMAC-SHA256 подписи Telegram
│   │   │   └── token.service.ts   # Генерация, ротация и очистка токенов
│   │   └── user/
│   │       ├── user.routes.ts     # Профиль пользователя, additionalFields и лидерборд
│   │       ├── user.schemas.ts    # Zod-схемы пользователя
│   │       └── user.service.ts    # Логика работы с профилем и таблицей лидеров
│   ├── plugins/
│   │   ├── cors.plugin.ts     # Настройка CORS
│   │   ├── cron.plugin.ts     # Планировщик очистки устаревших токенов
│   │   ├── jwt.plugin.ts      # Настройка JWT плагина
│   │   └── swagger.plugin.ts  # Интеграция Swagger UI
│   └── public/
│       ├── admin.html         # Одностраничное приложение админ-панели
│       ├── privacy-policy.html# HTML-страница политики конфиденциальности
│       └── terms-of-service.html # HTML-страница условий обслуживания
├── drizzle/                   # Автогенерированные миграции БД
├── drizzle.config.ts          # Конфигурация Drizzle Kit
├── tsconfig.json
├── package.json
├── .env.example
└── README.md
```

---

## 🚀 Быстрый старт

### Предварительные требования

- **Node.js** ≥ 24 (см. `.nvmrc`)
- **npm**

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/your-username/ChalyshAuth.git
cd ChalyshAuth

# Выбрать нужную версию Node.js
nvm use

# Установить зависимости
npm install

# Создать конфигурационный файл .env на основе примера
cp .env.example .env
```

### Запуск миграций базы данных

```bash
npm run db:generate   # Сгенерировать файлы миграций
npm run db:migrate    # Применить миграции к SQLite
```

### Запуск в режиме разработки

```bash
npm run dev
```

Сервер запустится на `http://localhost:3000` (или на указанном в `PORT`).

### Сборка и запуск в продакшене

```bash
# Компиляция TypeScript и копирование статики в dist/
npm run build

# Запуск скомпилированного приложения
npm start

# Или запуск через PM2
npm run start:prod
```

---

## 🔧 Переменные окружения

Создайте файл `.env` на основе `.env.example`:

| Переменная                 | Описание                                                      | По умолчанию             |
| -------------------------- | ------------------------------------------------------------- | ------------------------ |
| `DATABASE_PATH`            | Путь к файлу базы данных SQLite                               | `./data/chalysh_auth.db` |
| `TELEGRAM_BOT_TOKEN`       | Токен бота от [@BotFather](https://t.me/BotFather)            | `""`                     |
| `GOOGLE_CLIENT_ID`         | Google OAuth2 Client ID для входа через Google                | `""`                     |
| `JWT_SECRET`               | Секретный ключ для подписи JWT                                | *обязательно* (мин. 16) |
| `ACCESS_TOKEN_EXPIRES_IN`  | Время жизни access-токена (например, `15m`, `1h`)             | `15m`                    |
| `REFRESH_TOKEN_EXPIRES_IN` | Время жизни refresh-токена (например, `30d`, `7d`)            | `30d`                    |
| `PORT`                     | Порт HTTP-сервера                                             | `3000`                   |
| `BASE_URL`                 | Префикс для всех маршрутов API                                | `/api`                   |
| `ADMIN_EMAILS`             | Список email администраторов через запятую                    | `null@gmail.com`         |
| `ADMIN_TELEGRAM_USERNAMES` | Список юзернеймов Telegram администраторов через запятую      | `""`                     |
| `TELEGRAM_BOT_USERNAME`    | Юзернейм бота без @ для Telegram Login Widget                 | `""` (автоопределение)   |
| `CRON_TIMEZONE`            | Часовой пояс для задач cron (очистка токенов)                 | `Asia/Bishkek`           |

---

## 📡 API

> **Примечание:** Все роуты API монтируются под настраиваемым префиксом `BASE_URL` (по умолчанию `/api`, в `.env.example`: `/auth/api`). В примерах ниже используется `/api`.

### Интерактивная документация Swagger

Интерактивный Swagger UI доступен по адресу:
```
http://localhost:3000/api/docs
```
*(Замените `/api` на ваш префикс `BASE_URL`)*

---

### Общие и статические эндпоинты

| Метод | Эндпоинт                    | Авторизация | Описание                             |
| ----- | --------------------------- | ----------- | ------------------------------------ |
| GET   | `/api/health`               | ✗           | Проверка работоспособности           |
| GET   | `/api/docs`                 | ✗           | Swagger / OpenAPI UI                 |
| GET   | `/admin` или `/api/admin`   | ✗           | Веб-панель администратора            |
| GET   | `/api/privacy-policy`       | ✗           | Политика конфиденциальности (HTML)   |
| GET   | `/api/terms-of-service`     | ✗           | Условия использования (HTML)         |

#### `GET /api/health`

**Ответ `200`:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-14T04:00:00.000Z"
}
```

---

### Аутентификация (`/api/auth`)

| Метод | Эндпоинт              | Авторизация | Описание                                        |
| ----- | --------------------- | ----------- | ----------------------------------------------- |
| GET   | `/api/auth/verify`    | 🔒          | Проверка валидности access-токена               |
| POST  | `/api/auth/telegram`  | ✗           | Вход или регистрация через Telegram             |
| POST  | `/api/auth/google`    | ✗           | Вход или регистрация через Google ID token      |
| POST  | `/api/auth/refresh`   | ✗           | Ротация и получение новой пары токенов          |
| POST  | `/api/auth/logout`    | ✗           | Отзыв refresh-токена                            |

#### `GET /api/auth/verify`  🔒 *Требуется Bearer-токен*

Быстро проверяет подпись и срок действия access-токена без обращения к базе данных.

**Заголовок:**
```http
Authorization: Bearer <accessToken>
```

**Ответ `200`:**
```json
{
  "valid": true,
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

#### `POST /api/auth/telegram`

**Тело запроса:**
```json
{
  "id": 123456789,
  "first_name": "Иван",
  "last_name": "Иванов",
  "username": "ivanov",
  "photo_url": "https://t.me/i/userpic/...",
  "auth_date": 1700000000,
  "hash": "d147...telegram_hmac_hash"
}
```

**Ответ `200`:**
```json
{
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "telegramId": "123456789",
    "googleId": null,
    "email": null,
    "firstName": "Иван",
    "lastName": "Иванов",
    "username": "ivanov",
    "photoUrl": "https://t.me/i/userpic/...",
    "additionalFields": {},
    "createdAt": "2026-09-14T04:00:00.000Z",
    "updatedAt": "2026-09-14T04:00:00.000Z"
  },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "c928cf69-1234-4567-89ab-cdef01234567"
}
```

#### `POST /api/auth/google`

**Тело запроса:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Ответ `200`:**
```json
{
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "telegramId": null,
    "googleId": "109876543210987654321",
    "email": "user@gmail.com",
    "firstName": "Иван",
    "lastName": "Иванов",
    "username": "user",
    "photoUrl": "https://lh3.googleusercontent.com/...",
    "additionalFields": {},
    "createdAt": "2026-09-14T04:00:00.000Z",
    "updatedAt": "2026-09-14T04:00:00.000Z"
  },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "c928cf69-1234-4567-89ab-cdef01234567"
}
```

#### `POST /api/auth/refresh`

Выполняет ротацию токена: отзывает переданный refresh-токен и выпускает новую пару access и refresh токенов.

**Тело запроса:**
```json
{
  "refreshToken": "c928cf69-1234-4567-89ab-cdef01234567"
}
```

**Ответ `200`:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "d821ae54-5678-4321-98ba-fedcba987654"
}
```

#### `POST /api/auth/logout`

Удаляет указанный refresh-токен из базы данных.

**Тело запроса:**
```json
{
  "refreshToken": "d821ae54-5678-4321-98ba-fedcba987654"
}
```

**Ответ `200`:**
```json
{
  "message": "Logged out successfully"
}
```

---

### Профиль пользователя (`/api/user`)  🔒 *Требуется Bearer-токен*

| Метод  | Эндпоинт                    | Описание                                            |
| ------ | --------------------------- | --------------------------------------------------- |
| GET    | `/api/user/me`              | Получить профиль текущего пользователя              |
| GET    | `/api/user/me/fields`       | Получить только `additionalFields`                  |
| PATCH  | `/api/user/me/fields`       | Объединить (merge) JSON-данные в `additionalFields` |
| DELETE | `/api/user/me/fields/:key`  | Удалить ключ верхнего уровня из `additionalFields`  |
| GET    | `/api/user/leaderboard`     | Получить топ-10 пользователей по рекорду очков      |

#### `GET /api/user/me`

**Ответ `200`:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "telegramId": "123456789",
  "googleId": null,
  "email": null,
  "firstName": "Иван",
  "lastName": "Иванов",
  "username": "ivanov",
  "photoUrl": "https://t.me/...",
  "additionalFields": {
    "spaceShooterGame": {
      "bestScore": 1450,
      "level": 7
    }
  },
  "createdAt": "2026-09-14T04:00:00.000Z",
  "updatedAt": "2026-09-14T04:00:00.000Z"
}
```

#### `PATCH /api/user/me/fields`

**Тело запроса:**
```json
{
  "spaceShooterGame": {
    "bestScore": 1800,
    "level": 8
  },
  "preferences": {
    "theme": "dark"
  }
}
```

**Ответ `200`:**
```json
{
  "additionalFields": {
    "spaceShooterGame": {
      "bestScore": 1800,
      "level": 8
    },
    "preferences": {
      "theme": "dark"
    }
  }
}
```

#### `DELETE /api/user/me/fields/:key`

Удаляет ключ `:key` из корня `additionalFields`.

**Ответ `200`:**
```json
{
  "additionalFields": {
    "preferences": {
      "theme": "dark"
    }
  }
}
```

#### `GET /api/user/leaderboard`

Возвращает топ-10 игроков по значению `additionalFields.spaceShooterGame.bestScore`.

**Ответ `200`:**
```json
{
  "leaderboard": [
    {
      "username": "ace_pilot",
      "firstName": "Алексей",
      "bestScore": 3200
    },
    {
      "username": "ivanov",
      "firstName": "Иван",
      "bestScore": 1800
    }
  ]
}
```

---

## 🛡 Панель администратора

Сервис содержит встроенный веб-интерфейс администратора, доступный по адресу `/admin` (или `<BASE_URL>/admin`). Интерфейс позволяет авторизованным администраторам просматривать системную статистику, список пользователей, фильтровать по провайдеру (Telegram / Google), выполнять поиск, редактировать профиль и поле `additionalFields`, а также удалять пользователей.

Доступ к панели администрирования ограничен списками разрешенных адресов `ADMIN_EMAILS` и юзернеймов Telegram `ADMIN_TELEGRAM_USERNAMES`.

> [!NOTE]
> **Юзернеймы Telegram**: Укажите Telegram-юзернеймы администраторов (с `@` или без него) в переменной `ADMIN_TELEGRAM_USERNAMES` через запятую (например, `chalysh,myadmin`). Обратите внимание, что пользователи могут изменять свои юзернеймы в Telegram.

### API администратора (`/api/admin`)

| Метод  | Эндпоинт                    | Авторизация      | Описание                                                      |
| ------ | --------------------------- | ---------------- | ------------------------------------------------------------- |
| GET    | `/api/admin/config`         | ✗                | Возвращает `{ googleClientId, telegramBotUsername }` для входа|
| POST   | `/api/admin/auth/telegram`  | ✗                | Вход администратора через Telegram Login Widget (проверка прав)|
| POST   | `/api/admin/auth/google`    | ✗                | Вход администратора по Google ID токену (проверка по списку)  |
| GET    | `/api/admin/me`           | 🔒 Admin Bearer  | Проверка прав и получение профиля текущего администратора     |
| GET    | `/api/admin/stats`        | 🔒 Admin Bearer  | Общее число пользователей, Telegram/Google, активные токены   |
| GET    | `/api/admin/users`        | 🔒 Admin Bearer  | Список пользователей с пагинацией, поиском и фильтрацией      |
| GET    | `/api/admin/users/:id`    | 🔒 Admin Bearer  | Детальный профиль пользователя по UUID                        |
| PATCH  | `/api/admin/users/:id`    | 🔒 Admin Bearer  | Редактирование данных пользователя и/или `additionalFields`   |
| DELETE | `/api/admin/users/:id`    | 🔒 Admin Bearer  | Удаление пользователя и всех связанных токенов                |

#### `GET /api/admin/stats`

**Ответ `200`:**
```json
{
  "totalUsers": 120,
  "telegramUsers": 95,
  "googleUsers": 25,
  "activeRefreshTokens": 110
}
```

#### `GET /api/admin/users`

**Параметры строки запроса:**
- `page` (число, по умолчанию `1`)
- `limit` (число, по умолчанию `20`, макс `100`)
- `search` (строка, опционально — поиск по ID, email, username, имени, фамилии, telegramId, googleId)
- `provider` (`"all"` | `"telegram"` | `"google"`, по умолчанию `"all"`)
- `sortBy` (`"createdAt"` | `"updatedAt"` | `"firstName"` | `"username"` | `"email"`, по умолчанию `"createdAt"`)
- `sortOrder` (`"asc"` | `"desc"`, по умолчанию `"desc"`)

---

## 🗄 База данных

Проект использует **SQLite** с **Drizzle ORM**.

### `users`

| Столбец             | Тип     | Ограничения                  | Описание                                  |
| ------------------- | ------- | ---------------------------- | ----------------------------------------- |
| `id`                | TEXT    | PRIMARY KEY                  | UUID, генерируется автоматически          |
| `telegram_id`       | INTEGER | UNIQUE, NULLABLE             | ID пользователя в Telegram                |
| `google_id`         | TEXT    | UNIQUE, NULLABLE             | ID пользователя в Google (`sub`)          |
| `email`             | TEXT    | NULLABLE                     | Адрес электронной почты                   |
| `first_name`        | TEXT    | NOT NULL                     | Имя                                       |
| `last_name`         | TEXT    | NULLABLE                     | Фамилия                                   |
| `username`          | TEXT    | NULLABLE                     | Никнейм в Telegram или логин email        |
| `photo_url`         | TEXT    | NULLABLE                     | Ссылка на аватарку профиля                |
| `additional_fields` | TEXT    | DEFAULT `'{}'`               | JSON для произвольных метаданных          |
| `created_at`        | TEXT    | DEFAULT `datetime('now')`    | Время создания (ISO-строка)               |
| `updated_at`        | TEXT    | DEFAULT `datetime('now')`    | Время обновления (ISO-строка)             |

### `refresh_tokens`

| Столбец       | Тип     | Ограничения                             | Описание                       |
| ------------- | ------- | --------------------------------------- | ------------------------------ |
| `id`          | TEXT    | PRIMARY KEY                             | UUID, генерируется автоматически |
| `user_id`     | TEXT    | FOREIGN KEY (`users.id` ON DELETE CASCADE) | ID владельца токена          |
| `token`       | TEXT    | UNIQUE, NOT NULL                        | UUID-строка токена             |
| `expires_at`  | TEXT    | NOT NULL                                | Дата и время истечения токена  |
| `created_at`  | TEXT    | DEFAULT `datetime('now')`               | Время создания (ISO-строка)    |

### Команды базы данных

```bash
npm run db:generate   # Сгенерировать миграции на основе изменений schema.ts
npm run db:migrate    # Применить миграции к базе данных
npm run db:studio     # Запустить визуальный браузер Drizzle Studio
```

---

## ⏰ Фоновые задачи (Cron)

В сервисе настроен автоматический планировщик фоновых задач с использованием `node-cron`:
- **Очистка просроченных токенов**: Запускается ежедневно в `04:00` утра в часовом поясе, указанном в `CRON_TIMEZONE` (по умолчанию: `Asia/Bishkek`). Удаляет все просроченные refresh-токены из таблицы `refresh_tokens`.
- Автоматически и корректно останавливается при завершении работы приложения Fastify.

---

## 📜 Скрипты

| Скрипт        | Команда                                                                                  | Описание                                                  |
| ------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `dev`         | `tsx watch src/server.ts`                                                                | Запуск dev-сервера с автоматической перезагрузкой         |
| `build`       | `tsc && rm -rf dist/public && cp -r src/public dist/public`                              | Компиляция TypeScript и копирование статики в `dist/`     |
| `start`       | `node dist/server.js`                                                                    | Запуск скомпилированного сервера                          |
| `start:prod`  | `pm2 start dist/server.js --name chalysh_auth --interpreter <node_path>`                  | Запуск и управление процессом через PM2                   |
| `db:generate` | `drizzle-kit generate`                                                                   | Генерация файлов миграций                                 |
| `db:migrate`  | `tsx src/db/migrate.ts`                                                                  | Применение миграций БД                                    |
| `db:studio`   | `drizzle-kit studio`                                                                     | Открытие визуальной панели Drizzle Studio                 |

---

## 📄 Лицензия

ISC
