# TanStack Start fixture

This production fixture pins TanStack Start 1.168.60, TanStack Router 1.170.41, React 19.2.1 and the published `@c15t/tanstack-start@3.0.0-alpha.6` adapter.

`src/consent-state.ts` attaches consent middleware only to the consent server function and resolves request cookies with the public server API and fetches the controlled backend init response on every SSR request. `ConsentRoot` hydrates that state. The public snapshot and script loader provide observable consent behavior. Default banner and dialog animations stay enabled.

The `/baseline` route shares the document and article but imports no c15t component, stylesheet or provider. It has no consent loader or global consent middleware. Both routes share the warm production process and its loaded server modules. The production route manifest loads its page chunk separately from the consent route. This keeps baseline and CMP framework versions and content identical.

Run `pnpm build` and `pnpm start` in this directory. The controlled backend listens on port 4316 and proxies the production Start server on 4416. `run.json` declares the fixture pair and scenarios.

The local backend acknowledges writes but does not represent a public vendor deployment's latency. Local-write and remote-write timing stay unavailable unless the public adapter supplies verifiable timestamps. Reload and returning-visitor probes verify the persisted choice separately.
