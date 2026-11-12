# EcoStore API

The backend uses NestJS 11, Prisma 5, and PostgreSQL to handle authentication, catalog management, shopping carts, orders, reviews, and administration.

## Setup

Follow the [project setup guide](../README.md) to configure the environment and start PostgreSQL. From this directory:

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

## Services

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs
- Database health: http://localhost:3000/api/v1/health

Configuration is documented in [.env.example](.env.example). Set `HOST=0.0.0.0` when the hosting environment requires binding to all interfaces.

## Application Structure

Each feature contains controllers, services, repositories, and request/response DTOs. Feature modules share one Prisma client. Authentication uses JWT, with account status and role checked against the database on authenticated requests.

Checkout calculates prices and shipping on the server. Stock reservation, order creation, cancellation, and inventory restoration use database transactions.

## Build and Test

```sh
npm run build
npm run start:prod
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

The build entry point is `dist/src/main.js`. Set `NODE_ENV=production` when deploying.

The payment simulation endpoint requires `DEMO_PAYMENTS=true` and is disabled in production. Live payment processing requires a provider integration.

See [architecture](../docs/ARCHITECTURE.md) and [security](../SECURITY.md) for API behavior and deployment considerations.
