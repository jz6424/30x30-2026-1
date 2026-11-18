"""Build the Aphrona Halo LED mask in Blender (headless).

Usage:
  Blender -b -P build_halo.py -- <out_dir>

Units: 1 Blender unit = 10 cm. The mask is about 2.6 units tall.
The front of the mask faces -Y in Blender, so after the glTF +Y-up conversion it faces +Z
(the three.js / glTF convention for "toward the viewer").

Objects: Shell (white body + black liner + temple pods), Visor (gold), EyeWindows,
NeckCover, Strap, Button, LEDs (one joined mesh, emissive red, inner surface only).
"""
import bpy, bmesh, math, sys, os, json
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else os.path.dirname(__file__))
RENDER = "--no-render" not in argv

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------------------------------------------------------- shape
Z_TOP, Z_CHIN = 1.30, -0.50
PHI_MAX = math.radians(100)
A0, B0 = 0.80, 0.84
T_SHELL, T_NECK, T_VISOR = 0.03, 0.025, 0.012

EYE_X, EYE_Z, EYE_RX, EYE_RZ = 0.31, 0.55, 0.165, 0.080
SLOT_TOP, SLOT_BOT, SLOT_HW_TOP, SLOT_HW_BOT = 0.40, -0.22, 0.045, 0.105

NZ_BOT = -1.30
NPHI = math.radians(90)
PV = math.radians(62)


def lerp(a, b, t):
    return a + (b - a) * t


def ab(z):
    t = (z - Z_CHIN) / (Z_TOP - Z_CHIN)
    a = A0 * (1.0 - 0.20 * (1 - t) ** 2 - 0.06 * t ** 3)
    b = B0 * (1.0 - 0.10 * (1 - t) ** 2 - 0.12 * t ** 3)
    if t > 0.82:  # forehead curls back over the hairline
        k = (t - 0.82) / 0.18
        a *= 1 - 0.10 * k * k
        b *= 1 - 0.14 * k * k
    return a, b


def ab_neck(z):
    if z >= Z_CHIN:
        a, b = ab(z)
    else:
        a0, b0 = ab(Z_CHIN)
        k = ((Z_CHIN - z) / (Z_CHIN - NZ_BOT)) ** 1.5
        a, b = lerp(a0, 0.70, k), lerp(b0, 0.66, k)
    return a * 0.965, b * 0.965


def z_top(phi):
    return Z_TOP - 0.28 * (phi / PHI_MAX) ** 2


def z_bot(phi):
    return Z_CHIN + 0.38 * (abs(phi) / PHI_MAX) ** 1.5


def neck_top(phi):
    return z_bot(phi) + 0.03


def neck_bot(phi):
    return NZ_BOT + 0.12 * (phi / NPHI) ** 2


def pt(abf, phi, z):
    a, b = abf(z)
    return Vector((a * math.sin(phi), -b * math.cos(phi), z))


def normal(abf, phi, z, h=1e-4):
    a, b = abf(z)
    a2, b2 = abf(z + h)
    dphi = Vector((a * math.cos(phi), b * math.sin(phi), 0))
    dz = Vector(((a2 - a) / h * math.sin(phi), -(b2 - b) / h * math.cos(phi), 1))
    return dphi.cross(dz).normalized()  # outward


def in_eye(x, z, grow=1.0):
    return ((abs(x) - EYE_X) / (EYE_RX * grow)) ** 2 + ((z - EYE_Z) / (EYE_RZ * grow)) ** 2 < 1


def in_slot(x, z, grow=0.0):
    if z > SLOT_TOP + SLOT_HW_TOP + grow or z < SLOT_BOT - 0.06 - grow:
        return False
    zc = min(max(z, SLOT_BOT), SLOT_TOP)
    hw = lerp(SLOT_HW_BOT, SLOT_HW_TOP, (zc - SLOT_BOT) / (SLOT_TOP - SLOT_BOT))
    return abs(x) < hw + grow


# ---------------------------------------------------------------- materials
def principled(name, color, rough=0.4, metal=0.0, emit=None, alpha=1.0, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if coat:
        p.inputs["Coat Weight"].default_value = coat
    if emit:
        p.inputs["Emission Color"].default_value = (*emit[0], 1)
        p.inputs["Emission Strength"].default_value = emit[1]
    if alpha < 1:
        p.inputs["Alpha"].default_value = alpha
        for attr, val in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
            try:
                setattr(m, attr, val)
            except Exception:
                pass
    m.diffuse_color = (*color, alpha)
    return m


M_WHITE = principled("Shell_White", (0.90, 0.885, 0.86), rough=0.22, coat=0.4)
M_LINER = principled("Liner_Black", (0.015, 0.015, 0.017), rough=0.55)
M_GOLD = principled("Visor_Gold", (0.90, 0.58, 0.28), rough=0.14, metal=0.9)
M_WIN = principled("Visor_Window", (0.95, 0.80, 0.63), rough=0.05, metal=0.3, alpha=0.45)
M_STRAP = principled("Strap_Grey", (0.72, 0.70, 0.67), rough=0.65)
M_BTN = principled("Button_Champagne", (0.86, 0.82, 0.76), rough=0.3, metal=0.2)
M_LED = principled("LED_Emissive", (1.0, 0.10, 0.06), rough=0.3,
                   emit=((1.0, 0.08, 0.04), 2.5))


# ---------------------------------------------------------------- helpers
def new_obj(name, bm, mats):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    for m in mats:
        me.materials.append(m)
    return ob


def activate(ob):
    for o in scene.objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)


def apply_all(ob):
    activate(ob)
    for md in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=md.name)


def grid_surface(name, abf, phi0, phi1, zlo, zhi, nu, nv, offset=0.0, mats=()):
    bm = bmesh.new()
    rows = []
    for j in range(nv + 1):
        s = j / nv
        row = []
        for i in range(nu + 1):
            phi = lerp(phi0, phi1, i / nu)
            z = lerp(zlo(phi), zhi(phi), s)
            p = pt(abf, phi, z)
            if offset:
                p += normal(abf, phi, z) * offset
            row.append(bm.verts.new(p))
        rows.append(row)
    for j in range(nv):
        for i in range(nu):
            f = bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
            f.smooth = True
    return new_obj(name, bm, mats)


def solidify(ob, thick, offset, mat_off=1):
    md = ob.modifiers.new("Solidify", "SOLIDIFY")
    md.thickness = thick
    md.offset = offset
    md.use_even_offset = True
    md.material_offset = mat_off
    md.material_offset_rim = 0
    return md


def bevel(ob, width, segs=2, angle=50):
    md = ob.modifiers.new("Bevel", "BEVEL")
    md.width = width
    md.segments = segs
    md.limit_method = "ANGLE"
    md.angle_limit = math.radians(angle)
    return md


def boolean(ob, cutter):
    md = ob.modifiers.new("Cut_" + cutter.name, "BOOLEAN")
    md.operation = "DIFFERENCE"
    md.object = cutter
    md.solver = "EXACT"
    return md


def prism(name, outline_xz, y0, y1):
    bm = bmesh.new()
    a = [bm.verts.new((x, y0, z)) for x, z in outline_xz]
    b = [bm.verts.new((x, y1, z)) for x, z in outline_xz]
    n = len(outline_xz)
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    for i in range(n):
        bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = new_obj(name, bm, ())
    ob.hide_render = True
    return ob


# ---------------------------------------------------------------- cutters
cutters = []
for sx in (-1, 1):
    pts = [(sx * EYE_X + EYE_RX * math.cos(t), EYE_Z + EYE_RZ * math.sin(t))
           for t in (2 * math.pi * k / 48 for k in range(48))]
    cutters.append(prism("Cut_Eye%d" % sx, pts, -1.7, -0.15))

slot = []
for k in range(9):  # bottom cap, left to right
    t = math.pi + math.pi * k / 8
    slot.append((SLOT_HW_BOT * math.cos(t), SLOT_BOT + 0.06 * math.sin(t)))
for k in range(1, 8):  # right side going up
    z = lerp(SLOT_BOT, SLOT_TOP, k / 8)
    slot.append((lerp(SLOT_HW_BOT, SLOT_HW_TOP, k / 8), z))
for k in range(9):  # top cap, right to left
    t = math.pi * k / 8
    slot.append((SLOT_HW_TOP * math.cos(t), SLOT_TOP + SLOT_HW_TOP * math.sin(t)))
for k in range(7, 0, -1):  # left side going down
    z = lerp(SLOT_BOT, SLOT_TOP, k / 8)
    slot.append((-lerp(SLOT_HW_BOT, SLOT_HW_TOP, k / 8), z))
cutters.append(prism("Cut_Slot", slot, -1.7, -0.15))

# ---------------------------------------------------------------- Shell
shell = grid_surface("Shell", ab, -PHI_MAX, PHI_MAX, z_bot, z_top, 72, 46,
                     mats=(M_WHITE, M_LINER))
solidify(shell, T_SHELL, -1)
for c in cutters:
    boolean(shell, c)
bevel(shell, 0.009)
apply_all(shell)

# temple pods (joined into Shell) and touch buttons
pods, buttons = [], []
for sx in (-1, 1):
    phi, z = sx * math.radians(91), 0.74
    p, n = pt(ab, phi, z), normal(ab, phi, z)
    up = Vector((0, 0, 1))
    tan = up.cross(n).normalized()
    up = n.cross(tan).normalized()
    basis = Matrix((n, tan, up)).transposed().to_4x4()

    bpy.ops.mesh.primitive_cube_add(size=1)
    pod = bpy.context.view_layer.objects.active
    pod.name = "Pod%d" % sx
    pod.matrix_world = Matrix.Translation(p + n * 0.035) @ basis @ Matrix.Diagonal((0.11, 0.34, 0.22, 1))
    md = pod.modifiers.new("Bevel", "BEVEL")
    md.width, md.segments, md.affect = 0.045, 3, "EDGES"
    pod.data.materials.append(M_WHITE)
    apply_all(pod)
    for f in pod.data.polygons:
        f.use_smooth = True
    pods.append(pod)

    bpy.ops.mesh.primitive_cube_add(size=1)
    btn = bpy.context.view_layer.objects.active
    btn.name = "Btn%d" % sx
    btn.matrix_world = Matrix.Translation(p + n * 0.093) @ basis @ Matrix.Diagonal((0.012, 0.24, 0.13, 1))
    md = btn.modifiers.new("Bevel", "BEVEL")
    md.width, md.segments = 0.005, 2
    btn.data.materials.append(M_BTN)
    apply_all(btn)
    buttons.append(btn)

activate(shell)
for o in pods:
    o.select_set(True)
bpy.ops.object.join()
shell = bpy.context.view_layer.objects.active
shell.name = shell.data.name = "Shell"

activate(buttons[0])
buttons[1].select_set(True)
bpy.ops.object.join()
button = bpy.context.view_layer.objects.active
button.name = button.data.name = "Button"

# ---------------------------------------------------------------- Visor
visor = grid_surface("Visor", ab, -PV, PV,
                     lambda f: z_bot(f) + 0.06 + 0.22 * (f / PV) ** 2,
                     lambda f: z_top(f) - 0.07, 44, 36, offset=0.002, mats=(M_GOLD,))
solidify(visor, T_VISOR, 1, mat_off=0)
for c in cutters:
    boolean(visor, c)
bevel(visor, 0.004)
apply_all(visor)

# eye windows: tinted lenses sitting inside the visor's eye holes
bm = bmesh.new()
for sx in (-1, 1):
    NR, NA = 5, 40

    def surf(r, t):
        x = sx * EYE_X + EYE_RX * 1.06 * r * math.cos(t)
        z = EYE_Z + EYE_RZ * 1.06 * r * math.sin(t)
        a, _ = ab(z)
        phi = math.asin(max(-1, min(1, x / a)))
        return pt(ab, phi, z) + normal(ab, phi, z) * (0.002 + T_VISOR * 0.5)

    c = bm.verts.new(surf(0, 0))
    rings = [[bm.verts.new(surf(r / NR, 2 * math.pi * k / NA)) for k in range(NA)]
             for r in range(1, NR + 1)]
    for k in range(NA):
        bm.faces.new((c, rings[0][k], rings[0][(k + 1) % NA])).smooth = True
    for r in range(NR - 1):
        for k in range(NA):
            k2 = (k + 1) % NA
            bm.faces.new((rings[r][k], rings[r + 1][k], rings[r + 1][k2], rings[r][k2])).smooth = True
windows = new_obj("EyeWindows", bm, (M_WIN,))

# ---------------------------------------------------------------- NeckCover
neck = grid_surface("NeckCover", ab_neck, -NPHI, NPHI, neck_bot, neck_top, 56, 22,
                    mats=(M_WHITE, M_LINER))
solidify(neck, T_NECK, -1)
bevel(neck, 0.008)
apply_all(neck)

# ---------------------------------------------------------------- Strap (two bands)
bm = bmesh.new()
for z0, dz in ((0.86, 0.30), (0.38, -0.18)):
    yc, ax, by = 0.02, 0.765, 1.0
    W, TH, N = 0.055, 0.008, 48
    prev = None
    for k in range(N + 1):
        th = math.pi * k / N
        c = Vector((ax * math.cos(th), yc + by * math.sin(th), z0 + dz * math.sin(th)))
        tng = Vector((-ax * math.sin(th), by * math.cos(th), dz * math.cos(th))).normalized()
        rad = Vector((math.cos(th) / ax, math.sin(th) / by, 0)).normalized()
        upv = tng.cross(rad).normalized()
        ring = [bm.verts.new(c + rad * sr * TH + upv * su * W)
                for sr, su in ((1, 1), (1, -1), (-1, -1), (-1, 1))]
        if prev:
            for i in range(4):
                bm.faces.new((prev[i], prev[(i + 1) % 4], ring[(i + 1) % 4], ring[i]))
        else:
            bm.faces.new(list(reversed(ring)))
        prev = ring
    bm.faces.new(prev)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
strap = new_obj("Strap", bm, (M_STRAP,))

# ---------------------------------------------------------------- LEDs (inner surface only)
def arc_table(abf, z, phmax, step=math.radians(0.25)):
    a, b = abf(z)
    tbl, s, phi = [(0.0, 0.0)], 0.0, 0.0
    while phi < phmax:
        p0 = Vector((a * math.sin(phi), -b * math.cos(phi)))
        phi += step
        p1 = Vector((a * math.sin(phi), -b * math.cos(phi)))
        s += (p1 - p0).length
        tbl.append((s, phi))
    return tbl


def phi_at(tbl, s):
    for (s0, f0), (s1, f1) in zip(tbl, tbl[1:]):
        if s1 >= s:
            return lerp(f0, f1, (s - s0) / max(s1 - s0, 1e-9))
    return None


def led_points(d):
    out = []
    # face shell
    z = Z_CHIN + 0.06
    while z < Z_TOP - 0.05:
        tbl = arc_table(ab, z, PHI_MAX)
        k = 0
        while True:
            phi = phi_at(tbl, (k + 0.5) * d)
            if phi is None or phi > PHI_MAX - math.radians(6):
                break
            for f in (phi, -phi):
                if not (z_bot(f) + 0.06 <= z <= z_top(f) - 0.06):
                    continue
                p = pt(ab, f, z)
                if in_eye(p.x, z, 1.35) or in_slot(p.x, z, 0.05):
                    continue
                out.append((ab, f, z, T_SHELL))
            k += 1
        z += d
    # neck cover
    z = NZ_BOT + 0.07
    while z < neck_top(NPHI):
        tbl = arc_table(ab_neck, z, NPHI)
        k = 0
        while True:
            phi = phi_at(tbl, (k + 0.5) * d)
            if phi is None or phi > NPHI - math.radians(6):
                break
            for f in (phi, -phi):
                if neck_bot(f) + 0.06 <= z <= neck_top(f) - 0.07:
                    out.append((ab_neck, f, z, T_NECK))
            k += 1
        z += d
    return out


lo, hi = 0.05, 0.15
for _ in range(30):
    mid = (lo + hi) / 2
    if len(led_points(mid)) > 807:
        lo = mid
    else:
        hi = mid
d = min((lo, hi), key=lambda v: abs(len(led_points(v)) - 807))
leds = led_points(d)

bm = bmesh.new()
R = min(0.022, d * 0.30)
for abf, f, z, thick in leds:
    n = normal(abf, f, z)
    base = pt(abf, f, z) - n * (thick + 0.001)
    a, b = abf(z)
    t1 = Vector((a * math.cos(f), b * math.sin(f), 0)).normalized()
    t2 = n.cross(t1)
    c = bm.verts.new(base - n * 0.007)
    ring = [bm.verts.new(base + (t1 * math.cos(q) + t2 * math.sin(q)) * R)
            for q in (2 * math.pi * k / 8 for k in range(8))]
    for k in range(8):
        bm.faces.new((c, ring[(k + 1) % 8], ring[k]))  # faces -n, toward the wearer
led_obj = new_obj("LEDs", bm, (M_LED,))

# ---------------------------------------------------------------- cleanup, smoothing, centring
for c in cutters:
    bpy.data.objects.remove(c, do_unlink=True)

parts = [shell, visor, windows, neck, strap, button, led_obj]
for ob in (shell, visor, neck, button):
    activate(ob)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))

mins = Vector((1e9,) * 3)
maxs = Vector((-1e9,) * 3)
for ob in parts:
    for v in ob.data.vertices:
        w = ob.matrix_world @ v.co
        mins = Vector(map(min, mins, w))
        maxs = Vector(map(max, maxs, w))
centre = (mins + maxs) / 2
for ob in parts:
    ob.data.transform(ob.matrix_world)
    ob.matrix_world = Matrix.Identity(4)
    ob.data.transform(Matrix.Translation(-centre))
    ob.data.update()

tris = {}
dg = bpy.context.evaluated_depsgraph_get()
for ob in parts:
    me = ob.evaluated_get(dg).to_mesh()
    me.calc_loop_triangles()
    tris[ob.name] = len(me.loop_triangles)
    ob.evaluated_get(dg).to_mesh_clear()

os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "halo-mask.blend"), compress=True)

glb = os.path.join(OUT, "halo-mask.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_apply=True,
                          export_yup=True, export_materials="EXPORT",
                          export_texcoords=False, export_cameras=False, export_lights=False)

# ---------------------------------------------------------------- previews
if RENDER:
    for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "CYCLES"):
        try:
            scene.render.engine = eng
            break
        except TypeError:
            continue
    if scene.render.engine == "CYCLES":
        scene.cycles.samples = 64
    else:
        scene.eevee.taa_render_samples = 64
    scene.render.resolution_x = scene.render.resolution_y = 1200
    scene.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.55, 0.57, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.7
    scene.world = world

    def light(name, loc, energy, size):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy, ld.size = energy, size
        lo_ = bpy.data.objects.new(name, ld)
        scene.collection.objects.link(lo_)
        lo_.location = loc
        tc = lo_.constraints.new("TRACK_TO")
        tc.target = target
        return lo_

    target = bpy.data.objects.new("Target", None)
    scene.collection.objects.link(target)
    light("Key", (-4, -5, 4), 900, 4)
    light("Fill", (5, -4, 1), 350, 5)
    light("Rim", (0, 5, 5), 500, 4)

    cam_d = bpy.data.cameras.new("Cam")
    cam_d.lens = 95
    cam = bpy.data.objects.new("Cam", cam_d)
    scene.collection.objects.link(cam)
    scene.camera = cam
    tc = cam.constraints.new("TRACK_TO")
    tc.target = target
    tc.track_axis, tc.up_axis = "TRACK_NEGATIVE_Z", "UP_Y"

    for fname, loc in (("preview-front.png", (0, -8.2, 0.4)),
                       ("preview-back-3q.png", (4.6, 6.4, 2.6))):
        cam.location = loc
        scene.render.filepath = os.path.join(OUT, fname)
        bpy.ops.render.render(write_still=True)

info = {"engine": scene.render.engine, "led_count": len(leds), "led_spacing": round(d, 4),
        "tris": tris, "tris_total": sum(tris.values()),
        "glb_bytes": os.path.getsize(glb), "height": round(maxs.z - mins.z, 3),
        "size": [round(v, 3) for v in (maxs - mins)]}
print("HALO_INFO " + json.dumps(info))
