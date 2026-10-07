# TanStack Start fixture

This production fixture pins TanStack Start 1.168.60, TanStack Router 1.170.41, React 19.2.1 and the published `@c15t/tanstack-start@3.0.0-alpha.6` adapter.

The Vite build bundles the Inth backend's policy manifest into `src/c15t-manifest.ts`, which Git ignores. `src/consent-state.ts` attaches consent middleware only to the consent server function, which resolves each request's cookies and policy from that snapshot with `createConsentStateHandler`. The index route's loader calls it rather than the root loader the docs show, so the baseline never resolves consent. `ConsentRoot` hydrates that state and sends saves to `https://benchmarks-inth.inth.app`. The public snapshot and script loader provide observable consent behavior. Default banner and dialog animations stay enabled.

The `/baseline` route shares the document and article but imports no c15t component, stylesheet or provider. It has no consent loader or global consent middleware. Both routes share the warm production process and its loaded server modules. The production route manifest loads its page chunk separately from the consent route. This keeps baseline and CMP framework versions and content identical.

Run `pnpm build` and `pnpm start` in this directory. The fixture server listens on port 4316 and proxies the production Start server on 4416. Typecheck needs the generated manifest, so the turbo `typecheck` task builds first. `run.json` declares the fixture pair and scenarios.

Local-write and remote-write timing stay unavailable unless the public adapter supplies verifiable timestamps. Reload and returning-visitor probes verify the persisted choice separately.
