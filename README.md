# OneContext MCP

Git-style context control for LLM agents, plus a practical way to forward Codex session segments as MCP resources.

This project MCP-ifies ideas from:
- Git-Context-Controller (GCC): COMMIT / BRANCH / MERGE / CONTEXT
- "Forward a slice of agent history" (e.g., Codex `sessions/*.jsonl`) into a shareable, structured segment

## What It Does

- Creates and maintains a `.GCC/` directory in the current working directory.
- Provides MCP tools to:
  - initialize the context store
  - create/checkout branches
  - commit milestones
  - merge branches
  - retrieve context at multiple granularities
  - forward a slice of a Codex `*.jsonl` session file into a segment (events + transcript)
- Exposes MCP resources so another agent can read the forwarded segment by ID.

## File Layout

```text
.GCC/
  main.md
  state.json
  branches/
    main/
      commit.md
      commits.jsonl
      log.jsonl
      metadata.yaml
    <branch>/
      ...
  segments/
    <segmentId>/
      meta.json
      transcript.md
      events.jsonl
      blobs/
        <sha256>.txt
```

## Install

```bash
npm i
npm run build
```

## Run (MCP stdio)

```bash
node dist/index.js
```

## MCP Tools

- `gcc-init`
- `gcc-branch`
- `gcc-checkout`
- `gcc-commit`
- `gcc-merge`
- `gcc-context`
- `forward-codex-session-segment`

## MCP Resources

- `onecontext://about`
- `onecontext://instructions`
- `onecontext://gcc/main`
- `onecontext://gcc/state`
- `onecontext://gcc/branches`
- `onecontext://gcc/branch/{branch}/commit`
- `onecontext://gcc/branch/{branch}/commits`
- `onecontext://gcc/branch/{branch}/log/{tail}`
- `onecontext://gcc/branch/{branch}/metadata`
- `onecontext://segment/{id}/meta`
- `onecontext://segment/{id}/transcript`
- `onecontext://segment/{id}/events`
- `onecontext://segment/{id}/blob/{sha256}`

## Notes

- This server stores plain-text / JSON artifacts on disk. It intentionally does **not** store chain-of-thought.
- Large tool inputs/outputs (e.g., huge patches, base64 images) are truncated and/or moved into `.GCC/segments/<id>/blobs/`.
