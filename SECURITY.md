# Security

Please report security concerns privately to the repository owner. Do not include passwords, API keys, access tokens, or customer information in public issues.

## Credentials and Authentication

- Use a random `JWT_SECRET` with at least 32 characters. The setup script generates one when creating a backend environment file.
- JWTs expire after one hour. Authenticated requests recheck account status and role against the database.
- Keep SMTP, OAuth, database, and AI credentials in service environment files.
- Frontend `VITE_*` variables are public configuration and must not contain secrets.
- Revoke or rotate any credential exposed in an earlier commit. Removing it from the current source tree does not revoke the credential or remove older copies.

## Payments

MoMo and PayPal flows currently simulate payment confirmation. They require `DEMO_PAYMENTS=true`, check order ownership, and are disabled when `NODE_ENV=production`.

A live storefront needs a payment provider integration with authenticated, server-side payment notifications. A browser confirmation must not be treated as proof of payment.

## Uploaded Files and Chat Content

Uploads are limited to 10 MB per file and checked by extension and MIME type. Content decoding and malware scanning are not included.

The frontend renders chatbot responses as escaped text. EcoBot has no access to private account or order records. When Groq is enabled, the question and relevant catalog content are sent to that service.

## Deployment

Before accepting real customer information, configure HTTPS, credential management, rate limiting, backups, monitoring, and appropriate data handling policies.

Browser sessions currently use tokens stored in `localStorage`. Review session storage, cookie handling, and CSRF protection for your deployment.

Use `npm audit` in the backend and frontend after dependency changes. Automated checks complement a deployment security review; they do not replace it.
