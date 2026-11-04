# AI usage

The catalogue was directed in Cursor. The agent model in this session was Grok 4.7. I reviewed the generated code, ran the tests, and checked the running site in the browser.

No `AGENTS.md`, `CLAUDE.md` files were used. None are in the repository.

There was no separate written spec. The acceptance criteria in the brief were the spec. Each step below was a prompt, or a close version of one, given to the agent in order.

## Prompts that shaped the work

1. Scaffold two separate apps: a React and TypeScript frontend with Vite, and a Node, Express, and TypeScript backend. Include tests, gitignore, and `.env.example`. The only endpoint at first was `GET /api/health`. Do not add product features yet.

2. Implement the catalogue backend behind a product provider interface. Fake Store is the first provider, and the React app must never call it or see its URLs. Add the product, category, search, and enquiry APIs with validation, error handling, and tests.

3. Build the React frontend against that API only: home with five featured products, categories, search, product details, and an enquiry form with a thank-you state.

4. Send the enquiry with Nodemailer and a replaceable email interface. Success is returned only after SMTP accepts the message. Use Mailpit in Docker Compose. Keep SMTP settings in environment variables and test the sender with a mock.

5. Make `docker compose up --build` start the frontend, the backend, and Mailpit, then test that stack from a clean start and in the browser.

6. Add 10 end-to-end tests for the home, category, search, and product acceptance criteria. Do not hardcode the host so the tests can run somewhere other than this machine.

## Where the AI was wrong

The first frontend scaffold was vanilla TypeScript. The Vite template flag was dropped, so the React app was created again with the `react-ts` template.

React Router 8 required a newer Node than 22.13. The project uses React Router 7, which runs on this Node version. jsdom 30 had the same engine problem and was pinned to jsdom 29.

The mail setup rejected `catalogue@localhost` because the address check demanded a dot in the domain. Mailpit uses that address. The check was relaxed for local inboxes, and a real send into Mailpit confirmed it.

The first Compose file only defined Mailpit. Running `docker compose up --build` attached to Mailpit and then stopped it. The frontend and backend services were missing. They were added, the stack was rebuilt, and a browser enquiry was checked in Mailpit.

The first end-to-end run failed twice. One request to the live catalogue timed out, so the test retries a 502 or 504. The category assertion also read the page through a locator that missed the top-rated region. The locator was changed to the region role, and all 10 tests passed.

The end-to-end tests originally called `localhost` directly. That is the right default for Compose on one machine, and it is the wrong thing to hardcode for every environment. The frontend and API addresses now come from `E2E_BASE_URL` and `E2E_API_BASE_URL`.

I also checked the claim that a customer should receive the enquiry email. The criterion says the sales inbox receives it. The customer sees the thank-you message. Mailpit is that inbox locally. No code change was required.
