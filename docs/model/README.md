# Aphrona Halo 3D model

- `site/assets/models/halo-mask.glb`: glTF binary, about 51k triangles, about 1.38 MB, no textures, no Draco.
- Rebuild: `Blender -b -P docs/model/build_halo.py -- <out_dir>` (Blender 5.2). This writes the GLB, the .blend file and three previews (Cycles).
- Reference notes: `shape-notes.md`. v2 is matched to the HALO PRO campaign photo.

Nodes: `Shell` (white body, black inner liner), `Visor` (mirror gold), `MouthSlit` (dark smile vent),
`Pods` (temple capsules, touch plates, "A" logo, strap rods), `Strap` (crown + back bands), `NeckCover`,
`LEDs` (808 beads, inner face-side surface only, material `LED_Emissive`, which is red and emissive).

To recolour the LEDs in three.js, set the `LED_Emissive` material's `emissive` (and `color`). `src/mask.js` already does this by name.
The model faces +Z, +Y is up, the origin is at the bounding-box centre, and it is 2.6 units tall.
