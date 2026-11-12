# EcoStore Frontend

A responsive storefront and administration dashboard built with Vue 3, TypeScript, Vite, Vue Router, and Tailwind CSS.

## Setup

Follow the [project setup guide](../README.md) to start the API and database. From this directory:

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env`, or run `npm run setup:env` from the repository root.

| Variable            | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `VITE_API_URL`      | NestJS API base URL, including `/api/v1`    |
| `VITE_BACKEND_URL`  | Optional separate origin for uploaded files |
| `VITE_CHATBOT_URL`  | EcoBot API base URL                         |
| `VITE_GOOGLE_LOGIN` | Enable the Google sign-in button            |

These variables are public configuration. Do not put credentials in them.

## Structure

- `src/views`: storefront, account, checkout, and administration pages.
- `src/components`: navigation, footer, and chat interface.
- `src/service`: Axios clients for backend features.
- `src/utils`: media URLs, pricing, and notifications.
- `public/images`: product illustrations and website assets.

Product illustrations are served with the frontend. Uploaded media is served by the backend through `/uploads`.

## Commands

```sh
npm run dev
npm run type-check
npm run build
npm run preview
```

The build writes static assets to `dist`. The included `vercel.json` provides a single-page application fallback for Vue Router.

The storefront content is in Vietnamese. Project documentation is in English.
