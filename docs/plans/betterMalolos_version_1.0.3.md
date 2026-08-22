# BetterMalolos v1.0.3

## Purpose

Version 1.0.3 should reposition the BetterMalolos homepage around the real needs of Maloleños rather than primarily mirroring the service structure of the LGU.

BetterMalolos should feel like a **community-built civic platform**:

> **For the community. By the community.**

The homepage should help residents answer practical questions, discover useful tools, understand public projects, find the right government or service contact, and suggest new ideas for the platform.

BetterMalolos is independent and community-led. It should remain neutral, evidence-based, and useful regardless of who is currently in office.

---

# 1. Product Direction

## Current issue

The existing BetterMalolos homepage currently emphasizes services that resemble the services offered by the LGU.

While these are useful, leading with them makes BetterMalolos feel too much like:

- an alternative LGU website;
- a directory of government departments; or
- a redesigned version of an official government portal.

This undersells the real opportunity.

## New direction

BetterMalolos should instead lead with:

> **What does a Maloleño need help with today?**

The product should organize information around citizen needs rather than around government departments.

### Official LGU model

- Mayor
- Offices
- Departments
- Services
- Ordinances
- Documents

### BetterMalolos model

- Baha
- Traffic
- Tubig
- Barangay
- Projects
- Commute
- Opportunities
- Government services
- Reporting / suggestions

The resident should not need to understand government structure before finding help.

---

# 2. Priority Community Projects

The following projects should be presented in order of expected community impact.

## Priority 1 — Bantay Baha

### Goal

Help residents understand current flood conditions, flood risks, evacuation information, and flood-control projects.

### Why it is high impact

Flooding affects:

- personal safety;
- mobility;
- homes;
- schools;
- businesses;
- livelihoods;
- disaster response; and
- infrastructure accountability.

### Possible capabilities

- current flood reports;
- flooded / passable roads;
- evacuation centers;
- flood-prone areas;
- historical flooding;
- pumping stations;
- waterways;
- citizen-submitted flood reports;
- flood-control projects;
- project costs;
- contractors;
- implementing agencies;
- project status;
- citizen verification;
- project photos;
- source documents.

### Suggested route

`/bantay-baha`

---

## Priority 2 — RoadWatch

### Goal

Help residents understand roadworks, road closures, traffic disruptions, and infrastructure project timelines.

### Why it is high impact

Traffic and roadworks are among the most visible recurring everyday concerns reported by Malolos residents.

### Possible capabilities

- active roadworks;
- road closures;
- affected lanes;
- traffic advisories;
- project purpose;
- project owner;
- contractor;
- start date;
- target completion date;
- project status;
- alternative routes;
- recent photos;
- latest verification date.

### Suggested route

`/roadwatch`

---

## Priority 3 — Saan Ako Lalapit?

### Goal

Allow residents to describe a problem in plain language and identify the correct office, agency, utility, organization, or service responsible.

### Core principle

Residents should not need to know whether a concern belongs to:

- a barangay;
- the City Government of Malolos;
- the Provincial Government of Bulacan;
- DPWH;
- PrimeWater;
- Meralco;
- LWUA;
- DOTr;
- another national government agency; or
- a private service provider.

### Example categories

- broken road;
- streetlight;
- flooding;
- no water;
- garbage collection;
- traffic signal;
- tricycle complaint;
- stray animals;
- permits;
- emergency concerns.

### Suggested result format

For a selected concern, show:

1. Responsible organization
2. Contact information
3. Office location
4. Official website / social page
5. Requirements, if applicable
6. Suggested reporting process
7. Escalation path
8. Related BetterMalolos resources

### Suggested route

`/saan-ako-lalapit`

---

## Priority 4 — Tubig Malolos

### Goal

Create a community-powered view of water availability and service reliability by barangay.

### Possible resident status options

- Normal
- Mahina
- Walang tubig
- Marumi / discolored

### Possible capabilities

- barangay-level water status;
- active utility advisories;
- resident reports;
- outage start time;
- historical reliability;
- low-pressure reports;
- service interruption trends;
- water-quality reports;
- escalation information.

### Suggested route

`/tubig`

---

## Priority 5 — Barangay Hub

### Goal

Make each barangay a primary unit of the BetterMalolos experience.

### Example barangay page

A page for a barangay such as Mojon could eventually show:

- barangay officials;
- contact information;
- office location;
- population;
- garbage schedule;
- water status;
- roadworks;
- flood risk;
- evacuation center;
- schools;
- health facilities;
- public projects;
- current advisories;
- citizen reports;
- useful government services.

### Suggested route structure

`/barangay`

`/barangay/[slug]`

Example:

`/barangay/mojon`

---

## Priority 6 — Project Tracker

### Goal

Make publicly funded infrastructure and civic projects easier to understand and monitor.

### Possible tracked fields

- project name;
- project ID;
- description;
- location;
- barangay;
- implementing agency;
- funding source;
- approved budget;
- contract amount;
- contractor;
- start date;
- target completion;
- official completion percentage;
- actual / community-verified status;
- project coordinates;
- photos;
- public documents;
- COA findings, where available;
- citizen verification.

### Suggested route

`/projects`

---

## Priority 7 — Commute Guide

### Goal

Make local transportation information easier to understand.

### Possible capabilities

- tricycle fare matrices;
- TODA information;
- terminals;
- jeepney routes;
- modern jeep routes;
- bus routes;
- P2P information;
- transport advisories;
- complaint instructions;
- eventually rail information where relevant.

### Suggested route

`/commute`

---

## Priority 8 — Opportunities Hub

### Goal

Aggregate opportunities relevant to residents, especially students, young professionals, job seekers, and volunteers.

### Possible categories

- full-time jobs;
- part-time jobs;
- internships;
- government vacancies;
- scholarships;
- TESDA training;
- local business hiring;
- remote work;
- volunteer opportunities.

### Possible filters

- student friendly;
- no experience required;
- within Malolos;
- PWD accessible;
- working student;
- remote / hybrid;
- internship.

### Suggested route

`/opportunities`

---

# 3. Homepage Information Architecture

The homepage should be reorganized so that community tools appear before traditional government-service listings.

## Recommended page order

1. Hero
2. Top Citizen Tools
3. Suggest an Idea / Community Input
4. Barangay Hub
5. Project Transparency
6. More Community Tools
7. Government Services
8. Volunteer / Contribute
9. About BetterMalolos

---

# 4. Hero Section

## Objective

Immediately communicate that BetterMalolos is a community-built civic platform.

## Suggested headline

> **Better tools and information for a better Malolos.**

Alternative:

> **Community-built tools for everyday life in Malolos.**

## Suggested supporting copy

BetterMalolos is an independent, citizen-built civic technology project that makes useful local information easier to find, understand, and use.

## Primary CTAs

- Explore Community Tools
- Suggest an Idea

## Secondary CTA

- Volunteer

---

# 5. Top Citizen Tools Section

## Suggested heading

> **What can BetterMalolos help you with?**

Show the four highest-priority projects first.

### Card 1

**Bantay Baha**

Flood conditions, evacuation information, passable roads, and flood-control projects.

### Card 2

**RoadWatch**

Roadworks, closures, traffic disruptions, and project timelines.

### Card 3

**Saan Ako Lalapit?**

Find the right office, agency, utility, or organization for your concern.

### Card 4

**Tubig Malolos**

Check and report water conditions in your barangay.

These may initially be marked as:

- Live
- Beta
- In Development
- Proposed

depending on implementation status.

Do not imply unfinished tools are already operational.

---

# 6. Community Suggestion Portal

BetterMalolos should introduce a structured suggestion portal in addition to:

`info@bettermalolos.org`

## Recommended route

`/ideas`

Possible alternative:

`/suggest`

Preferred: `/ideas`

## Purpose

Capture community problems, ideas, data sources, feature requests, and volunteer interest in a structured format.

This should become the main community intake system for BetterMalolos.

## Suggested landing copy

> **Have a problem or an idea for Malolos?**

> BetterMalolos is built with the community. Tell us what information, tool, dataset, or solution would help make life in Malolos better.

## Submission types

The user should first select one of the following:

1. **May problema akong gustong ibahagi**
2. **May idea ako**
3. **May data o source akong gustong i-share**
4. **May feature akong gustong i-suggest**
5. **Gusto kong tumulong gumawa nito**

## Suggested form fields

### Required

- Submission type
- Title
- Description
- Category

### Optional

- Barangay
- Exact location
- Why this matters
- Suggested solution
- Source / supporting link
- Attachment or image
- Name
- Email
- Volunteer interest
- Skills / expertise

## Suggested categories

- Flooding
- Traffic
- Roads
- Water
- Electricity
- Garbage
- Public Transport
- Health
- Jobs / Opportunities
- Government Services
- Public Projects
- Transparency
- Environment
- Heritage
- Safety
- Accessibility
- Barangay Information
- Other

## Privacy

Allow anonymous submissions.

Clearly explain:

- public submissions may be reviewed before publication;
- personally identifiable information should not be exposed publicly by default;
- email addresses should remain private;
- submissions may be summarized or converted into public roadmap items.

---

# 7. Public Ideas / Community Roadmap

Eventually `/ideas` can also expose approved community ideas publicly.

## Suggested statuses

- Suggested
- Under Review
- Researching
- Looking for Volunteers
- Planned
- Building
- Beta
- Live
- Not Planned
- Archived

## Suggested public card fields

- Idea title
- Category
- Barangay, if relevant
- Short description
- Community impact
- Status
- Number of supporters
- Volunteers needed
- Related project
- Last updated

## Future capability

Allow residents to support or upvote ideas.

Avoid turning this into a popularity contest.

Impact, feasibility, urgency, evidence, and underserved communities should also influence prioritization.

---

# 8. Barangay Hub Homepage Section

## Suggested heading

> **Explore your Barangay**

## Supporting copy

Find useful information, services, projects, advisories, and community updates for your barangay.

## UI idea

Provide:

- search;
- dropdown;
- grid of barangays; or
- map.

Selecting a barangay should navigate to:

`/barangay/[slug]`

---

# 9. Project Transparency Homepage Section

## Suggested heading

> **Know what’s being built**

## Purpose

Surface ongoing or important infrastructure and public projects.

Possible homepage cards:

- road projects;
- drainage;
- flood control;
- public buildings;
- utility work.

Each card can show:

- project name;
- barangay;
- budget;
- agency;
- status;
- expected completion.

CTA:

**View all projects**

---

# 10. More Community Tools Section

After the primary citizen tools, surface:

- Commute Guide
- Opportunities Hub
- Emergency Directory
- Waste Collection
- Health Facilities
- Utility Advisories

These can be progressively added.

---

# 11. Government Services Section

Do not remove existing LGU-related service information.

Instead, move it lower on the homepage.

## Suggested heading

> **Find Government Services**

Possible categories:

- Business permits
- Civil registry
- Taxes
- Building permits
- Health services
- Social services
- Senior citizen services
- PWD services
- Local permits
- Government contacts

## Principle

BetterMalolos should still make government services easier to discover, but these services should no longer define the homepage.

---

# 12. Volunteer Section

## Suggested heading

> **Help build BetterMalolos**

## Supporting message

BetterMalolos is built by volunteers from the community.

Invite:

- software engineers;
- designers;
- data analysts;
- researchers;
- students;
- writers;
- photographers;
- GIS / mapping contributors;
- community organizers;
- marketers;
- accessibility advocates;
- civic-minded residents.

## CTA

**Volunteer**

Suggested route:

`/volunteer`

---

# 13. Product Navigation

The header should reflect the resident-focused homepage flow while preserving access to the
useful pages already available today.

## Recommended top-level navigation

1. **Community Tools**
2. **Barangays**
3. **Projects & Budget**
4. **Services**
5. **City Information**
6. **Get Involved**

The BetterMalolos logo should link to the homepage, so a separate **Home** menu item is not
necessary on desktop.

## Suggested menu structure

### Community Tools

- Bantay Baha
- RoadWatch
- Saan Ako Lalapit?
- Tubig Malolos
- All Community Tools

### Barangays

- Find My Barangay
- Browse All Barangays

### Projects & Budget

- Project Tracker
- Infrastructure Projects
- City Budget & Transparency

This group replaces **Transparency** as a standalone top-level item and connects public spending
to the projects residents can see in their communities.

### Services

- Browse Government Services
- Emergency Contacts
- Government and Utility Contacts

Keep the existing service categories available from the services landing page rather than placing
every category in the header dropdown.

### City Information

- Government and Officials
- Malolos Statistics
- News
- Ordinances and Resolutions

This group consolidates the current **Government**, **Statistics**, and **Legislative** menu items.
Use plain-language labels such as **Ordinances and Resolutions** instead of internal institutional
terms such as **Legislative**.

### Get Involved

- Suggest an Idea
- Volunteer
- Share Data or a Source
- About BetterMalolos
- Contact Us

**Get Involved** should be visually distinguished from the other menu items as the header's
community participation action. Use a consistent accent treatment, such as a filled or outlined
pill with strong contrast, while retaining the same keyboard, focus, and dropdown behavior as the
other navigation items. **Suggest an Idea** belongs inside this menu rather than appearing as a
separate top-level item.

## Mobile priority

Order the mobile menu around the most useful resident actions:

1. Community Tools
2. Barangays
3. Get Involved
4. Projects & Budget
5. Services
6. City Information

Keep **Get Involved** visually distinct on mobile. Do not link unfinished tools to empty pages;
hide them until useful or label them clearly with their current status.

---

# 14. Community Tool Status

Each product or idea should visibly show maturity.

Suggested statuses:

- Proposed
- Researching
- In Development
- Beta
- Live

This is important because BetterMalolos should not present planned features as already available.

---

# 15. Design Principle

The user experience should be based on questions residents actually ask.

Examples:

Instead of:

> Traffic Management Division

Use:

> **May problema sa traffic?**

Instead of:

> City Engineering Office

Use:

> **May sirang kalsada o drainage?**

Instead of:

> City Disaster Risk Reduction and Management Office

Use:

> **May baha o emergency?**

The system can reveal the responsible institution after the resident selects the problem.

---

# 16. Core BetterMalolos Philosophy

BetterMalolos should act as a citizen-friendly layer over fragmented local information.

The platform should connect:

**Citizen concern**

↓

**Useful information**

↓

**Responsible institution**

↓

**Public data**

↓

**Community verification**

↓

**Action or solution**

BetterMalolos should not require users to understand institutional bureaucracy.

---

# 17. Evidence and Neutrality

All transparency-oriented tools should emphasize evidence.

Whenever possible, project or government information should link to sources such as:

- official LGU records;
- City Government announcements;
- Provincial Government sources;
- DPWH records;
- procurement information;
- COA reports;
- PSA datasets;
- official utility advisories;
- public documents;
- credible news sources;
- community-submitted evidence.

## Important

BetterMalolos should remain:

- independent;
- non-partisan;
- community-led;
- open source;
- evidence-based;
- transparent about sources.

The platform may identify failures, discrepancies, delays, or service problems when supported by evidence, but should avoid becoming an anti-administration or personality-driven platform.

---

# 18. Suggested Homepage Flow

```text
Hero
│
├── Explore Community Tools
│   ├── Bantay Baha
│   ├── RoadWatch
│   ├── Saan Ako Lalapit?
│   └── Tubig Malolos
│
├── Suggest an Idea
│
├── Explore Your Barangay
│
├── Know What's Being Built
│   └── Project Tracker
│
├── More Community Tools
│   ├── Commute Guide
│   ├── Opportunities Hub
│   ├── Emergency Directory
│   ├── Waste Collection
│   └── Health / Utilities
│
├── Find Government Services
│
├── Volunteer
│
└── About BetterMalolos
```

## Suggested Main Menu Bar

```text
BetterMalolos Logo → Home
│
└── Main Menu
    ├── Community Tools
    │   ├── Bantay Baha
    │   ├── RoadWatch
    │   ├── Saan Ako Lalapit?
    │   ├── Tubig Malolos
    │   └── All Community Tools
    │
    ├── Barangays
    │   ├── Find My Barangay
    │   └── Browse All Barangays
    │
    ├── Projects & Budget
    │   ├── Project Tracker
    │   ├── Infrastructure Projects
    │   └── City Budget & Transparency
    │
    ├── Services
    │   ├── Browse Government Services
    │   ├── Emergency Contacts
    │   └── Government and Utility Contacts
    │
    ├── City Information
    │   ├── Government and Officials
    │   ├── Malolos Statistics
    │   ├── News
    │   └── Ordinances and Resolutions
    │
    └── Get Involved [Highlighted]
        ├── Suggest an Idea
        ├── Volunteer
        ├── Share Data or a Source
        ├── About BetterMalolos
        └── Contact Us
```

---

# 19. Recommended Immediate Scope for v1.0.3

Version 1.0.3 does not need to implement every proposed tool.

The immediate goal should be to establish the new product direction.

## Must have

### Homepage

- Reorder homepage around community needs.
- Add Top Citizen Tools section.
- Present proposed tools with accurate status labels.
- Move Government Services below community-focused sections.
- Add prominent Suggest an Idea CTA.
- Add Volunteer CTA.
- Add Barangay Hub teaser.
- Add Project Tracker teaser.

### Ideas Portal

Implement `/ideas` with:

- submission type;
- title;
- description;
- category;
- barangay;
- optional contact information;
- volunteer interest;
- anonymous submission option.

### Community roadmap

If feasible, create an initial static or data-driven roadmap showing the eight priority projects.

---

# 20. Initial Priority Order

Codex should preserve this order when displaying roadmap items unless changed by future product decisions.

1. Bantay Baha
2. RoadWatch
3. Saan Ako Lalapit?
4. Tubig Malolos
5. Barangay Hub
6. Project Tracker
7. Commute Guide
8. Opportunities Hub

---

# 21. Definition of Success for v1.0.3

A first-time visitor should understand within a few seconds that:

1. BetterMalolos is community-built.
2. It is independent from the LGU.
3. It helps residents with real everyday local problems.
4. Government services are still available but are not the sole purpose of the platform.
5. Residents can suggest what should be built next.
6. Volunteers can choose concrete civic-tech projects to work on.

The homepage should feel less like:

> **“Here are the services of the City Government.”**

and more like:

> **“What do you need in Malolos, and how can the community help solve it?”**

---

# 22. Future Research Backlog

Continue researching community needs from:

- public Facebook discussions;
- Reddit;
- local news;
- barangay pages;
- official city sources;
- Provincial Government of Bulacan;
- DPWH;
- COA;
- PSA;
- utilities;
- public transport sources;
- OpenStreetMap;
- BetterMalolos suggestion submissions.

Potential future problem areas to validate:

- waste collection;
- electricity interruptions;
- healthcare discovery;
- emergency services;
- local accessibility;
- heritage preservation;
- environmental concerns;
- jobs and internships;
- parking;
- public safety;
- government document navigation.

---

# 23. Version Note

**BetterMalolos v1.0.3**

Primary theme:

> **From an LGU-style service portal to a community-first civic platform.**

This version establishes the foundation for BetterMalolos to become the citizen interface for Malolos: useful local information, community-built tools, public transparency, and a structured way for residents to propose what should be built next.
