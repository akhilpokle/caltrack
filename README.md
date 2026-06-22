# CalTrack

Personal nutrition tracker — Vite + React + TypeScript PWA, installable on iPhone.

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:5173/caltrack/

## Deploy to GitHub Pages

1. Create a GitHub repo named `caltrack`.
2. Push this project to the `main` branch.
3. In the repo → Settings → Pages → Source: deploy from branch `gh-pages`.
4. The Actions workflow builds and deploys automatically on every push to `main`.

Live at: `https://<your-username>.github.io/caltrack/`

## Regenerate icons

```bash
npm run gen-icons
```

Overwrites `public/icons/` with solid-colour placeholder PNGs. Replace with real artwork anytime.
