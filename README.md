# Good View Software

Marketing site for Good View Software, an independent software consultancy.

## Stack

- [Astro](https://astro.build) (static output, no adapter)
- [Tailwind CSS v4](https://tailwindcss.com/docs/installation/framework-guides/astro) via `@tailwindcss/vite`

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start dev server at `localhost:4321`        |
| `npm run build`   | Build production site to `./dist/`          |
| `npm run preview` | Preview the production build locally        |

## Deploying to Vercel

Vercel auto-detects Astro. Import the repo, leave the defaults:

- Framework preset: **Astro**
- Build command: `npm run build`
- Output directory: `dist`

Static output needs no adapter or environment variables. Add the production
domain in Vercel, then update `site` in `astro.config.mjs` if it changes.