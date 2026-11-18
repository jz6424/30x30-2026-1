"""Build the Aphrona Halo (PRO) LED mask in Blender, headless.

Usage:
  Blender -b -P build_halo.py -- <out_dir> [--no-render]

v2, matched to the HALO PRO campaign photo:
- a rounded off-white helmet-front shell that wraps to just in front of the ears
- one large egg-shaped mirror-gold visor recessed into a thick, rounded white rim
- a thin dark curved "smile" mouth slit across the lower visor (no eye holes)
- horizontal capsule pods at the temples, each with a touch-button plate (one has an "A" logo) and a strap rod
- a slim grey strap over the crown and around the back of the head
- a separate neck cover that continues down from the chin and flares toward the collarbone

The front faces -Y in Blender, which is +Z in the exported glTF (+Y up). The model is scaled
to 2.6 units tall, with the origin at the bounding-box centre.
Objects: Shell, Visor, MouthSlit, Pods, Strap, NeckCover, LEDs (about 807 beads, inner surface only).
"""
import bpy, bmesh, math, sys, os, json
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv and not argv[0].startswith("--") else os.path.dirname(__file__))
RENDER = "--no-render" not in argv

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------------------------------------------------------- shape parameters
N = 2.4                       # superellipsoid exponent (rounded egg, slightly full)
A, B = 0.92, 0.86             # half width, half depth
C_TOP, C_BOT = 1.10, 1.05     # half heights above / below the centre
PHI_MAX = math.radians(104)   # how far the side walls wrap back
T_SHELL, T_NECK = 0.03, 0.025
RECESS = 0.024                # visor recess depth (forms the rounded rim lip)
ZC, HT, HB, WV = 0.10, 0.80, 0.85, 0.74   # visor egg: centre z, half heights, half width
NZ_BOT, NPHI = -1.58, math.radians(96)
TARGET_LEDS = 807
HEIGHT = 2.6


def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def smooth(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def S(t):
    return math.copysign(abs(t) ** (2.0 / N), t)


def taper(z):
    if z < 0:
        u = -z / C_BOT
        return 1 - 0.30 * u * u
    u = z / C_TOP
    return 1 - 0.06 * u * u


def sec(z):
    c = C_TOP if z >= 0 else C_BOT
    u = min(abs(z) / c, 0.9999)
    s = (1 - u ** N) ** (1.0 / N)
    return A * taper(z) * s, B * s


def base(phi, z):
    a, b = sec(z)
    return Vector((a * S(math.sin(phi)), -b * S(math.cos(phi)), z))


def z_hi(phi):
    return C_TOP * (0.975 - 0.13 * (phi / (math.pi / 2)) ** 2)


def z_lo(phi):
    return -C_BOT * (0.95 - 0.50 * (phi / (math.pi / 2)) ** 2)


def nrm(f, u, v, h=1e-4, centre=Vector((0, 0, 0))):
    p = f(u, v)
    n = ((f(u + h, v) - p) / h).cross((f(u, v + h) - p) / h)
    if n.length < 1e-12:
        n = (f(u + 2 * h, v) - p).cross(f(u, v + 2 * h) - p)
    n.normalize()
    radial = p - centre
    radial.z = 0
    if n.dot(radial) < 0:
        n = -n
    return n


def egg_E(x, z):
    t = (z - ZC) / (HT if z >= ZC else HB)
    w = WV * (1 - 0.22 * max(0.0, -t))
    return (x / w) ** 2 + t * t


def shellP(phi, z):
    p = base(phi, z)
    if math.cos(phi) > 0:
        r = RECESS * smooth(1.16, 1.0, egg_E(p.x, z))
        if r > 0:
            p = p - nrm(base, phi, z) * r
    return p


# neck cover: a loft from just inside the shell's bottom edge down to a flared U at the collar
def neck_top(phi):
    z = z_lo(phi) + 0.035
    return shellP(phi, z) - nrm(shellP, phi, z) * (T_SHELL + 0.004)


def neck_bot(phi):
    return Vector((0.70 * S(math.sin(phi)), -0.58 * S(math.cos(phi)) + 0.08,
                   NZ_BOT + 0.36 * (phi / NPHI) ** 2))


def neckP_s(phi, s):
    return neck_top(phi).lerp(neck_bot(phi), s)


def neck_s_at(phi, z):
    zt, zb = neck_top(phi).z, neck_bot(phi).z
    return (zt - z) / (zt - zb)


def neckP(phi, z):
    return neckP_s(phi, neck_s_at(phi, z))


NECK_CENTRE = Vector((0, 0.05, 0))


# ---------------------------------------------------------------- materials
def principled(name, color, rough=0.4, metal=0.0, emit=None, coat=0.0):
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
    m.diffuse_color = (*color, 1)
    return m


M_WHITE = principled("Shell_White", (0.84, 0.83, 0.80), rough=0.42, coat=0.15)
M_LINER = principled("Liner_Black", (0.015, 0.015, 0.017), rough=0.45)
M_GOLD = principled("Visor_Gold", (0.98, 0.80, 0.55), rough=0.08, metal=0.95)
M_SLIT = principled("Slit_Black", (0.01, 0.01, 0.01), rough=0.3)
M_STRAP = principled("Strap_Grey", (0.55, 0.55, 0.54), rough=0.7)
M_BTN = principled("Button_Satin", (0.78, 0.77, 0.74), rough=0.3, metal=0.1)
M_LED = principled("LED_Emissive", (1.0, 0.10, 0.06), rough=0.3, emit=((1.0, 0.08, 0.04), 2.5))


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


def orient_outward(bm, centre):
    bm.normal_update()
    score = sum(f.normal.dot(f.calc_center_median() - centre) for f in bm.faces)
    if score < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))


def grid(name, f, u0, u1, vlo, vhi, nu, nv, mats, centre=Vector((0, 0, 0))):
    bm = bmesh.new()
    rows = []
    for j in range(nv + 1):
        row = []
        for i in range(nu + 1):
            u = lerp(u0, u1, i / nu)
            row.append(bm.verts.new(f(u, lerp(vlo(u), vhi(u), j / nv))))
        rows.append(row)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i])).smooth = True
    orient_outward(bm, centre)
    return new_obj(name, bm, mats)


def solidify(ob, thick, offset=-1):
    md = ob.modifiers.new("Solidify", "SOLIDIFY")
    md.thickness, md.offset, md.use_even_offset = thick, offset, True
    md.material_offset, md.material_offset_rim = 1, 0


def bevel(ob, width, segs=3, angle=50):
    md = ob.modifiers.new("Bevel", "BEVEL")
    md.width, md.segments, md.limit_method = width, segs, "ANGLE"
    md.angle_limit = math.radians(angle)


def rounded_box(name, centre, dims, radius, segs, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=centre)
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.scale = dims
    activate(ob)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
    md = ob.modifiers.new("Bevel", "BEVEL")
    md.width, md.segments, md.limit_method = radius, segs, "NONE"
    ob.data.materials.append(mat)
    apply_all(ob)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def cylinder(name, centre, radius, depth, rot, mat, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth,
                                        location=centre, rotation=rot)
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    activate(ob)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    ob.data.materials.append(mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def join(objs, name):
    activate(objs[0])
    for o in objs[1:]:
        o.select_set(True)
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = ob.data.name = name
    return ob


# ---------------------------------------------------------------- Shell
shell = grid("Shell", shellP, -PHI_MAX, PHI_MAX, z_lo, z_hi, 92, 64, (M_WHITE, M_LINER))
solidify(shell, T_SHELL)
bevel(shell, 0.012, segs=2)
apply_all(shell)

# ---------------------------------------------------------------- Pods (capsules + strap rods + button plates + "A")
POD_Z, POD_Y0, POD_Y1 = 0.32, -0.36, 0.26
side_x = base(math.pi / 2, POD_Z).x
pod_parts = []
for sx in (-1, 1):
    px = sx * (side_x + 0.055)
    pod_parts.append(rounded_box("Pod%d" % sx, (px, (POD_Y0 + POD_Y1) / 2, POD_Z),
                                 (0.14, POD_Y1 - POD_Y0, 0.21), 0.068, 4, M_WHITE))
    pod_parts.append(cylinder("Rod%d" % sx, (px - sx * 0.01, POD_Y1 + 0.07, POD_Z), 0.032, 0.20,
                              (math.pi / 2, 0, 0), M_WHITE, 16))
    btn = cylinder("Btn%d" % sx, (px + sx * 0.071, -0.12, POD_Z), 1.0, 0.010,
                   (0, math.pi / 2, 0), M_BTN, 40)
    for v in btn.data.vertices:  # oval plate, 0.24 x 0.12
        v.co.y = -0.12 + (v.co.y + 0.12) * 0.12
        v.co.z = POD_Z + (v.co.z - POD_Z) * 0.06
    pod_parts.append(btn)

bpy.ops.object.text_add(location=(side_x + 0.055 + 0.077, -0.12, POD_Z - 0.035),
                        rotation=(math.pi / 2, 0, math.pi / 2))
logo = bpy.context.view_layer.objects.active
logo.data.body = "A"
logo.data.size = 0.09
logo.data.extrude = 0.0025
logo.data.align_x = "CENTER"
activate(logo)
bpy.ops.object.convert(target="MESH")
logo = bpy.context.view_layer.objects.active
logo.data.materials.clear()
logo.data.materials.append(M_STRAP)
activate(logo)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
pod_parts.append(logo)
pods = join(pod_parts, "Pods")

# ---------------------------------------------------------------- Visor (polar egg patch in the recess)
def egg_xz(rho, th):
    t = rho * math.sin(th)
    x = rho * math.cos(th) * WV * (1 - 0.22 * max(0.0, -t))
    z = ZC + t * (HT if t >= 0 else HB)
    return x, z


def on_visor(x, z, lift):
    a, _ = sec(z)
    phi = math.asin(clamp(math.copysign((abs(x) / a) ** (N / 2), x), -1, 1))
    return shellP(phi, z) + nrm(shellP, phi, z) * lift


bm = bmesh.new()
NR, NA = 30, 112
c0 = bm.verts.new(on_visor(*egg_xz(0, 0), 0.003))
rings = [[bm.verts.new(on_visor(*egg_xz(r / NR, 2 * math.pi * k / NA), 0.003)) for k in range(NA)]
         for r in range(1, NR + 1)]
for k in range(NA):
    bm.faces.new((c0, rings[0][k], rings[0][(k + 1) % NA])).smooth = True
for r in range(NR - 1):
    for k in range(NA):
        k2 = (k + 1) % NA
        bm.faces.new((rings[r][k], rings[r + 1][k], rings[r + 1][k2], rings[r][k2])).smooth = True
orient_outward(bm, Vector((0, 0, 0)))
visor = new_obj("Visor", bm, (M_GOLD,))

# MouthSlit: a thin dark crescent across the lower visor, curving up at the ends
bm = bmesh.new()
L, ZS, K, SEG = 0.50, -0.43, 0.42, 48
top, bot = [], []
for i in range(SEG + 1):
    x = lerp(-L, L, i / SEG)
    zc = ZS + K * x * x
    h = 0.016 * (1 - (x / L) ** 2) ** 0.7 + 0.002
    top.append(bm.verts.new(on_visor(x, zc + h, 0.0045)))
    bot.append(bm.verts.new(on_visor(x, zc - h, 0.0045)))
for i in range(SEG):
    bm.faces.new((bot[i], bot[i + 1], top[i + 1], top[i])).smooth = True
orient_outward(bm, Vector((0, 0, 0)))
slit = new_obj("MouthSlit", bm, (M_SLIT,))

# ---------------------------------------------------------------- NeckCover
neck = grid("NeckCover", neckP_s, -NPHI, NPHI, lambda u: 0.0, lambda u: 1.0, 64, 26,
            (M_WHITE, M_LINER), centre=NECK_CENTRE)
solidify(neck, T_NECK)
bevel(neck, 0.010)
apply_all(neck)

# ---------------------------------------------------------------- Strap: crown band + back band
rod_x = side_x + 0.045
bm = bmesh.new()


def ribbon(path, radial_fn, W=0.042, TH=0.008, NSEG=56):
    prev = first = None
    for k in range(NSEG + 1):
        th = math.pi * k / NSEG
        c = path(th)
        tng = (path(min(th + 1e-3, math.pi)) - path(max(th - 1e-3, 0))).normalized()
        rad = radial_fn(th, c)
        rad = (rad - tng * rad.dot(tng)).normalized()
        upv = tng.cross(rad).normalized()
        ring = [bm.verts.new(c + rad * sr * TH + upv * su * W)
                for sr, su in ((1, 1), (1, -1), (-1, -1), (-1, 1))]
        if prev:
            for i in range(4):
                bm.faces.new((prev[i], prev[(i + 1) % 4], ring[(i + 1) % 4], ring[i]))
        else:
            first = ring
        prev = ring
    bm.faces.new(list(reversed(first)))
    bm.faces.new(prev)


Y_R = POD_Y1 + 0.16
ribbon(lambda th: Vector((rod_x * math.cos(th), Y_R + 0.62 * math.sin(th), POD_Z - 0.12 * math.sin(th))),
       lambda th, c: Vector((c.x, c.y - Y_R, 0)))
ribbon(lambda th: Vector((rod_x * math.cos(th), Y_R + 0.12 * math.sin(th), POD_Z + 0.98 * math.sin(th))),
       lambda th, c: Vector((c.x, 0, c.z - POD_Z)))
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
strap = new_obj("Strap", bm, (M_STRAP,))

# ---------------------------------------------------------------- LEDs (inner surface only)
def arc_table(f, z, phmax, step=math.radians(0.4)):
    tbl, s, phi, p0 = [(0.0, 0.0)], 0.0, 0.0, f(0.0, z)
    while phi < phmax:
        phi += step
        p1 = f(phi, z)
        s += (p1 - p0).length
        tbl.append((s, phi))
        p0 = p1
    return tbl


def phi_at(tbl, s):
    for (s0, f0), (s1, f1) in zip(tbl, tbl[1:]):
        if s1 >= s:
            return lerp(f0, f1, (s - s0) / max(s1 - s0, 1e-9))
    return None


def shell_ok(phi, z):
    return z_lo(phi) + 0.07 <= z <= z_hi(phi) - 0.07 and abs(phi) <= PHI_MAX - math.radians(5)


def neck_ok(phi, z):
    s = neck_s_at(phi, z)
    return 0.10 <= s <= 0.95 and abs(phi) <= NPHI - math.radians(6)


SURFS = [  # surface fn, validity, phi max, z range, wall thickness, centre for normals
    (shellP, shell_ok, PHI_MAX, (z_lo(0) + 0.07, C_TOP), T_SHELL, Vector((0, 0, 0))),
    (neckP, neck_ok, NPHI, (NZ_BOT + 0.05, z_lo(NPHI)), T_NECK, NECK_CENTRE),
]
tables = {}


def led_points(d):
    out = []
    for si, (f, ok, phmax, (z0, z1), thick, cen) in enumerate(SURFS):
        z = z0
        while z < z1:
            key = (si, round(z, 6))
            if key not in tables:
                tables[key] = arc_table(f, z, phmax)
            tbl = tables[key]
            k = 0
            while True:
                phi = phi_at(tbl, (k + 0.5) * d)
                if phi is None:
                    break
                for ph in (phi, -phi):
                    if ok(ph, z):
                        out.append((f, ph, z, thick, cen))
                k += 1
            z += d
    return out


lo, hi = 0.05, 0.16
for _ in range(20):
    tables.clear()
    mid = (lo + hi) / 2
    if len(led_points(mid)) > TARGET_LEDS:
        lo = mid
    else:
        hi = mid
cands = []
for v in (lo, hi):
    tables.clear()
    cands.append((abs(len(led_points(v)) - TARGET_LEDS), v))
d = min(cands)[1]
tables.clear()
leds = led_points(d)

bm = bmesh.new()
R = min(0.022, d * 0.30)
for f, ph, z, thick, cen in leds:
    n = nrm(f, ph, z, centre=cen)
    p = f(ph, z)
    b_ = p - n * (thick + 0.0012)
    t1 = f(ph + 1e-4, z) - p
    t2 = n.cross(t1).normalized()
    t1 = t2.cross(n).normalized()
    c = bm.verts.new(b_ - n * 0.007)
    ring = [bm.verts.new(b_ + (t1 * math.cos(q) + t2 * math.sin(q)) * R)
            for q in (2 * math.pi * k / 8 for k in range(8))]
    for k in range(8):
        fa = bm.faces.new((c, ring[(k + 1) % 8], ring[k]))
        fa.normal_update()
        if fa.normal.dot(n) > 0:  # must face the wearer
            fa.normal_flip()
led_obj = new_obj("LEDs", bm, (M_LED,))

# ---------------------------------------------------------------- smoothing, centring, scaling
parts = [shell, visor, slit, pods, strap, neck, led_obj]
for ob in (shell, neck, pods):
    activate(ob)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))

mins = Vector((1e9,) * 3)
maxs = Vector((-1e9,) * 3)
for ob in parts:
    for v in ob.data.vertices:
        mins = Vector(map(min, mins, v.co))
        maxs = Vector(map(max, maxs, v.co))
centre = (mins + maxs) / 2
k = HEIGHT / (maxs.z - mins.z)
M = Matrix.Scale(k, 4) @ Matrix.Translation(-centre)
for ob in parts:
    ob.data.transform(M)
    ob.data.update()
size = (maxs - mins) * k

tris = {}
dg = bpy.context.evaluated_depsgraph_get()
for ob in parts:
    me = ob.evaluated_get(dg).to_mesh()
    me.calc_loop_triangles()
    tris[ob.name] = len(me.loop_triangles)
    ob.evaluated_get(dg).to_mesh_clear()

os.makedirs(OUT, exist_ok=True)
glb = os.path.join(OUT, "halo-mask.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_apply=True,
                          export_yup=True, export_materials="EXPORT",
                          export_texcoords=False, export_cameras=False, export_lights=False)

# ---------------------------------------------------------------- previews
if RENDER:
    for eng in ("CYCLES",):
        try:
            scene.render.engine = eng
            break
        except TypeError:
            continue
    if scene.render.engine == "CYCLES":
        scene.cycles.samples = 48
        scene.cycles.use_denoising = True
        try:
            scene.cycles.device = "GPU"
        except Exception:
            pass
    else:
        scene.eevee.taa_render_samples = 64
    scene.render.resolution_x = scene.render.resolution_y = 1200
    scene.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    wn, wl = world.node_tree.nodes, world.node_tree.links
    bg_cam = wn["Background"]
    bg_cam.inputs[0].default_value = (0.42, 0.42, 0.43, 1)
    bg_env = wn.new("ShaderNodeBackground")
    bg_env.inputs[0].default_value = (1.0, 0.98, 0.95, 1)
    bg_env.inputs[1].default_value = 0.45
    lp = wn.new("ShaderNodeLightPath")
    mix = wn.new("ShaderNodeMixShader")
    wl.new(lp.outputs["Is Camera Ray"], mix.inputs[0])
    wl.new(bg_env.outputs[0], mix.inputs[1])
    wl.new(bg_cam.outputs[0], mix.inputs[2])
    wl.new(mix.outputs[0], wn["World Output"].inputs[0])
    scene.world = world

    target = bpy.data.objects.new("Target", None)
    scene.collection.objects.link(target)
    extras = [target]

    def light(name, loc, energy, size):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy, ld.size = energy, size
        o = bpy.data.objects.new(name, ld)
        scene.collection.objects.link(o)
        o.location = loc
        o.constraints.new("TRACK_TO").target = target
        extras.append(o)

    light("Key", (-4, -5, 4), 600, 4)
    light("Fill", (5, -4, 1), 280, 5)
    light("Rim", (0, 5, 5), 500, 4)
    light("Top", (0, -2, 7), 150, 6)
    # dark card behind the camera: gives the mirror visor the photo's dark vertical reflection
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0.3, -12, 0.3), rotation=(math.pi / 2, 0, 0))
    card = bpy.context.view_layer.objects.active
    card.scale = (2.4, 30, 1)
    card.data.materials.append(principled("Card", (0.0, 0.0, 0.0), rough=1))
    card.visible_camera = False
    extras.append(card)

    cam_d = bpy.data.cameras.new("Cam")
    cam_d.lens = 95
    cam = bpy.data.objects.new("Cam", cam_d)
    scene.collection.objects.link(cam)
    scene.camera = cam
    extras.append(cam)
    tc = cam.constraints.new("TRACK_TO")
    tc.target = target
    tc.track_axis, tc.up_axis = "TRACK_NEGATIVE_Z", "UP_Y"

    for fname, loc in (("preview-front.png", (0, -8.4, 0.4)),
                       ("preview-front-3q.png", (-5.2, -6.4, 1.0)),
                       ("preview-back-3q.png", (4.6, 6.4, 2.6))):
        cam.location = loc
        scene.render.filepath = os.path.join(OUT, fname)
        bpy.ops.render.render(write_still=True)

    for o in extras:
        bpy.data.objects.remove(o, do_unlink=True)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "halo-mask.blend"), compress=True)

info = {"engine": scene.render.engine, "led_count": len(leds), "led_spacing": round(d, 4),
        "tris": tris, "tris_total": sum(tris.values()), "glb_bytes": os.path.getsize(glb),
        "size": [round(v, 3) for v in size]}
print("HALO_INFO " + json.dumps(info))
