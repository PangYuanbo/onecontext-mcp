# OneContext MCP

Git-style context control for LLM agents (GCC). Forwarding is done by exporting a bounded commit range into a segment and sharing the segment id.

This project MCP-ifies ideas from:
- Git-Context-Controller (GCC): COMMIT / BRANCH / MERGE / CONTEXT
- (Optional) importing a slice of agent history (e.g., Codex `sessions/*.jsonl`) into a shareable segment

## What It Does

- Creates and maintains a `.GCC/` directory in the current working directory.
- Provides MCP tools to:
  - initialize the context store
  - create/checkout branches
  - commit milestones
  - merge branches
  - list/search commits (to pick a range)
  - export a bounded commit range into a segment (events + transcript)
  - retrieve context at multiple granularities
  - (optional) import a slice of a Codex `*.jsonl` session file into a segment (events + transcript)
- Exposes MCP resources so another agent can read commits by id (`onecontext://gcc/commit/{id}`) or exported segments (`onecontext://segment/{id}/...`).

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

## Install As A Package (Private, GitHub Packages)

This repo is configured to publish to GitHub Packages as `@pangyuanbo/onecontext-mcp`.

1) Configure npm auth (example):

```bash
npm config set @pangyuanbo:registry https://npm.pkg.github.com
```

Your `~/.npmrc` must also include an auth token, for example:

```text
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

The token must have `read:packages` permission.

2) Install (global) or run via npx:

```bash
npm i -g @pangyuanbo/onecontext-mcp
# or:
npx @pangyuanbo/onecontext-mcp
```

## Publish To npm (Name Squat + Private)

Reality check:

- npm does **not** support private **unscoped** packages. Unscoped names (like `onecontext-mcp`) are always public.
- npm private publishing requires a scoped package (like `@pangyuanbo/onecontext-mcp`) and an npm paid plan.

This repo supports both:

1) `onecontext-mcp` (public stub, reserves the unscoped name)
2) `@pangyuanbo/onecontext-mcp` (the real server, publish as private/restricted if your npm plan allows)

### GitHub Actions Secrets

Add a repo secret:

- `NPM_TOKEN`: an npm access token with publish permissions

### Publish Stub (reserve `onecontext-mcp`)

Create a tag like `npm-stub-v0.0.1` and push it, or run the workflow manually:

- Workflow: `Publish (npm stub)`
- Package dir: `npm-stub/`

### Publish Real Package (private/restricted)

Create a tag like `npm-v0.1.1` and push it, or run the workflow manually:

- Workflow: `Publish (npm private)`
  - Input `access`: `restricted` (private) or `public`

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
- `gcc-list-commits`
- `gcc-search-commits`
- `gcc-export`
- `forward-codex-session-segment` (optional helper)

## MCP Resources

- `onecontext://about`
- `onecontext://instructions`
- `onecontext://gcc/main`
- `onecontext://gcc/state`
- `onecontext://gcc/branches`
- `onecontext://gcc/commit/{id}`
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
- Large tool inputs/outputs are truncated in-place; when using `forward-codex-session-segment`, the original large payloads may also be saved as blobs under `.GCC/segments/<id>/blobs/`.
