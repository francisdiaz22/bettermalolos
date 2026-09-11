# Draft source-to-field mappings (review required)

These are review artifacts only. They are not inserted into `observation_mapping`
and no mapping is enabled. A reviewer must confirm geographic equivalence,
timestamp semantics, units/datum, thresholds, and the fallback policy before a
row may be created or enabled.

| public field | source | source station / selector | metric | role | status |
|---|---|---|---|---|---|
| `malolos_equivalent_river_level` | PDRRMO | station-specific river gauge, exact station ID TBD | `river_level` | primary | disabled; geographic review pending |
| `malolos_equivalent_river_level` | PAGASA | basin/dam status; exact equivalence TBD | `dam_level` or advisory status | fallback candidate only | disabled; not a river substitute |
| `malolos_daily_rainfall` | PDRRMO | named rainfall station, exact station ID TBD | `rainfall` | primary | disabled; station and aggregation review pending |
| `malolos_dam_level` | PAGASA | named dam row from reviewed page | `dam_level` | primary | disabled; source-use approval pending |
| `malolos_tide_height` | PDRRMO | `tide-schedule-manila-bay` | `tide_height` | primary | disabled; scope review pending |

The PAGASA basin links are retained as internal advisory evidence only. They
do not receive an inferred issue time, expiry time, Malolos geographic scope,
or public condition mapping.
