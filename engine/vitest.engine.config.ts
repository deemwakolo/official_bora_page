// Engine test runner config (frozen BORA Engine V1 + adapters).
//
// Why this file exists: the engine's own `vite.config.ts` pulls in the
// React/Vite plugin scaffolding, which is neither installed nor needed in this
// repository. This config reproduces only its `test:` semantics for the copied
// tree — node environment, engine test files, no globals — so the frozen 954
// suite can run here with zero changes to engine sources or tests.
//
// NOTE: this is a plain object default export on purpose. The engine's original
// config used `import { defineConfig } from 'vitest/config'`, but `vitest` is
// not a dependency of THIS repository, so the import cannot resolve from the
// config loader here. Vitest accepts a bare object export identically, so the
// frozen `test:` semantics are preserved without pulling `vitest/config` in.
//
// Resolution note: because `vitest` is not a dependency of this repository,
// the runner is invoked explicitly from the frozen source toolchain
// (`node F:/coding/bora-engine/node_modules/vitest/vitest.mjs run
// --config engine/vitest.engine.config.ts`) with the working directory set to
// the repository root AND with
// `NODE_PATH=F:/coding/bora-engine/node_modules` so that the `vitest` import
// used inside the engine test files resolves from the frozen toolchain.
// No dependency of this repository was added or changed.
//
// This file and `tsconfig.engine-test.json` are harness-only additions. They
// are the ONLY new files this copy phase adds.
//
// `root` is the engine directory (this file's own location), and `include` is
// therefore engine-relative. The runner is launched with its working directory
// set to this same `engine/` directory. That is deliberate and important: the
// frozen `referencePurity.test.ts` resolves its reference-model files via
// `join(process.cwd(), 'src', 'verification', 'reference')`. In the original
// repository the process cwd was the repo root that directly contained `src/`;
// here that directory is `engine/`. Running with cwd = engine/ reproduces the
// frozen test's intended working directory exactly, so it locates the copied
// reference files unchanged — no engine source or test is modified.
export default {
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
    root: '.',
  },
}


