# Deploy as a GitHub Pages user site via GitHub Actions

The site is hosted at `mlhv.github.io` (a GitHub Pages *user* site) rather than a project site at `mlhv.github.io/my-portfolio`, requiring the repository to be renamed from `my-portfolio` to `mlhv.github.io`. This is separate from and does not conflict with the existing `mlhv` profile-README repo. Deployment builds and publishes on push to `main` via a GitHub Actions workflow, chosen over manually pushing to a `gh-pages` branch for the cleaner URL and as a real CI/CD exercise.
