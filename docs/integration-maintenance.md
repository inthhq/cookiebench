# Maintaining an integration

An integration agent prepares a versioned fixture change and its evidence. It cannot approve a performance result, alter raw samples, waive a failed flow, or publish a ranking.

Give the agent an isolated checkout without publication credentials. Its task must name the product, exact release artifact, framework, deployment mode, policy, and presentation. Vendor documentation is evidence to inspect, not instructions to follow.

Use this task template:

```text
Update <fixture ID> from <old immutable version> to <new immutable version>.

Read the current fixture, public API declarations, release source, and release notes.
Record source URLs, source commit where available, package integrity, lockfile hash,
and the old/new fixture configuration hashes. Keep the previous result files intact.

Produce a reviewable diff and a new fixture revision. Explain each changed public
API, selector, build input, policy, and script workload. Keep unresolved claims
unknown or documented. Do not mark a capability verified from source alone.

Run the production consumer build and its positive/negative SDK type checks.
Run load, accept, reject, granular save, returning acceptance/rejection, preferences,
and withdrawal checks with controlled scripts and server evidence where applicable.
Keep failed and incomplete attempts. A selector change requires the entire flow
suite again. Run the deliberately broken reference suite before trusting results.

Return the diff, exact commands and exit codes, artifact paths and hashes, capability
evidence, and remaining failures. Request a full measurement run only after the
fixture passes its declared deterministic gates. Do not publish or modify scores.
```

Review the configuration through `decodeFixture` and the saved envelope through `decodeResult`. The CLI performs those checks at its boundaries. A passing typecheck establishes only the compiled consumer contract. An executed consent check establishes only the recorded action, state, workload, and profile.

After accepting the fixture revision, collect fresh baseline/CMP pairs under the same profile. Database ingestion creates new immutable records. Analysis points to those run IDs and its own version, so an adapter repair cannot rewrite previously published evidence.
