# Security policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems.

Report them privately through GitHub:
**Security → Report a vulnerability** on this repository
([direct link](https://github.com/janfuhrer/Vintry/security/advisories/new)).

Include what you found, how to reproduce it and what an attacker could do with it.
You can expect a first answer within a week. Fixes are released as soon as they are
ready, and reporters are credited unless they prefer not to be.

## Supported versions

Vintry is released from `main`. Only the latest version receives security fixes.

## Scope

In scope: the Vintry application code, its Docker image and its default configuration.

Out of scope: vulnerabilities in your own hosting, reverse proxy or database setup,
and issues that need a compromised device or browser.

## Design notes

- Sign-in is by passkey only (WebAuthn). There are no passwords to leak.
- Sessions and invite links are random 256-bit tokens. Only their SHA-256 hashes are stored.
- Every query that touches wine data is scoped to the signed-in user.
- Label text recognition runs in the browser. The app makes no third-party requests.
- A strict Content Security Policy and the usual security headers are set on every response.
