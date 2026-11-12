# Zero-Waste E-commerce

[![Build and Test](https://github.com/lnghuy2301/Zero-Waste-Ecommerce/actions/workflows/ci.yml/badge.svg)](https://github.com/lnghuy2301/Zero-Waste-Ecommerce/actions/workflows/ci.yml)

**EcoStore** is a full-stack e-commerce platform for sustainable and reusable products. It brings together a Vietnamese storefront, an administration dashboard, inventory and order management, and EcoBot, a product support assistant.

![EcoStore](frontend/public/images/hero.svg)

## Features

- **Product catalog:** categories, search, price filters, product variants, stock levels, and scheduled promotions.
- **Customer accounts:** email/password authentication, optional Google sign-in, profiles, avatars, and password recovery.
- **Shopping cart and checkout:** server-side pricing, shipping fees, transactional stock updates, and order cancellation.
- **Order management:** purchase history, order details, status transitions, and inventory restoration.
- **Reviews:** ratings from customers with completed purchases, media attachments, and moderation tools.
- **Administration:** product, category, account, promotion, and order management, with sales and inventory charts.
- **EcoBot:** catalog and store policy search, optional Groq responses, and fallback answers when the AI service is unavailable.
- **Responsive interface:** customer and administration pages built with Vue and Tailwind CSS.

Checkout supports cash on delivery and simulated MoMo/PayPal flows. The payment simulations do not transfer money; live payment provider integration is not included.

## Technology Stack

| Component                | Technologies                                          |
| ------------------------ | ----------------------------------------------------- |
| Frontend                 | Vue 3, TypeScript, Vite, Vue Router, Tailwind CSS     |
| UI and visualization     | Chart.js, vue-easy-lightbox, vue-toastification       |
| API                      | NestJS 11, Passport, JWT, class-validator, Swagger    |
| Database                 | PostgreSQL 16, Prisma 5                               |
| Authentication and email | bcrypt, Google OAuth, Nodemailer                      |
| Chatbot                  | Python, Flask, Waitress, optional Groq API            |
| Tooling                  | Docker Compose, Jest, Python unittest, GitHub Actions |

## Project Structure

```text
Zero-Waste-Ecommerce/
├── backend/
│   ├── prisma/             Database schema, migrations, and seed
│   ├── src/                API modules, business logic, and repositories
│   └── test/               HTTP tests
├── frontend/
│   ├── public/images/      Product illustrations and website assets
│   └── src/
│       ├── components/     Shared interface components
│       ├── service/        API clients
│       ├── utils/          Media URLs, pricing, and notifications
│       └── views/          Storefront and administration pages
├── chatbot/
│   ├── api_chatbot.py      EcoBot service
│   └── data_txt/           Store policy content
├── data/                   Shared product catalog
├── docs/                   Architecture and development guides
├── scripts/                Environment, assets, and project utilities
└── docker-compose.yml      PostgreSQL and optional Mailpit
```

## Getting Started

### Prerequisites

- Node.js **20.19+ or 22.12+** and npm
- Python **3.10+**
- Docker with Docker Compose, or an existing PostgreSQL 16 instance

### 1. Clone the repository

```sh
git clone https://github.com/lnghuy2301/Zero-Waste-Ecommerce.git
cd Zero-Waste-Ecommerce
```

### 2. Install and configure

Run the following commands from the repository root:

```sh
npm run setup:env
npm run install:all
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
```

The environment setup script creates `.env` files for each service and generates a random JWT secret. Existing environment files are preserved. If you already have a `backend/.env`, check its database connection against [backend/.env.example](backend/.env.example).

The seed adds 18 products, 36 variants, 6 categories, sample accounts, orders, and reviews. It does not reset existing account passwords or overwrite existing catalog records. Use a separate development database for sample data.

### 3. Start the application

Start the API and frontend in separate terminals:

```sh
# API
npm run dev:backend
```

```sh
# Frontend
npm run dev:frontend
```

Set up and start EcoBot in a third terminal.

**Windows PowerShell:**

```powershell
python -m venv chatbot/.venv
chatbot/.venv/Scripts/python.exe -m pip install -r chatbot/requirements.txt
chatbot/.venv/Scripts/python.exe chatbot/api_chatbot.py
```

**macOS / Linux:**

```sh
python3 -m venv chatbot/.venv
chatbot/.venv/bin/python -m pip install -r chatbot/requirements.txt
chatbot/.venv/bin/python chatbot/api_chatbot.py
```

| Service           | Address                        |
| ----------------- | ------------------------------ |
| Storefront        | http://localhost:5173          |
| Administration    | http://localhost:5173/admin    |
| API               | http://localhost:3000/api/v1   |
| API documentation | http://localhost:3000/api/docs |
| EcoBot health     | http://localhost:5000/health   |

### Sample Accounts

| Role          | Email                | Password    |
| ------------- | -------------------- | ----------- |
| Administrator | admin@example.com    | EcoDemo123! |
| Customer      | customer@example.com | EcoDemo123! |

Set `DEMO_PASSWORD` before the first seed run to use a different password. These accounts are intended for development and should not be enabled on a live storefront.

## Configuration

Each service includes an `.env.example` file.

| Service  | Variables                                                         | Purpose                                        |
| -------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| Backend  | `DATABASE_URL`, `JWT_SECRET`                                      | Database connection and token signing          |
| Backend  | `HOST`, `PORT`, `FRONTEND_URL`, `CORS_ORIGINS`                    | Server binding, redirects, and allowed origins |
| Backend  | `SMTP_*`                                                          | Password recovery email                        |
| Backend  | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Optional Google OAuth                          |
| Backend  | `DEMO_PAYMENTS`                                                   | Enable payment simulations outside production  |
| Frontend | `VITE_API_URL`, `VITE_BACKEND_URL`, `VITE_CHATBOT_URL`            | API, upload, and chatbot URLs                  |
| Frontend | `VITE_GOOGLE_LOGIN`                                               | Show the Google sign-in button                 |
| Chatbot  | `GROQ_API_KEY`, `GROQ_MODEL`                                      | Optional AI responses                          |

Frontend `VITE_*` variables are public build configuration. Keep credentials in backend or chatbot environment files.

### Password Recovery

Start Mailpit to receive development emails:

```sh
docker compose --profile mail up -d
```

Use `SMTP_HOST=localhost`, `SMTP_PORT=1025`, and `SMTP_SECURE=false` in `backend/.env`. Open http://localhost:8025 to view captured messages. Configure your own SMTP service when deploying.

### Google Sign-In and EcoBot

Google sign-in requires the backend OAuth variables and `VITE_GOOGLE_LOGIN=true` in the frontend environment.

EcoBot works without a Groq key using the shared catalog and store policies. Add `GROQ_API_KEY` to enable AI responses. EcoBot does not access customer accounts or private order information.

## Development Commands

```sh
npm run build
npm test
npm --prefix backend run test:e2e -- --runInBand
npm --prefix frontend run type-check
```

Run chatbot tests with the Python interpreter inside `chatbot/.venv`:

```powershell
chatbot/.venv/Scripts/python.exe -m unittest discover -s chatbot -p "test_*.py" -v
```

With the API and development database running:

```sh
npm run demo:smoke
# Requires Mailpit and SMTP configuration:
npm run demo:mail-smoke
```

GitHub Actions runs builds, automated tests, integration checks, and runtime dependency audits.

## Documentation

- [Architecture and API](docs/ARCHITECTURE.md)
- [Development guide](docs/MAINTENANCE.md)
- [Catalog and image assets](data/README.md)
- [Security](SECURITY.md)
- [Backend](backend/README.md)
- [Frontend](frontend/README.md)

## Project Utilities

- `npm run clean` removes build output, coverage, and Python caches.
- `npm run export:public` creates a source distribution under `release/zero-waste-ecommerce`, excluding credentials, dependencies, uploaded files, and Git history.
- `node scripts/generate-demo-assets.mjs` regenerates the product illustrations.
- `docker compose stop` stops database services while preserving their volumes.

Docker Compose runs PostgreSQL and optional Mailpit. The API, frontend, and chatbot run as separate applications.

## License

A license has not been selected for this repository.
