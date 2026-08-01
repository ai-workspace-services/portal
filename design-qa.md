# Account dashboard visual QA

## Comparison target

- Source visual truth: `/Users/shenlan/Desktop/panel.png` and the supplied existing-account reference `/var/folders/13/xrzs9z_n5ygb1nhxytxsf4480000gn/T/codex-clipboard-05a37579-54ce-4fd6-b039-21888d2599b1.png`.
- Intended route/state: `/panel/account`, authenticated account with usage, VLESS node, UUID, email, and security-readiness data.

## Intended layout changes

- Moves the existing subscription and monthly-quota panel to the top of the account route.
- Uses a responsive 12-column account-and-connection grid at `xl`: UUID (3), VLESS connection (6), username (3), then email (3).
- Keeps the existing VLESS QR/copy/download controls, UUID copy, username/email display, and service-readiness/MFA actions unchanged.

## Evidence and constraint

- Source images were opened at their original supplied pixel dimensions.
- No browser-rendered implementation screenshot is available in this Codex task: the required in-app browser surface is not exposed, and `/panel/account` also needs an authenticated account plus live node/usage data to reproduce the target state.
- Component-level coverage passed for the responsive account layout, UUID copy, VLESS copy/download availability, and the existing quota presentation.

## Findings

- [P2] Browser visual comparison is pending. The implementation cannot be compared at the target viewport until an authenticated browser session with representative account data is available.

## Implementation checklist

- [x] Preserve UUID, VLESS, identity, security, and quota components.
- [x] Reorder the account page for subscription/quota-first hierarchy.
- [x] Add responsive account and connection grid placement.
- [x] Add focused control and quota tests.
- [ ] Capture `/panel/account` at desktop and mobile breakpoints in an authenticated browser session.

## Final result

blocked
