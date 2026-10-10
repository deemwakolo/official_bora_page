This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Verification

Local checks, in the order CI runs them:

```bash
npm ci                # reproducible install from package-lock.json
npm run typecheck     # production TypeScript check (tsconfig.build.json)
npm run lint          # ESLint
npm run build         # production Next.js build
```

The BORA Engine (`engine/`) is isolated from the production
application and is checked separately. Its test suite runs from the
frozen external toolchain at `F:/coding/bora-engine` (see
`engine/vitest.engine.config.ts` for the exact invocation and
prerequisites):

```bash
npm run engine:typecheck  # engine-only TypeScript check
npm run engine:test       # frozen engine test suite (frozen toolchain required)
```

CI (`.github/workflows/ci.yml`) runs the production gate: install,
type-check, lint, and build. The engine suite is not run in CI
because it depends on the local frozen toolchain; run it locally
before deploying.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
