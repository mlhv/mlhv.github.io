# Cast Members are community glTF models

The owner wants the Cast Members "as close to the real characters as possible," so the voxel figures are replaced with rigged glTF models. These are community-made fan models under CC0, CC BY or CC BY-SA, plus a VRoid avatar of the owner. Models ripped from the games are never used. They look the most accurate, but the site is public under the owner's name, and many rips are re-uploaded with licences the uploader had no right to give. Each model is optimised once by `npm run add-model` (WebP textures at most 1024 px, meshopt geometry). Only the optimised `.glb` is committed, at most 1.5 MB, and a test enforces that. Originals stay outside the repo.

A Cast Member without a model, or whose model fails to load, shows a neutral Stand-in. The voxel character code is deleted rather than kept as a fallback, because the owner rejected the voxel look and a mismatched fallback would bring it back. Animation comes from clips in the model file through `AnimationMixer`, not from code. Only rigged models qualify.

## Considered options

- **Optimise at build time** with originals in the repo: rejected. Originals are 10–50 MB each and would bloat the repo or need Git LFS.
- **Load from Sketchfab or a CDN at runtime:** rejected. It depends on a third party staying up and keeping its licence terms, and gives no control over compression.
