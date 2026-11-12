# Development Guide

## Environment

Use the versions documented in the [main README](../README.md). Dependency lockfiles are committed for the frontend and backend. The chatbot dependencies are listed in `chatbot/requirements.txt`.

Run `npm run setup:env` to create missing environment files. The script preserves existing files and generates a backend JWT secret.

## Application Checks

From the repository root:

```sh
npm run build
npm test
npm --prefix backend run test:e2e -- --runInBand
npm --prefix frontend run type-check
```

From the frontend directory, run `npm exec -- oxlint .` for static checks.

Run Python tests with the interpreter in the chatbot environment:

```powershell
chatbot/.venv/Scripts/python.exe -m unittest discover -s chatbot -p "test_*.py" -v
```

On macOS and Linux, use `chatbot/.venv/bin/python`.

## Integration Tests

With PostgreSQL and the API running:

```sh
npm run demo:smoke
```

This checks authentication, ownership rules, nested request validation, prices, concurrent inventory reservations, cancellations, order transitions, reviews, and payment simulations. It creates its own records and removes them afterward. Run it only against a development instance.

With Mailpit and backend SMTP configured:

```sh
npm run demo:mail-smoke
```

This checks password recovery email, password changes, rejection of the old password, and reset token reuse.

## Database Changes

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
```

Review migrations before applying them to an existing database. The seed is disabled in production and preserves existing account passwords, catalog records, and inventory values.

The catalog in `data/catalogue.json` is shared with EcoBot. Update it when adding reference product content.

## Assets and Generated Files

Regenerate the SVG illustrations with:

```sh
node scripts/generate-demo-assets.mjs
```

Use `npm run clean` to remove builds, coverage, and Python caches. It preserves installed dependencies, uploaded files, environment configuration, and database data.

Use `npm run export:public` to create a source distribution. Move an existing export before generating another one.

## Continuous Integration

GitHub Actions builds both applications, runs JavaScript and Python tests, applies database migrations, checks repeatable seeding, exercises API and email flows, and audits runtime dependencies.

Keep credentials and customer uploads out of source control. See [SECURITY.md](../SECURITY.md) for authentication, payment, and deployment considerations.
