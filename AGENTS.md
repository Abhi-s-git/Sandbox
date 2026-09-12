<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:database-rules -->
# Database: Drizzle + Neon (development)

This project is in active development with no backwards-compatibility requirements.

- Use `npx drizzle-kit push` to sync the schema directly to the database.
- Do NOT run `npx drizzle-kit generate` or `npx drizzle-kit migrate`.
- Do not create or commit SQL migration files.
<!-- END:database-rules -->
