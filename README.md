# BetterMalolos.org

A civic-tech initiative providing transparent access to municipal services, programs, and public funds of LGU Malolos, Bulacan, Philippines.

![Version](https://img.shields.io/badge/version-1.0.3-green)
![License](https://img.shields.io/badge/license-MIT%20%7C%20CC%20BY%204.0-blue)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)

## About

BetterMalolos.org is a volunteer-driven, open-source project that empowers the people of Malolos with easy access to local government information. The platform aggregates public data from official government portals and presents it in a user-friendly, accessible format.

**Cost to the People of Malolos = ₱0**

## Live Site

Visit the live website: [https://bettermalolos.org](https://bettermalolos.org)

## Technology Stack

| Category            | Technologies                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Frontend**        | HTML5, CSS3, JavaScript (ES6+)                                                                           |
| **Styling**         | Custom CSS, CSS Variables, Flexbox, CSS Grid, Responsive Design                                          |
| **Icons**           | Bootstrap Icons (CDN)                                                                                    |
| **Fonts**           | Google Fonts (Inter)                                                                                     |
| **Maps**            | Leaflet.js, OpenStreetMap                                                                                |
| **Charts**          | Chart.js (Canvas-based)                                                                                  |
| **Animations**      | Lottie (dotlottie-player web component)                                                                  |
| **Data Format**     | JSON                                                                                                     |
| **APIs**            | Open-Meteo (weather), exchangerate.host and ExchangeRate-API (currency)                                  |
| **Build Tools**     | Node.js, npm, Bash, Babel (@babel/preset-env)                                                            |
| **Minification**    | html-minifier-terser, clean-css-cli, terser                                                              |
| **Code Formatting** | Prettier (auto-format on commit via git pre-commit hook)                                                 |
| **Testing**         | Playwright (browser, responsive, accessibility, and navigation tests), Lighthouse CI                     |
| **Version Control** | Git, GitHub                                                                                              |
| **Server**          | Apache (.htaccess), mod_rewrite, mod_deflate                                                             |
| **Hosting**         | cPanel (Production), Python HTTP Server (Development)                                                    |
| **PWA**             | Service Worker (versioned caching, install prompt, seamless updates), Web App Manifest, offline fallback |
| **SEO**             | Open Graph, Twitter Cards, XML Sitemap, robots.txt                                                       |
| **Security**        | HTTPS, CSP Headers, HSTS, X-Frame-Options                                                                |
| **Analytics**       | Google Analytics (gtag.js)                                                                               |
| **Accessibility**   | WCAG 2.1, ARIA, Semantic HTML                                                                            |
| **Performance**     | GZIP Compression, Browser Caching, Asset Minification                                                    |

## Global Colorway

The site uses the 1997 Philippine ₱10 note as its visual reference: warm security-paper neutrals, engraved maroon, muted teal, and restrained terracotta. The palette is defined once in [`assets/css/style.css`](assets/css/style.css) under `:root`; pages and component styles must use these CSS custom properties rather than adding page-specific brand hex values.

| Token                  | Hex       | Role                                          |
| ---------------------- | --------- | --------------------------------------------- |
| `--color-primary`      | `#713B4A` | Engraved maroon; primary actions and headings |
| `--color-primary-dark` | `#542633` | Hover and strong contrast state               |
| `--color-secondary`    | `#3D7772` | Security-print teal; secondary UI             |
| `--color-accent`       | `#B96D5B` | Terracotta; limited emphasis                  |
| `--color-success`      | `#4D786A` | Muted green status state                      |
| `--color-danger`       | `#8B3345` | Deep red status state                         |
| `--color-info`         | `#4C7E7C` | Informational teal state                      |
| `--color-bg`           | `#FFFDF9` | Note-paper page surface                       |
| `--color-bg-alt`       | `#F7EEE5` | Warm alternate surface                        |
| `--color-text`         | `#332832` | Primary ink text                              |
| `--color-text-light`   | `#6E6264` | Secondary ink text                            |

When the palette is revised, change the token values in `assets/css/style.css` (and the PWA `theme_color` in `manifest.webmanifest`) rather than editing individual pages. Keep the RGB companion tokens aligned with their matching hex values when changing a color used in translucent effects.

## Key Features

| Feature                           | Description                                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Municipal Services Directory**  | Guides to city services, offices, requirements, fees, and processing times                                                    |
| **Government Directory**          | Elected officials, departments, barangays, and public contact information                                                     |
| **Budget & Project Transparency** | City budget data, fiscal reports, and sourced DPWH infrastructure-project information for Malolos                             |
| **Legislative Records**           | Searchable ordinances and resolutions with source links                                                                       |
| **City Statistics**               | Population, demographics, economic indicators, and competitiveness data                                                       |
| **News & Public Information**     | Community-focused news and announcements, with tooling to support sourced updates                                             |
| **Ideas & Community Roadmap**     | A public form for suggesting problems, features, datasets, corrections, and sources, plus a roadmap of proposed civic tools   |
| **Proposed Community Tools**      | Bantay Baha, RoadWatch, Saan Ako Lalapit?, Tubig Malolos, Barangay Hub, Project Tracker, Commute Guide, and Opportunities Hub |
| **Real-time Information**         | Weather, currency exchange rates, Philippine time, and emergency contact information                                          |
| **Malolos History & Quiz**        | A bilingual historical timeline and an interactive quiz about Malolos history and culture                                     |
| **Progressive Web App**           | Installable experience, service-worker caching, seamless updates, and an offline page with emergency hotlines                 |
| **English & Filipino**            | Site-wide language switching with English fallback                                                                            |
| **Accessible, Responsive UI**     | Semantic HTML, ARIA, keyboard support, responsive navigation, and mobile-friendly layouts                                     |
| **Search, Clean URLs & SEO**      | Service autocomplete, extension-free URLs, metadata, structured data, sitemap, and social sharing cards                       |

### Temporarily Hidden (Work in Progress)

The following features remain in the codebase but are hidden from the public interface until they are ready:

- **Enhancing Appointment Services** homepage section (Mayor's Office/OASYS appointment CTA)
- **Legislative** main navigation menu and its dropdown links

## Quick Start

```bash
# Clone the repository
git clone https://github.com/francisdiaz22/bettermalolos.git

# Navigate to project directory
cd bettermalolos

# Install dependencies
npm install

# Start development server (with clean URL support)
npm run dev

# Open in browser
# http://localhost:8000
```

## Installation

### Prerequisites

| Requirement | Version | Purpose                            |
| ----------- | ------- | ---------------------------------- |
| Node.js     | v16+    | Build tools and package management |
| npm         | v8+     | Dependency management              |
| Python 3    | v3.x    | Local development server           |
| Git         | Latest  | Version control                    |

### Setup Steps

1. **Clone the repository**

```bash
git clone https://github.com/francisdiaz22/bettermalolos.git
cd bettermalolos
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the development server**

```bash
npm run dev
```

4. **Open in browser**
   - Development: http://localhost:8000
   - Production preview: http://localhost:8080 (after build)

## Usage

### Development Commands

| Command                      | Description                                                           |
| ---------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                | Start local development server (port 8000)                            |
| `npm run build`              | Build minified production files to `dist/` (auto-bumps patch version) |
| `npm run build -- --no-bump` | Build without incrementing the version number                         |
| `npm run build:minor`        | Bump minor version and build                                          |
| `npm run build:major`        | Bump major version and build                                          |
| `npm run serve:dist`         | Serve production build (port 8080)                                    |
| `npm run version:check`      | Display current version                                               |
| `npm run version:patch`      | Bump patch version only                                               |
| `npm run version:minor`      | Bump minor version only                                               |
| `npm run version:major`      | Bump major version only                                               |
| `npm run format`             | Format all files with Prettier                                        |
| `npm run format:check`       | Check formatting without writing changes                              |

### Production Deployment

1. **Build production files**

```bash
npm run build
```

2. **Output location**
   - Minified files are generated in the `dist/` folder
   - Original size: ~17MB → Minified: ~3.9MB

3. **Deploy to server**
   - Upload contents of `dist/` to your web server's `public_html` directory
   - Ensure `.htaccess` is included for clean URLs, CSP headers, and security

### File Permissions (cPanel)

| Type        | Permission | Numeric |
| ----------- | ---------- | ------- |
| Files       | rw-r--r--  | 644     |
| Directories | rwxr-xr-x  | 755     |

## Multi-language Support (i18n)

The site supports two languages with full translation coverage:

| Language | Code  | Status   |
| -------- | ----- | -------- |
| English  | `en`  | Complete |
| Filipino | `fil` | Complete |

The site uses a `TranslationEngine` in `assets/js/translations.js` with `data-i18n` attributes on HTML elements and falls back to English for missing keys.

## Project Architecture

The repository keeps editable static source files separate from the generated production build:

| Layer                | Location        | Purpose                              |
| -------------------- | --------------- | ------------------------------------ |
| **Static Source**    | Root HTML files | Source of truth for the website      |
| **Production Build** | `dist/`         | Minified build for cPanel deployment |

The build script (`build.sh`) generates `dist/` from the static source.

## Project Structure

```
bettermalolos/
├── assets/
│   ├── css/              # Stylesheets (9 files)
│   ├── js/               # JavaScript modules (18 files)
│   ├── images/           # Images, icons, banners, partner logos
│   └── animation/        # Lottie JSON animation files
├── data/                 # JSON data files
│   ├── officials.json    # Government officials data
│   ├── services.json     # Municipal services data
│   ├── news.json         # News and announcements
│   ├── ordinances.json   # Legislative ordinances
│   └── resolutions.json  # Legislative resolutions
├── services/             # Service category pages (11 pages)
├── service-details/      # Individual service pages (22 pages)
├── government/           # Government directory pages
├── legislative/          # Legislative framework pages
├── budget/               # Budget transparency page
├── statistics/           # Municipal statistics page
├── news/                 # News and announcements page
├── ideas/                 # Community ideas form and proposed-tools roadmap
├── contact/              # Contact information page
├── faq/                  # Frequently asked questions
├── sitemap/              # HTML sitemap page
├── tests/                # Playwright browser and accessibility tests
├── scripts/              # Build, version, navigation, and translation scripts
│   └── bump-version.js   # Cross-platform Node.js version bump script
├── dist/                 # Production build output (gitignored)
├── index.html            # Homepage
├── sw.js                 # Service worker (versioned caching, offline support)
├── manifest.webmanifest  # PWA web app manifest
├── offline.html          # Offline fallback page with emergency hotlines
├── serve.py              # Local dev server with clean URL rewriting
├── .htaccess             # Apache configuration (CSP, rewrites, caching)
├── .prettierrc           # Prettier code formatting configuration
├── .prettierignore       # Prettier ignore patterns
├── version.json          # Version tracking (auto-bumped on commit)
├── build.sh              # Build automation script
├── babel.config.json     # Babel transpilation configuration
├── package.json          # Node.js configuration
└── README.md             # Project documentation
```

## Contributing

Contributions from developers, designers, researchers, writers, translators, and Malolos residents are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, contribution areas, coding guidelines, and the pull request process.

## Data Sources

All public information is sourced from official government portals:

| Source                             | URL                                                                     | Data Type                 |
| ---------------------------------- | ----------------------------------------------------------------------- | ------------------------- |
| LGU Malolos Official Website       | [malolos.gov.ph](#TODO-add-official-malolos-portal)                     | Services, Officials       |
| Sangguniang Bayan ng Malolos       | [sangguniangbayan.malolos.gov.ph](#TODO-add-malolos-legislative-portal) | Ordinances, Resolutions   |
| Bureau of Local Government Finance | [blgf.gov.ph](https://blgf.gov.ph/)                                     | Budget, Financial Reports |
| Philippine Statistics Authority    | [psa.gov.ph](https://psa.gov.ph/)                                       | Demographics, Census      |
| DTI CMCI Portal                    | [cmci.dti.gov.ph](https://cmci.dti.gov.ph/)                             | Competitive Index         |

## License

This project is dual-licensed:

| License     | Applies To  | Details                                |
| ----------- | ----------- | -------------------------------------- |
| MIT License | Source Code | Free to use, modify, and distribute    |
| CC BY 4.0   | Content     | Attribution required for content reuse |

See [LICENSE](LICENSE) for full details.

## Contact

| Channel  | Link                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| Website  | [bettermalolos.org](https://bettermalolos.org)                                |
| Email    | info@bettermalolos.org                                                        |
| Facebook | [@bettermalolos.org](https://www.facebook.com/BetterMalolos.org)              |
| LinkedIn | [BetterMalolos](https://www.linkedin.com/company/bettermalolos/)              |
| Discord  | [Join Community](https://discord.com/invite/qeSu7RJkjQ)                       |
| GitHub   | [francisdiaz22/bettermalolos](https://github.com/francisdiaz22/bettermalolos) |

## Acknowledgments

- [BetterGov.ph](https://bettergov.ph) for the civic-tech initiative in the Philippines
- LGU Malolos for public data availability and transparency
- All volunteers and contributors who dedicate their time
- Open-source community for the tools and libraries used
- Citizens of Malolos for their feedback and support

---

Made for the people of Malolos, Bulacan
