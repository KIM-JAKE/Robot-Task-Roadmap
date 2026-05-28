# Robot Task Roadmap

Interactive GitHub Pages for a VLA robot task roadmap.

[![Homepage](https://img.shields.io/badge/Homepage-Robot--Task--Roadmap-blue?style=for-the-badge&logo=githubpages)](https://kim-jake.github.io/Robot-Task-Roadmap/)

## GitHub Pages

Use the `docs/` folder as the Pages source:

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Select the default branch and `/docs`.
5. Save.

The site entrypoint is `docs/index.html`.

## Editing Tasks

Task data lives in `docs/data.js`.

Each task supports:

- `task`
- `category`
- `hardware`
- `embodiment`
- `sourceType`
- `sourceOrg`
- `frontierExample`
- `difficulty`
- `demoTier`
- `complexity`
- `rationale`
- `reference`
- `notes`
- `imageUrl`

Add a representative image by setting `imageUrl` to a lab photo or licensed/public image URL.
