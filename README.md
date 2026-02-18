# 🔐 ChalyshAuth

> Global authentication microservice powered by Telegram Login, built with Fastify, TypeScript, and SQLite.

---

## 📖 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Database](#-database)
- [Scripts](#-scripts)
- [License](#-license)
- [🇷🇺 Русская версия](#-русская-версия)

---

## ✨ Features

- **Telegram Login** — authenticate users via Telegram Login Widget with HMAC-SHA256 verification
- **JWT Tokens** — issue access & refresh token pairs with configurable expiration
- **Token Refresh** — seamlessly rotate tokens without re-authentication
- **User Profiles** — store Telegram profile data with full CRUD support
- **Additional Fields** — flexible JSON storage for arbitrary per-user data (e.g. game scores, preferences)
- **Input Validation** — strict request/response validation via Zod schemas
- **SQLite** — lightweight, zero-config database powered by `better-sqlite3` + Drizzle ORM
- **CORS** — configurable cross-origin support out of the box
- **Health Check** — built-in `GET /api/health` endpoint

---

## 🛠 Tech Stack

| Layer         | Technology                                                        |
| ------------- | ----------------------------------------------------------------- |
| Runtime       | Node.js 24                                                        |
| Language      | TypeScript (ES2024, strict mode)                                  |
| Framework     | Fastify 5                                                         |
| Database      | SQLite via `better-sqlite3`                                       |
| ORM           | Drizzle ORM                                                       |
| Validation    | Zod + `fastify-type-provider-zod`                                 |
| Auth          | `@fastify/jwt`, Telegram Login Widget                             |
| Logging       | Pino (`pino-pretty`)                                              |

---

## 📁 Project Structure

```
ChalyshAuth/
├── src/
│   ├── server.ts              # Entry point — loads env, DB, starts Fastify
│   ├── app.ts                 # App builder — plugins, routes, error handler
│   ├── config/
│   │   └── env.ts             # Zod-validated environment config
│   ├── db/
│   │   ├── connection.ts      # SQLite connection setup
│   │   ├── migrate.ts         # Drizzle migration runner
│   │   └── schema.ts          # Database schema (users, refresh_tokens)
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts       # Auth endpoints
│   │   │   ├── auth.schemas.ts      # Zod schemas for auth
│   │   │   ├── auth.service.ts      # Auth business logic
│   │   │   ├── telegram.service.ts  # Telegram data verification
│   │   │   └── token.service.ts     # JWT generation & management
│   │   └── user/
│   │       ├── user.routes.ts       # User endpoints
│   │       ├── user.schemas.ts      # Zod schemas for user
│   │       └── user.service.ts      # User business logic
│   └── plugins/
│       ├── cors.plugin.ts     # CORS configuration
│       └── jwt.plugin.ts      # JWT plugin setup
├── drizzle.config.ts          # Drizzle Kit configuration
├── tsconfig.json
├── package.json
└── .env.example
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

# Copy environment file and fill in your values
cp .env.example .env
```

### Run Database Migrations

```bash
npm run db:generate   # Generate migration files
npm run db:migrate    # Apply migrations to SQLite
```

### Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured `PORT`).

### Production Build

```bash
npm run build
npm start
```

---

## 🔧 Environment Variables

Create a `.env` file based on `.env.example`:

| Variable                  | Description                     | Default                     |
| ------------------------- | ------------------------------- | --------------------------- |
| `DATABASE_PATH`           | Path to SQLite database file    | `./data/chalysh_auth.db`    |
| `TELEGRAM_BOT_TOKEN`      | Bot token from @BotFather       | *required*                  |
| `JWT_SECRET`              | Secret key for signing JWTs     | *required* (min 16 chars)   |
| `ACCESS_TOKEN_EXPIRES_IN` | Access token lifetime           | `15m`                       |
| `REFRESH_TOKEN_EXPIRES_IN`| Refresh token lifetime          | `30d`                       |
| `PORT`                    | HTTP server port                | `3000`                      |

---

## 📡 API Reference

### Health Check

| Method | Endpoint       | Auth | Description          |
| ------ | -------------- | ---- | -------------------- |
| GET    | `/api/health`  | ✗    | Service health check |

**Response:**
```json
{ "status": "ok", "timestamp": "2026-02-17T10:00:00.000Z" }
```

---

### Authentication

| Method | Endpoint              | Auth | Description                                |
| ------ | --------------------- | ---- | ------------------------------------------ |
| POST   | `/api/auth/telegram`  | ✗    | Login or register via Telegram Login Widget |
| POST   | `/api/auth/refresh`   | ✗    | Refresh access/refresh token pair          |
| POST   | `/api/auth/logout`    | ✗    | Revoke a refresh token                     |

#### `POST /api/auth/telegram`

**Body:**
```json
{
  "id": 123456789,
  "first_name": "John",
  "last_name": "Doe",
  "username": "johndoe",
  "photo_url": "https://t.me/...",
  "auth_date": 1700000000,
  "hash": "abc123..."
}
```

**Response `200`:**
```json
{
  "user": {
    "id": "uuid",
    "telegramId": "123456789",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "photoUrl": "https://t.me/...",
    "additionalFields": {},
    "createdAt": "2026-02-17T10:00:00.000Z",
    "updatedAt": "2026-02-17T10:00:00.000Z"
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

#### `POST /api/auth/refresh`

**Body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response `200`:**
```json
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

#### `POST /api/auth/logout`

**Body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response `200`:**
```json
{ "message": "Logged out successfully" }
```

---

### User Profile  🔒 *Requires Bearer token*

| Method | Endpoint                    | Description                                  |
| ------ | --------------------------- | -------------------------------------------- |
| GET    | `/api/user/me`              | Get current user profile                     |
| GET    | `/api/user/me/fields`       | Get `additionalFields` only                  |
| PATCH  | `/api/user/me/fields`       | Merge data into `additionalFields`           |
| DELETE | `/api/user/me/fields/:key`  | Remove a top-level key from `additionalFields` |

#### `PATCH /api/user/me/fields`

**Body (example):**
```json
{ "shootingStarsGame": { "score": 200, "level": 5 } }
```

**Response `200`:**
```json
{ "additionalFields": { "shootingStarsGame": { "score": 200, "level": 5 } } }
```

---

## 🗄 Database

The project uses **SQLite** with **Drizzle ORM**. The schema defines two tables:

### `users`

| Column             | Type    | Notes                          |
| ------------------ | ------- | ------------------------------ |
| `id`               | TEXT PK | UUID, auto-generated           |
| `telegram_id`      | INTEGER | Unique, not null               |
| `first_name`       | TEXT    | Not null                       |
| `last_name`        | TEXT    | Nullable                       |
| `username`         | TEXT    | Nullable                       |
| `photo_url`        | TEXT    | Nullable                       |
| `additional_fields`| TEXT    | JSON, default `{}`             |
| `created_at`       | TEXT    | Auto-set to current datetime   |
| `updated_at`       | TEXT    | Auto-set to current datetime   |

### `refresh_tokens`

| Column        | Type    | Notes                                  |
| ------------- | ------- | -------------------------------------- |
| `id`          | TEXT PK | UUID, auto-generated                   |
| `user_id`     | TEXT FK | References `users.id`, cascade delete  |
| `token`       | TEXT    | Unique, not null                       |
| `expires_at`  | TEXT    | Not null                               |
| `created_at`  | TEXT    | Auto-set to current datetime           |

### Database Management

```bash
npm run db:generate   # Generate migration SQL from schema changes
npm run db:migrate    # Apply pending migrations
npm run db:studio     # Open Drizzle Studio (visual DB browser)
```

---

## 📜 Scripts

| Script           | Command                      | Description                        |
| ---------------- | ---------------------------- | ---------------------------------- |
| `dev`            | `tsx watch src/server.ts`    | Start dev server with hot reload   |
| `build`          | `tsc`                        | Compile TypeScript to `dist/`      |
| `start`          | `node dist/server.js`        | Run production build               |
| `db:generate`    | `drizzle-kit generate`       | Generate DB migrations             |
| `db:migrate`     | `tsx src/db/migrate.ts`      | Apply DB migrations                |
| `db:studio`      | `drizzle-kit studio`         | Open Drizzle Studio                |

---

## 📄 License

ISC

---
---

# 🇷🇺 Русская версия

# 🔐 ChalyshAuth

> Глобальный микросервис аутентификации через Telegram Login, построенный на Fastify, TypeScript и SQLite.

---

## 📖 Оглавление

- [Возможности](#-возможности)
- [Стек технологий](#-стек-технологий)
- [Структура проекта](#-структура-проекта)
- [Быстрый старт](#-быстрый-старт)
- [Переменные окружения](#-переменные-окружения)
- [API](#-api)
- [База данных](#-база-данных)
- [Скрипты](#-скрипты)
- [Лицензия](#-лицензия)

---

## ✨ Возможности

- **Вход через Telegram** — аутентификация через Telegram Login Widget с проверкой HMAC-SHA256
- **JWT-токены** — выдача пар access/refresh токенов с настраиваемым временем жизни
- **Обновление токенов** — бесшовная ротация токенов без повторной аутентификации
- **Профили пользователей** — хранение данных из Telegram с полной поддержкой CRUD
- **Дополнительные поля** — гибкое JSON-хранилище для произвольных пользовательских данных (например, игровые очки, настройки)
- **Валидация** — строгая валидация запросов/ответов через Zod-схемы
- **SQLite** — лёгкая база данных без конфигурации на `better-sqlite3` + Drizzle ORM
- **CORS** — настраиваемая поддержка кросс-доменных запросов
- **Health Check** — встроенная проверка работоспособности `GET /api/health`

---

## 🛠 Стек технологий

| Слой            | Технология                                                       |
| --------------- | ---------------------------------------------------------------- |
| Среда           | Node.js 24                                                       |
| Язык            | TypeScript (ES2024, strict mode)                                 |
| Фреймворк       | Fastify 5                                                        |
| База данных      | SQLite через `better-sqlite3`                                    |
| ORM             | Drizzle ORM                                                      |
| Валидация        | Zod + `fastify-type-provider-zod`                                |
| Аутентификация   | `@fastify/jwt`, Telegram Login Widget                            |
| Логирование      | Pino (`pino-pretty`)                                             |

---

## 📁 Структура проекта

```
ChalyshAuth/
├── src/
│   ├── server.ts              # Точка входа — загрузка env, БД, запуск Fastify
│   ├── app.ts                 # Сборка приложения — плагины, маршруты, обработка ошибок
│   ├── config/
│   │   └── env.ts             # Конфигурация окружения с валидацией Zod
│   ├── db/
│   │   ├── connection.ts      # Подключение к SQLite
│   │   ├── migrate.ts         # Запуск миграций Drizzle
│   │   └── schema.ts          # Схема БД (users, refresh_tokens)
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts       # Эндпоинты аутентификации
│   │   │   ├── auth.schemas.ts      # Zod-схемы для аутентификации
│   │   │   ├── auth.service.ts      # Бизнес-логика аутентификации
│   │   │   ├── telegram.service.ts  # Верификация данных Telegram
│   │   │   └── token.service.ts     # Генерация и управление JWT
│   │   └── user/
│   │       ├── user.routes.ts       # Эндпоинты пользователя
│   │       ├── user.schemas.ts      # Zod-схемы для пользователя
│   │       └── user.service.ts      # Бизнес-логика пользователя
│   └── plugins/
│       ├── cors.plugin.ts     # Настройка CORS
│       └── jwt.plugin.ts      # Настройка JWT-плагина
├── drizzle.config.ts          # Конфигурация Drizzle Kit
├── tsconfig.json
├── package.json
└── .env.example
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

# Использовать нужную версию Node
nvm use

# Установить зависимости
npm install

# Скопировать пример конфигурации и заполнить значения
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

Сервер запустится на `http://localhost:3000` (или на порту, указанном в `PORT`).

### Сборка для продакшена

```bash
npm run build
npm start
```

---

## 🔧 Переменные окружения

Создайте файл `.env` на основе `.env.example`:

| Переменная                 | Описание                              | По умолчанию                |
| -------------------------- | ------------------------------------- | --------------------------- |
| `DATABASE_PATH`            | Путь к файлу базы данных SQLite       | `./data/chalysh_auth.db`    |
| `TELEGRAM_BOT_TOKEN`       | Токен бота от @BotFather              | *обязательно*               |
| `JWT_SECRET`               | Секретный ключ для подписи JWT        | *обязательно* (мин. 16 символов) |
| `ACCESS_TOKEN_EXPIRES_IN`  | Время жизни access-токена             | `15m`                       |
| `REFRESH_TOKEN_EXPIRES_IN` | Время жизни refresh-токена            | `30d`                       |
| `PORT`                     | Порт HTTP-сервера                     | `3000`                      |

---

## 📡 API

### Проверка работоспособности

| Метод | Эндпоинт       | Авторизация | Описание                     |
| ----- | -------------- | ----------- | ---------------------------- |
| GET   | `/api/health`  | ✗           | Проверка состояния сервиса   |

**Ответ:**
```json
{ "status": "ok", "timestamp": "2026-02-17T10:00:00.000Z" }
```

---

### Аутентификация

| Метод | Эндпоинт              | Авторизация | Описание                                    |
| ----- | --------------------- | ----------- | ------------------------------------------- |
| POST  | `/api/auth/telegram`  | ✗           | Вход или регистрация через Telegram         |
| POST  | `/api/auth/refresh`   | ✗           | Обновление пары access/refresh токенов      |
| POST  | `/api/auth/logout`    | ✗           | Отзыв refresh-токена                        |

#### `POST /api/auth/telegram`

**Тело запроса:**
```json
{
  "id": 123456789,
  "first_name": "Иван",
  "last_name": "Иванов",
  "username": "ivanov",
  "photo_url": "https://t.me/...",
  "auth_date": 1700000000,
  "hash": "abc123..."
}
```

**Ответ `200`:**
```json
{
  "user": {
    "id": "uuid",
    "telegramId": "123456789",
    "firstName": "Иван",
    "lastName": "Иванов",
    "username": "ivanov",
    "photoUrl": "https://t.me/...",
    "additionalFields": {},
    "createdAt": "2026-02-17T10:00:00.000Z",
    "updatedAt": "2026-02-17T10:00:00.000Z"
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

#### `POST /api/auth/refresh`

**Тело запроса:**
```json
{ "refreshToken": "eyJ..." }
```

**Ответ `200`:**
```json
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

#### `POST /api/auth/logout`

**Тело запроса:**
```json
{ "refreshToken": "eyJ..." }
```

**Ответ `200`:**
```json
{ "message": "Logged out successfully" }
```

---

### Профиль пользователя  🔒 *Требуется Bearer-токен*

| Метод  | Эндпоинт                    | Описание                                            |
| ------ | --------------------------- | --------------------------------------------------- |
| GET    | `/api/user/me`              | Получить профиль текущего пользователя              |
| GET    | `/api/user/me/fields`       | Получить только `additionalFields`                  |
| PATCH  | `/api/user/me/fields`       | Обновить (merge) данные в `additionalFields`        |
| DELETE | `/api/user/me/fields/:key`  | Удалить ключ верхнего уровня из `additionalFields`  |

#### `PATCH /api/user/me/fields`

**Тело запроса (пример):**
```json
{ "shootingStarsGame": { "score": 200, "level": 5 } }
```

**Ответ `200`:**
```json
{ "additionalFields": { "shootingStarsGame": { "score": 200, "level": 5 } } }
```

---

## 🗄 База данных

Проект использует **SQLite** с **Drizzle ORM**. Схема определяет две таблицы:

### `users`

| Столбец             | Тип     | Примечание                             |
| ------------------- | ------- | -------------------------------------- |
| `id`                | TEXT PK | UUID, генерируется автоматически       |
| `telegram_id`       | INTEGER | Уникальный, обязательный              |
| `first_name`        | TEXT    | Обязательный                          |
| `last_name`         | TEXT    | Необязательный                        |
| `username`          | TEXT    | Необязательный                        |
| `photo_url`         | TEXT    | Необязательный                        |
| `additional_fields` | TEXT    | JSON, по умолчанию `{}`               |
| `created_at`        | TEXT    | Устанавливается автоматически          |
| `updated_at`        | TEXT    | Устанавливается автоматически          |

### `refresh_tokens`

| Столбец       | Тип     | Примечание                                         |
| ------------- | ------- | -------------------------------------------------- |
| `id`          | TEXT PK | UUID, генерируется автоматически                   |
| `user_id`     | TEXT FK | Ссылка на `users.id`, каскадное удаление           |
| `token`       | TEXT    | Уникальный, обязательный                          |
| `expires_at`  | TEXT    | Обязательный                                      |
| `created_at`  | TEXT    | Устанавливается автоматически                      |

### Управление базой данных

```bash
npm run db:generate   # Сгенерировать SQL-миграции из изменений схемы
npm run db:migrate    # Применить миграции
npm run db:studio     # Открыть Drizzle Studio (визуальный браузер БД)
```

---

## 📜 Скрипты

| Скрипт           | Команда                      | Описание                                   |
| ---------------- | ---------------------------- | ------------------------------------------ |
| `dev`            | `tsx watch src/server.ts`    | Запуск dev-сервера с горячей перезагрузкой  |
| `build`          | `tsc`                        | Компиляция TypeScript в `dist/`            |
| `start`          | `node dist/server.js`        | Запуск продакшен-сборки                    |
| `db:generate`    | `drizzle-kit generate`       | Генерация миграций БД                      |
| `db:migrate`     | `tsx src/db/migrate.ts`      | Применение миграций БД                     |
| `db:studio`      | `drizzle-kit studio`         | Открытие Drizzle Studio                    |

---

## 📄 Лицензия

ISC
