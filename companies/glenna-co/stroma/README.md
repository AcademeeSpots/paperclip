# STROMA — 19-Engine Model (source documents)

**Status:** ⏳ PLACEHOLDER — source documents not yet committed.

This folder is the permanent home for the STROMA 19-engine model that defines how
Glenna & Co. operates. The CEO agent's operating model (Phase 1 in
`../OPERATING-MODEL.md`) *is* STROMA, so these documents are the single most
important thing to get into the repo.

## Why this is empty

The STROMA documents currently live on the owner's device, not in any system an
agent can reach. They must cross over **once** — uploaded into a session and
committed here, or committed directly — after which they are permanent and every
future session can read them from git. No re-uploading after that.

## Expected documents (manifest)

Observed on the owner's device (file search for "Stroma"). Sizes/dates are from
that listing and are recorded here so we can confirm the right versions land:

| File (device name) | Date | Size | Role (inferred) | Priority |
| --- | --- | --- | --- | --- |
| `gco-stroma-orientation-metaprompt` | 6/14/26 | 19 KB | CEO operating-model prompt — the core of Phase 1 | **Highest** |
| `glenna-co-stroma-map-v1 0` | 6/14/26 | 50 KB | The 19-engine map itself (v1.0) | **High** |
| `stroma_clarity_ag..._8_stack_summary` | 7/28/26 | 40 KB | Most recent file — likely current canonical summary | **High** |
| `stroma-glenna-co-agent-architecture` | 6/13/26 | 56 KB | Engines → agents mapping (feeds Phases 2–3) | High |
| `stroma-clarity-canonical-statement` | 6/14/26 | 5 KB | Definitional / canonical statement | Medium |
| `stroma-clarity-mapping` | 6/13/26 | 50 KB | Supporting mapping material | Medium |

> Note: the `..._8_stack_summary` filename was truncated in the device listing;
> confirm the full name when it is committed.

## How to add the documents

Any one of these gets the content into the repo permanently:

1. **Upload into a session** — attach the actual files (PDF/Word/text, not
   screenshots) and ask that they be saved here. PDFs and `.docx` can be read and
   converted to Markdown for durable storage.
2. **Paste the text** and ask that it be written into this folder.
3. **Commit directly** to `companies/glenna-co/stroma/`.

Once committed, delete this placeholder's "PLACEHOLDER" status line and update
`../README.md` and `../OPERATING-MODEL.md` to mark Phase 1 unblocked.
