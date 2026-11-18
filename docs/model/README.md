# Aphrona Halo 3D model

- `site/assets/models/halo-mask.glb`: glTF binary, about 43k triangles, about 1.25 MB, no textures, no Draco.
- Rebuild: `Blender -b -P docs/model/build_halo.py -- <out_dir>` (Blender 5.2). This writes the GLB, the .blend file and both previews.
- Shape reference notes: `shape-notes.md`.

Nodes: `Shell` (white body, black inner liner, temple pods), `Visor` (gold front), `EyeWindows`
(semi-transparent lenses), `NeckCover`, `Strap` (two bands), `Button` (touch buttons), `LEDs`
(808 emitter beads, inner face-side surface only, material `LED_Emissive`, which is red and emissive).

To recolour the LEDs in three.js, set the `LED_Emissive` material's `emissive` (and `color`).
The model faces +Z (toward the default camera), +Y is up, and the origin is at the centre of the bounding box.
Height is about 2.6 units (1 unit is about 10 cm).
