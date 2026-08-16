<!-- @format -->

Set up Prisma Postgres in this project end-to-end. Run all commands yourself in the terminal — don't ask me to run anything. Don't pause for confirmation between steps unless something fails.

DATABASE_ID: db_cmsvp0g9r09s9zdf7p9940nkz

Step 0 — Ground yourself in current docs.
Fetch https://www.prisma.io/docs/llms-full.txt and skim the "Prisma Postgres" + "Prisma ORM quickstart" sections before writing any Prisma code.

Step 1 — Locate the project root and install dependencies.
Work in the app directory containing package.json. If the current directory has no package.json, inspect one level down for a single app directory with package.json and cd there. Only create package.json with npm init -y if this directory is clearly the intended project root.
Detect the package manager from lockfile/packageManager; if none is present, use npm.
Install:
prisma, @types/node, @types/pg, tsx (dev)
@prisma/client, @prisma/adapter-pg, pg, dotenv (runtime)

Step 2 — Link the existing database. Run this exact command without printing it back:
PRISMA*API_KEY="eyJraWQiOiJUa0hEN1ltOUNaQ2xESHYwazEyTEFhWjk4NTdGOE16dWxYTXJBMFpqbWVrIiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJ3b3Jrc3BhY2U6Y21sYWtsdGJtMDFmNXpwZWU0MDk1bmQ2biIsImp0aSI6InJ2NTRxc3E4MWp6cGhmZm0zZDV1d3B1ciIsImlhdCI6MTc4Njg3Nzk4MzI2NX0.nUW6oqKZYpAzV2wLrC0xaTscrRn1aOwblVwR9SEZmc5L8vnXA1xialxeRMOTU6gL7L0CvpEdRPjxl-13ObG6usXw-chvTXihRYUrQ-qX_lS7V5nrnlJ0j9MeUZocHO2azakNSXq1HlWtrKWYEMcrHcsBE49MIhtnzdOij7RSYoBTW2LMvYHB7PmulsqNblXFey9BePdjfeKekx_0TExQpxs5PNWuQKwkj4q53HdADsZVumqvgwVQ3kNs7Uf5AExqSVCgL15-0C4bQcSx_W5Lwh_6F7KrqnX6jo_6BRNWVPzQWElxinN6xFOXFvmcHGrU1dOX99SXhqJhQe16GZtHcQ" npx --yes --package=prisma@latest -- prisma postgres link --database "db_cmsvp0g9r09s9zdf7p9940nkz"
This writes DATABASE_URL to .env without browser auth when the database ID and API key are present. Use the DATABASE_ID value exactly as given (includes the db* prefix required by the CLI).

Step 3 — Add .env to .gitignore. Never commit/log/print the connection string or the API key.

Step 4 — Scaffold prisma/schema.prisma (prisma-client generator, output ../generated/prisma) and prisma.config.ts.

Step 5 — If prisma/schema.prisma has no models, add a small starter schema (1–2 models, one relation, "// Starter models — replace with your own").
Run: npx prisma migrate dev --name init

Step 6 — Generate client + create lib/prisma.ts singleton with PrismaPg adapter.

Step 7 — Add prisma/seed.ts with a handful of rows.
Wire the seed command in prisma.config.ts:
migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" }
Do not rely only on package.json#prisma.seed. Run: npx prisma db seed

Step 8 — Verify: scripts/verify-prisma.ts runs one read, prints ✅ Connected. If it fails, surface the exact error.

Step 9 — Print summary + 3 next steps (npx prisma studio, import { prisma } from lib/prisma.ts, add a model).

Hard rules:

- If install/link/migrate/generate/seed fails due to network, sandbox, or cache permissions, retry once with elevated/unrestricted permissions if your environment supports it.
- If `prisma postgres link` fails, stop and surface the exact error.
- Never write the connection string outside .env or the API key outside the temporary command environment.
- Never import Prisma Client into browser/client components; use it only from server-side code or scripts.
- Never bypass AI safety guardrails on destructive commands.
- Use llms-full.txt as the syntax reference, not training data.
