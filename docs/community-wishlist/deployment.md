# Community Wishlist MariaDB deployment

This runbook applies only the additive `wishlist_*` schema. It never changes
Bantay Baha tables, and it does not enable submissions, accounts, support, or
moderation routes.

## Before migration

Record the deployed Node revision and confirm that it contains the same
Wishlist migration files as this checkout. In the Hostinger operations record
(not Git), retain:

- a timestamped, verified database backup and restore location;
- current database size, quota, and remaining headroom;
- the MariaDB version and a disposable-copy restore rehearsal result; and
- an owner, review time, and rollback/compensating-migration decision.

Run the migration first against the disposable restored copy using the exact
production Node version and `DATABASE_URL`. Review the resulting
`wishlist_schema_migration` rows and the required tables before using the
production connection.

## Apply and verify

With `DATABASE_URL` configured only in the Hostinger environment, run:

```sh
npm run migrate:wishlist
```

The command takes a database advisory lock, creates the separate
`wishlist_schema_migration` ledger, applies pending numbered migrations in
order, and stores a SHA-256 checksum for each one. It is deliberately not run
on application startup. A changed migration that has already been recorded
fails closed; create a new forward migration instead.

After a successful production run, verify with the database operator:

```sql
SELECT version, name, applied_at
FROM wishlist_schema_migration
ORDER BY version;

SHOW TABLES LIKE 'wishlist\\_%';
```

Then check the deployed read-only API using a public lifecycle state only. A
service health or readiness response is not evidence that Wishlist migrations
exist.

## Rollback

Do not delete rows from `wishlist_schema_migration`, drop tables, or replay a
replacement SQL dump as a routine rollback. If an applied migration must be
undone, stop the deployment, restore the verified backup in the disposable
environment, and write/rehearse a reviewed compensating migration. Record the
decision and the post-action verification in the private operations record.
