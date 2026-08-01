# Glenna & Co. — Phased Rollout on Paperclip

**Status:** Draft — captured from working session, 2026-08-01.
**Depends on:** the STROMA 19-engine model (`stroma/` — not yet committed).

## Guiding principle

Do **not** build all 47 agents at once. Stand the company up in phases, adding
agents only where instrumented, governed loops already exist and the value is
highest. Leave everything else human-run until there is a governance case for
automating it.

## The phases

### Phase 1 — CEO agent (now)

Create the CEO agent and hand it **STROMA as its operating model**. In its
instructions/goal:

> "Run Glenna & Co. per the STROMA 19-engine model; you own translating it into
> work."

This makes the STROMA model the CEO's north star. **This phase depends on the
STROMA docs being available** (see `stroma/`) — the CEO's operating model *is*
STROMA, so the model must be in the repo (or otherwise handed to the CEO) for this
phase to be real rather than a placeholder.

### Phase 2 — a few engine leads

Create manager agents **only** for the instrumented engines that already have
approved loops:

- Compliance
- Cash
- Sales
- Finance
- Production

These are where the systems already exist and the value is highest.

### Phase 3 — individual agents under each lead

Add individual contributor agents under each engine lead, **as the CEO actually
needs them** — e.g. Pipeline, AR Collections, COGS. Demand-driven, not
build-ahead.

### Ongoing — leave "trust-run" engines human-run

Leave the trust-run engines human-operated for now — per Glenna & Co.'s own doc,
there is no governance case for automating them yet. Do not over-automate.

## How the phases map onto Paperclip's governance primitives

The phasing discipline above is not just a convention to enforce by hand — it maps
onto hiring-governance features that already exist in the platform (see
`doc/plans/2026-02-19-ceo-agent-creation-and-hiring.md`):

- **Board-approval-for-new-hires** (company setting, default **ON**): new agents
  land in a `pending_approval` limbo state until the board (the owner) approves
  them. This is the gate that lets the CEO propose Phase 2 / Phase 3 hires one at
  a time instead of spawning the whole org.
- **`can_create_agents` permission** (default **ON** for the CEO, **OFF** for
  everyone else): keeps hiring authority with the CEO, not scattered across the org.

Net effect: the CEO can drive the phased rollout by proposing hires as the work
demands them, and each hire passes through board approval before becoming
operational.

## Open items

- [ ] Commit the STROMA source docs to `stroma/` (blocks Phase 1).
- [ ] Decide whether this workspace should become a full `agentcompanies/v1`
      importable package (via the `company-creator` skill) once STROMA is in hand.
- [ ] Confirm the five Phase-2 engines have documented, approved loops before
      creating their leads.
