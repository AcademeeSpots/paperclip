# Glenna & Co. — Company Workspace

This folder is the **store of record** for Glenna & Co.'s operating model and its
rollout on the Paperclip control plane. It exists so the model does not live only
in a chat session (which is ephemeral and gets summarized or discarded). Anything
canonical about how Glenna & Co. runs belongs here, committed to git.

## Why this exists

Session context is not durable. It is summarized when a conversation grows long
and discarded when a session ends. Committing the model to the repo makes it:

- **Permanent** — survives session end and context compaction.
- **Auto-loaded** — a pointer in the root `CLAUDE.md` tells every future session
  where the source of truth lives, so it never has to be re-explained.
- **Portable** — can later be turned into an importable `agentcompanies/v1`
  company package (see the `company-creator` skill).

## Layout

| Path | What it holds |
| --- | --- |
| `OPERATING-MODEL.md` | The phased rollout plan for standing Glenna & Co. up on Paperclip. |
| `stroma/` | The STROMA 19-engine model source documents. **Currently a placeholder — see `stroma/README.md`.** |

## Status

- ✅ Phased rollout plan captured (`OPERATING-MODEL.md`).
- ⏳ STROMA source documents **not yet added** — they live on the owner's device
  and must be uploaded/committed once. See `stroma/README.md` for the manifest of
  expected files.

Until the STROMA docs land here, Phase 1 ("hand the CEO STROMA as its operating
model") cannot be completed, because the operating model itself is not yet in the
repo.
