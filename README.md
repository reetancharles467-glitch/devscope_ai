# DevScope AI | GitHub Developer Analyzer

**Analyze. Understand. Grow.**

DevScope AI is a dashboard that analyzes any public GitHub profile using the official GitHub REST API. It is built with plain HTML, CSS and JavaScript, with no backend, no framework and no API key.

## Features
- Username search with Enter key support and skeleton loading states
- Profile card: avatar, name, bio, location, followers, following, repos, gists, join date and link
- Repository analytics: top repositories with stars, forks, language, created and last updated dates
- Developer Score (followers + stars + repositories + forks) with automatic badges:
  🌱 Beginner Builder, 🚀 Active Developer, 🔥 Open Source Explorer, ⭐ Code Architect
- Language analytics: most used language, distribution and percentages, with Chart.js charts
- Statistics: total repos, stars, forks, average stars per repo, account age
- Error cards for invalid usernames, rate limits, network failures and empty profiles
- Dark and light mode, copy profile link, share analysis, export report as PNG, animated counters
- Responsive layout for Android, iPhone and desktop

## API usage
| Endpoint | Used for |
|----------|----------|
| `GET https://api.github.com/users/{username}` | Profile data |
| `GET https://api.github.com/users/{username}/repos?per_page=100` | Repository analytics |

Both requests run in parallel and results are cached per username, so repeat searches make no extra calls. Unauthenticated requests are limited to 60 per hour per IP address. Each analysis uses 2 requests. Only the 100 most recently updated repositories are analyzed.

Languages are counted by the primary language of each repository.

## Deployment (GitHub Pages)
1. Create a new public repository.
2. Upload `index.html`, `style.css`, `script.js` and `README.md`.
3. Go to Settings > Pages, choose "Deploy from a branch", select `main` and the `/ (root)` folder, then save.
4. Open `https://<your-username>.github.io/<repository-name>/`.

You can also link straight to an analysis with `?user=<username>`.

## Screenshots
_Add screenshots here._

| Dashboard | Charts | Mobile |
|-----------|--------|--------|
| _placeholder_ | _placeholder_ | _placeholder_ |

## Built with
HTML5, CSS3, vanilla JavaScript, [Chart.js](https://www.chartjs.org/) and [html2canvas](https://html2canvas.hertzen.com/), both loaded from a CDN.

Built by Reetan Charles
