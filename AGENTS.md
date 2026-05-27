# GroceryList

A personal grocery list web app that checks local stores for the lowest prices for key items.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint with eslint-config-next
- **Database**: SQLite (better-sqlite3) for server persistence
- **Offline**: IndexedDB + Service Worker (PWA)

## Cursor Cloud specific instructions

### Running the application

- `npm run dev` starts the Next.js dev server on port 3000 (default)
- Data persists in `grocerylist.db` (SQLite) on the server side
- Client uses IndexedDB for offline-first local storage
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

- **Local-first**: Client writes to IndexedDB first, then syncs to server SQLite
- API routes: `src/app/api/items/`, `src/app/api/regular-items/`, `src/app/api/stores/`
- Offline store hook: `src/lib/client/use-offline-store.ts`
- Server DB: `src/lib/db.ts` (SQLite with WAL mode)
- Price data is simulated in `src/lib/store-data.ts` (4 local stores)
- Service worker at `public/sw.js` caches app shell

### PR and merge policy

- **Merge PRs directly.** This is a personal app — do not leave PRs as drafts. Create the PR as ready and merge it after verifying lint/test/build pass.

### Testing policy

- **No GUI/manual testing by the agent.** The user handles all browser-based testing.
- The agent should verify changes with `npm run lint`, `npm run test`, and `npm run build` only.

### Gotchas

- Tests use in-memory SQLite (no `grocerylist.db` file created during tests)
- ESLint uses flat config format (`eslint.config.mjs`)
- Vitest config is separate from Next.js config (see `vitest.config.ts`)
- `next.config.ts` has `serverExternalPackages: ["better-sqlite3"]` for the native module
