# AI-Native Product Catalogue

A small product catalogue. Customers browse featured products, open a category, search, read a product, and send an enquiry. The sales inbox receives the enquiry by email.

## Stack

The client is a React web app written in TypeScript. The backend is Node.js with Express, also in TypeScript.

React matches the page-based acceptance criteria, and TypeScript is the preferred client option. Node keeps the same language on both sides of the API. The backend is the only place that talks to the product source and the mail server, so either of those can be replaced without rewriting the pages.

Docker Compose is the reviewer setup. It needs Docker only. It does not need a paid account.

## Run

From this folder:

```powershell
docker compose up --build
```

Leave that terminal open. The first build downloads images and installs dependencies. After it is ready:

| Service | Address |
| --- | --- |
| Catalogue | http://localhost:5173 |
| API | http://localhost:3000 |
| Sales inbox (Mailpit) | http://localhost:8025 |

Check the API with http://localhost:3000/api/health. It returns `{"status":"ok"}`.

Try the catalogue: open a category, search for `backpack`, open a product, and click **Enquire**. Submit your name, email, phone, and message. The page shows **Thank you for your enquiry!** Open Mailpit and confirm the message arrived for `sales@localhost`.

Press Ctrl+C in the Compose terminal to stop the app.

## Tests

Unit and API tests do not need the running site. End-to-end tests do. Use Node.js 22.13 or newer.

Run each block from the project root, the folder that contains this README. If the prompt already ends in `\backend`, do not run `cd backend` again. That looks for `backend\backend`, which does not exist. From there, run `npm install` and `npm test` directly.

```powershell
cd backend
npm install
npm test
cd ..
```

```powershell
cd frontend
npm install
npm test
cd ..
```

With `docker compose up --build` still running:

```powershell
cd e2e
npm install
npx playwright install chromium
npm test
cd ..
```

`E2E_BASE_URL` and `E2E_API_BASE_URL` override the addresses used by the browser tests. The defaults are the Compose ports above. See `e2e/.env.example`.

## Configuration

Compose sets the backend environment itself. Nothing has to be copied before `docker compose up --build`.

`backend/.env.example` and `frontend/.env.example` are for running the two apps with `npm run dev` outside Docker. In that mode the API listens on port 3001, and `VITE_API_BASE_URL` must be `http://localhost:3001`. Do not commit a filled `.env` file.

SMTP settings are `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, and `SALES_EMAIL`. Leave the user and password empty for Mailpit. To use another mail server later, change those variables. No address or password is hardcoded in the application source.

## Submission notes

Assumptions, trade-offs, and how this can grow are in [DECISIONS.md](DECISIONS.md).

How Cursor was used is in [AI_USAGE.md](AI_USAGE.md).

Time spent is in [TIME.md](TIME.md).
