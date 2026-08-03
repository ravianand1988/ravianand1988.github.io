# ravianand1988.github.io

Personal portfolio site for Ravi Anand Kumar — Frontend Tech Lead. Live at https://ravianand1988.github.io/.

A single-page Angular app (hero, about, experience, projects, skills, contact — anchor-linked sections, no router)
so it works cleanly as a GitHub Pages user site with no server-side routing.

## Development

```bash
npm install
npm start        # http://localhost:4200
```

## Deployment

Pushing to `master` triggers `.github/workflows/deploy.yml`, which builds the app and publishes it via GitHub
Pages' native Actions deployment (`actions/upload-pages-artifact` + `actions/deploy-pages`). In the repo's
**Settings → Pages**, the source needs to be set to **GitHub Actions** (not "Deploy from a branch") for this to work.

## Updating content

Section content lives in each component under `src/app/sections/*` — mostly plain data arrays
(`experience.component.ts`, `projects.component.ts`, `skills.component.ts`) plus static markup for hero/about/contact.

To add a profile photo: drop the image at `src/assets/photo.jpg` and swap the `.avatar-placeholder` div in
`hero.component.html` for the commented-out `<img>` tag.
