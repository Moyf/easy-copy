# Contributing

English | [中文文档](./CONTRIBUTING-zh.md)

## Development Setup

```bash
npm install
```

## Building

```bash
npm run build          # Type-check + production build
npm run dev            # Watch mode (rebuilds on file changes)
npm run build:local    # Build + copy to Obsidian vault (requires .env with VAULT_PATH)
```

For `build:local`, create a `.env` file in the project root:

```
VAULT_PATH=/path/to/your/obsidian/vault
```

## Testing

Tests use [vitest](https://vitest.dev/) and cover the pure link-building functions in `src/linkBuilder.ts`.

```bash
npm test               # Run all tests once
npm run test:watch     # Run tests in watch mode (re-runs on file changes)
```

Test files live alongside source files with a `.test.ts` suffix (e.g., `src/linkBuilder.test.ts`).

## Linting

```bash
npm run lint           # Check for lint errors
npm run lint:fix       # Auto-fix lint errors
```
