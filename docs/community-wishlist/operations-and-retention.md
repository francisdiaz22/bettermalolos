# Operations and retention

The named platform owner, two moderators, escalation contact, review target, and private operational inbox must be recorded before public launch. Moderator access is least-privilege and audit logged; moderators do not receive Hostinger, database, deployment, SMTP, or source-control credentials.

Operational inbox address, SMTP credentials, and destination configuration belong only in Hostinger environment variables. They must never appear in Git or public client code.

Unverified accounts and unused magic links expire after 24 hours. Account contact data is retained only while active and for no more than 90 days after deletion or final resolution, unless a documented legal preservation obligation applies. Rejected submission contact data and private originals follow the same 90-day maximum; moderation records are retained only for the documented accountability period. Do not log tokens, email addresses, magic-link URLs, or raw IP addresses.

