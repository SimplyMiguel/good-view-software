# Good View Software

One-page marketing site for Good View Software, an independent software developer in Bakersfield, California.

## Stack

- [Astro](https://astro.build) (static output, no adapter)
- [Tailwind CSS v4](https://tailwindcss.com/docs/installation/framework-guides/astro) via `@tailwindcss/vite`

## Editing content

- Page copy and sections: `src/pages/index.astro`
- Business name, location, operator, and contact email: `src/config.ts`
- Theme colors and fonts: `src/styles/global.css`

`site.email` is `null` until business email is ready, which shows the "Project inquiries opening soon" notice. Set it to the real address to render the "Email about a project" button; no other file needs to change.

## Commands

| Command           | Action                               |
| :---------------- | :----------------------------------- |
| `npm install`     | Install dependencies                 |
| `npm run dev`     | Start dev server at `localhost:4321` |
| `npm run build`   | Build production site to `./dist/`   |
| `npm run preview` | Preview the production build         |

## Deploying to Vercel

Vercel auto-detects Astro. Import the repo and keep the defaults:

- Framework preset: **Astro**
- Build command: `npm run build`
- Output directory: `dist`

Static output needs no adapter or environment variables.