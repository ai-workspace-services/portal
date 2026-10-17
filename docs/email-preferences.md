# Root email management and recipient preferences

The existing `/panel/management` workspace has a **邮件与通知 / Email & notifications** tab visible only to Root. Accounts enforces Root on its read, write and preview endpoints; ordinary admins and operators cannot use the API even if they construct the URL.

Root configures the real company name, valid postal address, contact mailbox and the HTTPS console origin. No company address is inferred from account records. Saving uses a version check. Preview generates links for the current Root account only and never sends a message.

Recipients can open `/email/preferences` from their account settings, or use an opaque, mailbox-bound link from a marketing footer. All three categories (features, tutorials, offers) default to off. Explicit saves persist consent and a policy version in Accounts. `/email/unsubscribe` requires one confirmation; loading a link does not change state. The email client's standard one-click request posts directly to `/api/auth/email-unsubscribe`.

The user-facing pages are public pages (the existing SSR public fallback); their `/api/auth/*` endpoints reach Accounts through the existing auth gateway. Selfhost uses the matching Next BFF routes. No gateway deployment topology or origins are added. Cross-boundary account navigation uses `BoundaryLink`.

## Content ownership

`knowledge/content/website/account/email-preferences/{zh,en}.json` is canonical. `src/data/content/email-preferences.json` is generated. To refresh only this surface:

```sh
WEBSITE_CONTENT_DIR=/path/to/knowledge/content/website yarn exec tsx scripts/generate-content.ts --account=email-preferences
```

The normal content build also refreshes it. An older content revision retains the reviewed generated artifact until the matching Knowledge change is merged. Merge Knowledge before releasing Portal. Environment-specific origins and actual sender identity are runtime settings, not static copy.

## Verification and release

Accounts includes the additive `2026101702_email_preferences` migration, a qualified PostgreSQL 17 native snapshot, API and SMTP header tests, and an isolated PostgreSQL migration/persistence test. Existing databases must use the normal reviewed bounded migration flow; no live migration is executed by this change.

Run frontend lint, typecheck, unit tests and production build. For a worktree using a dependency symlink outside the Turbopack root, use `yarn build --webpack`.

Before release, verify Root-only access and a non-Root 403 on the target environment; save the actual sender identity; use preview links on a test account; exercise preferences, confirmation unsubscribe and the client's one-click POST. Verify sent mail has the two List-Unsubscribe headers and that the SMTP provider signs them appropriately. Do not put preview tokens, customer addresses or session links into logs, screenshots or release notes. Redact the `key` query parameter in ingress/request logging.

## Scope

This is the sender-identity, footer, consent and self-service preference foundation. It does not start a campaign, change quotas or billing, or schedule expiry/renewal notifications. Necessary transactional mail stays separate. New marketing producers must use Accounts' `deliverEmail` with `MarketingRecipient`; that gate reloads category/frequency consent immediately before SMTP and appends the footer. A campaign queue must additionally implement its own per-period send ledger, frequency cap, delivery retries, bounce/complaint handling and event deduplication before bulk delivery is enabled. No bulk-send endpoint is exposed here.
