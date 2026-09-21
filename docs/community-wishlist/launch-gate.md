# Phase 0 launch gate

This register is the operational sign-off record for the Community Wishlist.
It is intentionally separate from the public policy pages: private names,
contact details, legal advice, credentials, and infrastructure evidence must
not be committed to Git.

The read-only prototype may remain public while this gate is open. Public
accounts, submissions, support, and moderation endpoints must not be enabled
until every required gate has an owner, evidence, and review date.

## Gate status

| Gate                     | Required evidence                                                                                                 | Owner                    | Status | Reviewed |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------ | ------ | -------- |
| Platform authority       | Named platform owner, primary moderator, backup moderator, escalation contact, and 48-business-hour review target | To be recorded privately | Open   | —        |
| Legal and privacy review | Review outcome for privacy notice, terms, moderation rules, retention schedule, and incident process              | To be recorded privately | Open   | —        |
| Officer orientation      | Non-binding orientation record, published receiving-office contacts, and verifiable outcomes                      | To be recorded privately | Open   | —        |
| Public methodology       | Published supporter, barangay-representation, duplicate, and Community Priority methodology                       | BetterMalolos            | Ready  | —        |
| Public lifecycle         | Published canonical status keys and explanations                                                                  | BetterMalolos            | Ready  | —        |
| Operational messaging    | Private inbox and SMTP configuration stored only in Hostinger environment variables                               | Hostinger operator       | Open   | —        |
| Database readiness       | MariaDB backup, quota, disposable-copy migration, restore rehearsal, and deployed-revision checks                 | Hostinger operator       | Open   | —        |

## Evidence rules

- Record only the minimum evidence needed to verify each gate.
- Keep personal names, private contact details, legal advice, credentials,
  SMTP values, database exports, and internal incident details outside Git.
- An email, meeting, or informal conversation does not establish LGU
  partnership or endorsement. Use a published office contact, written
  acknowledgement, meeting minutes, or official correspondence reference.
- A gate is complete only when the accountable owner has reviewed the evidence
  and recorded the review date in the private operations record.

## Phase 0 exit decision

The launch authority must explicitly choose one of these decisions in the
private operations record:

- **Approved for Phase 1 backend work:** governance and privacy gates are
  complete, but the public prototype remains read-only.
- **Approved for controlled pilot:** all gates are complete and the pilot
  scope, residents, receiving offices, and rollback owner are recorded.
- **Not approved:** keep the prototype read-only, record the missing gates,
  and set the next review date.

No decision in this file authorizes public submissions by itself. The private
operations record and deployment controls are the source of truth for launch
authority.
