---
name: portal-frontend-content-boundary
description: Keep Portal on its pure Next.js/React frontend path and route all static product content to the Git-backed content architecture. Use when adding, changing, reviewing, or migrating homepage copy, product marketing, documentation, technical blogs, navigation labels, localized strings, content schemas, or Portal build-time content synchronization.
---

# Portal Frontend Content Boundary

## Architecture

Treat the repositories as separate sources of truth:

| Concern | Owner |
| --- | --- |
| Portal UI, routing, interaction, API proxying, presentation | `ai-workspace-services/portal` |
| Static website and product copy | `haitaopanhq/knowledge` under `content/website/` |
| Product documentation | `haitaopanhq/knowledge` under `docs/` |
| Product technical blogs | `haitaopanhq/knowledge` under `content/` |
| Deployment and runtime business configuration | `ai-workspace-infra/gitops` |

Portal consumes website content at build time through a normal Git clone. Do
not introduce a GitHub API dependency, a runtime content fetch, or a browser
editor for this workflow.

## Rules

1. Do not add user-facing static copy directly to Portal components, pages,
   `src/data`, or localization files. Add it to the appropriate `knowledge`
   content schema instead.
2. Keep Portal components data-driven: accept typed content props and render
   them; do not make components the canonical source of translated copy.
3. Keep `/docs` and `/blogs` proxied to the content service. Do not bundle
   documentation or blog archives into the Portal image.
4. Put environment-specific values, endpoints, deployment settings, and
   operational configuration in GitOps or runtime configuration, not in the
   content repository.
5. Never store credentials, tokens, private keys, or production secrets in
   any content file. Run the relevant secret scan before opening a content PR.

Dynamic UI state, validation messages derived from runtime data, and technical
errors may remain in Portal code. If the text is product, marketing, help, or
localized editorial content, it belongs in `knowledge`.

## Content Change Workflow

1. Classify the change using the table above.
2. Update `knowledge` on a branch, preserving the content manifest and both
   `zh` and `en` variants where the schema requires them.
3. Validate content and open a content PR. Merge it before the consuming
   Portal release.
4. For a new Portal content shape, update the Portal validator and generator
   before wiring components to the new fields.
5. Build Portal with `WEBSITE_CONTENT_REPOSITORY`,
   `WEBSITE_CONTENT_REF`, and `WEBSITE_CONTENT_SUBDIR`; verify that the image
   embeds the reviewed content revision.

## Migration Rule

When touching an existing static-copy surface, migrate its source of truth out
of Portal rather than adding more inline copy. Use small, reviewable batches:

1. Define the content schema in `knowledge`.
2. Add generated typed artifacts in Portal.
3. Replace inline or duplicated strings with the artifact.
4. Verify both locales and remove the old canonical copy.

Do not mix a broad copy migration with unrelated UI refactors.

## Verification

Run the checks appropriate to the change:

```bash
yarn content:pull
yarn content:validate
yarn typecheck
yarn build
```

For CI/build changes, also verify the Git-backed content contract in the image
build rather than relying on a developer's local `src/content` snapshot.
