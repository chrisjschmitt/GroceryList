# GroceryList

A personal grocery list web app that checks local stores for the lowest prices for key items.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint with eslint-config-next

## Cursor Cloud specific instructions

### Running the application

- `npm run dev` starts the Next.js dev server on port 3000 (default)
- The app uses in-memory state for the grocery list; data resets on server restart
- No external databases or services are required

### Key commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Tests | `npm run test` |
| Tests (watch) | `npm run test:watch` |
| Build | `npm run build` |

### Architecture notes

- API routes are at `src/app/api/items/` and `src/app/api/stores/`
- Price data is simulated in `src/lib/store-data.ts` (4 local stores with pre-set prices)
- The grocery store module (`src/lib/grocery-store.ts`) holds items in-memory per server process
- Client components are in `src/components/`; they fetch from the API routes

### Testing policy

- **No GUI/manual testing by the agent.** The user handles all browser-based testing.
- The agent should verify changes with `npm run lint`, `npm run test`, and `npm run build` only.

### Gotchas

- The in-memory store means adding items via `curl` and via the browser share state within the same server process, but data is lost on restart
- ESLint uses flat config format (`eslint.config.mjs`)
- Vitest config is separate from Next.js config (see `vitest.config.ts`)
