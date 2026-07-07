# Contributing Guide

## Workflow

1. Branch from `main`.
2. Make your changes, and run `pnpm typecheck` before pushing.
3. Open a PR. Describe *why* you made the change, not just what changed — the diff already shows the what.
4. If it's a significant design change, write an ADR in `docs/adr/` as part of the same PR.

## Code standards

The full rules live in [AGENTS.md](../../AGENTS.md). The short version:

- TypeScript strict mode, no `any`.
- Comments explain **why**, not what — if the code already says it, don't repeat it.
- No speculative abstractions. Build what's needed now, not what might be needed later.
- If you get corrected on something during a session, update AGENTS.md or the relevant doc before you finish — that's how the correction sticks.

## Adding a feature module

See [docs/features/modules.md](../features/modules.md).

## Documentation

Docs ship in the same PR as the code they describe — a doc that lags the code is worse than no doc. For significant design decisions, write an ADR; the process is in [AGENTS.md](../../AGENTS.md#adr-process).
