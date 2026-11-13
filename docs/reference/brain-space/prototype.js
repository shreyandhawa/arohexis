class Component extends DCLogic {
componentDidMount() {
if (super.componentDidMount) super.componentDidMount();
this.tries = 0;
this.boot();
}
componentWillUnmount() {
this.dead = true;
if (this.raf) cancelAnimationFrame(this.raf);
if (super.componentWillUnmount) super.componentWillUnmount();
}
defaults() {
if (this.phase) return;
this.phase = 'quiet';
this.region = 0;
this.clock = '2:00';
this.paused = false;
this.rev = 0;
this.ver = 0;
this.active = null;
}
rerender() {
this.rev += 1;
this.setState({ rev: this.rev });
}
clamp(v, a, b) {
return Math.max(a, Math.min(b, v));
}
boot() {
if (this.dead) return;
this.defaults();
const cv = this.cv || document.querySelector('canvas[data-brain]');
if (!cv) {
if (this.tries++ < 240) requestAnimationFrame(() => this.boot());
return;
}
this.cv = cv;
this.ctx = cv.getContext('2d');
this.off = document.createElement('canvas');
this.octx = this.off.getContext('2d');
this.buildModel();
this.cam = { yaw: -1.05, pitch: 0.12, zoom: 1, fx: 0, fy: -0.16, fz: 0 };
this.goal = null;
this.ex = 0;
this.lit = 0.6;
this.pulseClock = 0;
this.elapsed = 0;
this.sig = '';
this.last = performance.now();
this.reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
this.bind(cv);
this.rerender();
const loop = (now) => {
if (this.dead) return;
this.frame(now);
this.raf = requestAnimationFrame(loop);
};
this.raf = requestAnimationFrame(loop);
}
buildModel() {
const PI = Math.PI, TAU = PI * 2, D = PI / 180;
let seed = 424242;
const rnd = () => {
seed = (seed + 0x6D2B79F5) >>> 0;
let t = seed;
t = Math.imul(t ^ (t >>> 15), t | 1);
t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const g = () => (rnd() + rnd() + rnd() - 1.5) * 1.15;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sp = (v, e) => (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), e);
const CT = Math.cos(10 * D), ST = Math.sin(10 * D);
// Cortex surface. a: angle in the side-view plane (0 front, 90deg top, 180deg back). s: 0 midline, 1 outermost.
const surf = (a, s, side) => {
const ca = Math.cos(a), sa = Math.sin(a);
const k = Math.pow(Math.cos(s * PI / 2), 0.55);
const taper = 1 - 0.2 * Math.max(0, ca) * Math.max(0, ca);
return {
x: side * (0.035 + 0.6 * taper * Math.pow(Math.sin(s * PI / 2), 0.8)),
y: 0.1 + (sa >= 0 ? 0.54 : 0.3) * sp(sa, 0.85) * k,
z: 0.86 * sp(ca, 0.85) * k
};
};
const tsurf = (th, ph, side) => ({
x: side * (0.44 + 0.2 * Math.cos(ph) * Math.sin(th)),
y: -0.2 - 0.16 * Math.sin(ph) * Math.sin(th) - 0.42 * Math.cos(th) * ST,
z: 0.2 + 0.42 * Math.cos(th) * CT
});
const crom = (c, t) => {
const m = c.length - 1;
const f = Math.min(m - 1e-6, Math.max(0, t * m));
const i = Math.floor(f), u = f - i;
const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(m, i + 2)];
const h = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * u + (2 * a - 5 * b + 4 * cc - d) * u * u + (-a + 3 * b - 3 * cc + d) * u * u * u);
return { x: h(p0.x, p1.x, p2.x, p3.x), y: h(p0.y, p1.y, p2.y, p3.y), z: h(p0.z, p1.z, p2.z, p3.z) };
};
const pieces = [];
const pid = {};
const piece = (area, side, off) => {
pieces.push({ r: area, side: side, ox: off[0], oy: off[1], oz: off[2], cx: 0, cy: 0, cz: 0, n: 0 });
pid[area + ':' + side] = pieces.length - 1;
};
[1, -1].forEach((s) => {
piece(1, s, [s * 0.14, 0.1, 0.46]);
piece(2, s, [s * 0.46, -0.24, 0.14]);
piece(3, s, [s * 0.14, 0.42, -0.16]);
piece(4, s, [s * 0.16, -0.02, -0.52]);
});
piece(5, 0, [0, -0.44, -0.14]);
piece(0, 0, [0, 0.04, 0]);
const pc = (area, side) => (area === 5 || area === 0 ? pid[area + ':0'] : pid[area + ':' + side]);
const flat = [], s0 = [], sn = [], sArea = [], sPiece = [], sWire = [];
const wires = [];
const wire = (area, side, tag) => {
wires.push({ r: area, side: side, tag: tag, lit: false, waiting: false, pulse: false, strands: [], phase: (wires.length * 0.37) % 1, speed: 0.1 + ((wires.length * 0.13) % 1) * 0.07 });
return wires.length - 1;
};
const strand = (pts, area, side, wid) => {
const p = pc(area, side);
s0.push(flat.length / 3); sn.push(pts.length); sArea.push(area); sPiece.push(p); sWire.push(wid);
wires[wid].strands.push(s0.length - 1);
const mid = pts[pts.length >> 1];
pieces[p].cx += mid.x; pieces[p].cy += mid.y; pieces[p].cz += mid.z; pieces[p].n += 1;
for (let i = 0; i < pts.length; i++) flat.push(pts[i].x, pts[i].y, pts[i].z);
};
const sample = (c, n, u0, u1, fn) => {
const out = [];
for (let i = 0; i < n; i++) {
const u = u0 + (u1 - u0) * i / (n - 1);
const p = crom(c, u);
out.push(fn ? fn(p, u) : p);
}
return out;
};
const bundle = (area, side, tag, ctrl, wiresN, per, rMid, rEnd, n) => {
const c = ctrl.map((p) => ({ x: p[0] * side, y: p[1], z: p[2] }));
for (let w = 0; w < wiresN; w++) {
const wid = wire(area, side, tag);
const wo = [g(), g(), g()];
for (let k = 0; k < per; k++) {
const so = [wo[0] + 0.35 * g(), wo[1] + 0.35 * g(), wo[2] + 0.35 * g()];
strand(sample(c, n, rnd() * 0.07, 1 - rnd() * 0.07, (p, u) => {
const R = rMid + (rEnd - rMid) * Math.pow(Math.abs(2 * u - 1), 1.6);
let x = p.x + so[0] * R;
if (x * side < 0.015) x = side * 0.015;
return { x: x, y: p.y + so[1] * R, z: p.z + so[2] * R };
}), area, side, wid);
}
}
};
const fan = (area, side, tag, a0, a1, sA, sB, wiresN, per) => {
for (let w = 0; w < wiresN; w++) {
const wid = wire(area, side, tag);
const aw = a0 + (a1 - a0) * rnd(), sw = sA + (sB - sA) * rnd();
for (let k = 0; k < per; k++) {
const T = surf(aw + g() * 0.045, clamp(sw + g() * 0.045, 0.05, 0.95), side);
const pull = 0.88 + rnd() * 0.12;
const tx = side * 0.2 + (T.x - side * 0.2) * pull, ty = 0.05 + (T.y - 0.05) * pull, tz = T.z * pull;
const j0 = g() * 0.014, j1 = g() * 0.014;
const K = { x: side * 0.15 + j0 * 1.5, y: -0.06, z: -0.06 + j1 * 1.5 };
const c = [
{ x: j0, y: -0.92, z: -0.36 + j1 },
{ x: side * 0.03 + j0, y: -0.5, z: -0.27 + j1 },
K,
{ x: K.x + (tx - K.x) * 0.5, y: K.y + (ty - K.y) * 0.72, z: K.z + (tz - K.z) * 0.45 },
{ x: tx, y: ty, z: tz }
];
strand(sample(c, 20, rnd() * 0.25, 1, null), area, side, wid);
}
}
};
[1, -1].forEach((side) => {
fan(5, side, 'cst', 88 * D, 104 * D, 0.08, 0.85, 22, 10);
fan(1, side, 'rad', 15 * D, 80 * D, 0.1, 0.8, 18, 10);
fan(3, side, 'rad', 110 * D, 150 * D, 0.1, 0.8, 12, 10);
for (let w = 0; w < 15; w++) {
const wid = wire(4, side, 'optic');
const aw = (165 + 35 * rnd()) * D, sw = 0.1 + 0.4 * rnd();
for (let k = 0; k < 10; k++) {
const T = surf(aw + g() * 0.04, clamp(sw + g() * 0.04, 0.05, 0.9), side);
const j = g() * 0.015;
strand(sample([
{ x: side * (0.2 + j), y: -0.08 + j, z: -0.18 },
{ x: side * (0.36 + j), y: -0.05 + g() * 0.02, z: -0.4 },
{ x: side * (0.28 + j), y: -0.02 + g() * 0.02, z: -0.64 },
{ x: T.x * 0.95, y: T.y * 0.95, z: T.z * 0.95 }
], 16, 0, 1, null), 4, side, wid);
}
}
bundle(2, side, 'arcuate', [[0.5, 0.06, 0.5], [0.48, 0.2, 0.2], [0.46, 0.24, -0.18], [0.47, 0.14, -0.42], [0.5, -0.08, -0.36], [0.52, -0.2, -0.08]], 22, 10, 0.035, 0.1, 20);
bundle(1, side, 'slf', [[0.36, 0.3, 0.55], [0.38, 0.4, 0.2], [0.38, 0.42, -0.15], [0.36, 0.36, -0.5]], 16, 10, 0.04, 0.11, 18);
bundle(3, side, 'cingulum', [[0.06, -0.02, 0.5], [0.07, 0.2, 0.36], [0.07, 0.3, 0.05], [0.07, 0.27, -0.25], [0.08, 0.12, -0.44], [0.14, -0.08, -0.36], [0.24, -0.2, -0.1]], 13, 10, 0.02, 0.05, 22);
bundle(4, side, 'ilf', [[0.22, 0, -0.8], [0.36, -0.12, -0.5], [0.44, -0.22, -0.1], [0.42, -0.26, 0.3], [0.38, -0.24, 0.5]], 15, 10, 0.035, 0.09, 18);
bundle(2, side, 'uncinate', [[0.42, -0.26, 0.3], [0.4, -0.22, 0.52], [0.36, -0.08, 0.58], [0.28, -0.02, 0.7], [0.2, 0, 0.78]], 7, 10, 0.025, 0.06, 14);
for (let w = 0; w < 96; w++) {
const a = (-30 + 245 * rnd()) * D, s = 0.1 + 0.85 * rnd();
const deg = a / D;
const area = deg < 96 ? 1 : (deg < 152 ? 3 : 4);
const wid = wire(area, side, 'u');
const q = TAU * rnd(), L = 0.13 + 0.09 * rnd();
const da = L * Math.cos(q) / 0.6, ds = L * Math.sin(q);
for (let k = 0; k < 6; k++) {
const ja = g() * 0.035, js = g() * 0.035, dep = 0.035 + 0.04 * rnd(), out = 1 + g() * 0.012;
const pts = [];
for (let i = 0; i < 8; i++) {
const u = i / 7;
const p = surf(a + ja + da * (u - 0.5), clamp(s + js + ds * (u - 0.5), 0.04, 0.97), side);
const vx = side * 0.25 - p.x, vy = 0.1 - p.y, vz = -p.z;
const ln = Math.hypot(vx, vy, vz) || 1, d = dep * Math.sin(PI * u);
pts.push({ x: p.x * out + vx / ln * d, y: p.y * out + vy / ln * d, z: p.z * out + vz / ln * d });
}
strand(pts, area, side, wid);
}
}
for (let w = 0; w < 26; w++) {
const wid = wire(2, side, 'u');
const th = (0.15 + 0.7 * rnd()) * PI, ph = (-60 + 210 * rnd()) * D;
const q = TAU * rnd(), dth = 0.4 * Math.cos(q), dph = 0.8 * Math.sin(q);
for (let k = 0; k < 6; k++) {
const jt = g() * 0.05, jp = g() * 0.1, dep = 0.03 + 0.03 * rnd();
const pts = [];
for (let i = 0; i < 8; i++) {
const u = i / 7;
const p = tsurf(th + jt + dth * (u - 0.5), ph + jp + dph * (u - 0.5), side);
const vx = side * 0.44 - p.x, vy = -0.2 - p.y, vz = 0.2 - p.z;
const ln = Math.hypot(vx, vy, vz) || 1, d = dep * Math.sin(PI * u);
pts.push({ x: p.x + vx / ln * d, y: p.y + vy / ln * d, z: p.z + vz / ln * d });
}
strand(pts, 2, side, wid);
}
}
for (let w = 0; w < 30; w++) {
const wid = wire(5, side, 'cerebellum');
const v0 = -0.85 + 1.7 * w / 29;
for (let k = 0; k < 6; k++) {
const v = clamp(v0 + g() * 0.025, -0.97, 0.97), q = Math.sqrt(1 - v * v), rho = 0.93 + 0.07 * rnd();
const pts = [];
for (let i = 0; i < 14; i++) {
const psi = (170 - 230 * i / 13) * D;
pts.push({ x: side * (0.21 + 0.27 * q * rho * Math.sin(psi)), y: -0.43 + 0.2 * v, z: -0.58 - 0.25 * q * rho * Math.cos(psi) });
}
strand(pts, 5, side, wid);
}
}
for (let w = 0; w < 12; w++) {
const wid = wire(5, side, 'peduncle');
const tu = 2 * rnd() - 1, tt = PI * (0.1 + 0.8 * rnd()), ts = Math.sqrt(1 - tu * tu);
for (let k = 0; k < 6; k++) {
const pull = 0.8 + 0.15 * rnd();
strand(sample([
{ x: side * 0.04, y: -0.5 + g() * 0.01, z: -0.3 + g() * 0.01 },
{ x: side * 0.16, y: -0.46 + g() * 0.015, z: -0.4 },
{ x: side * (0.21 + 0.27 * ts * Math.sin(tt) * pull + g() * 0.01), y: -0.43 + 0.2 * tu * pull, z: -0.58 - 0.25 * ts * Math.cos(tt) * pull }
], 10, 0, 1, null), 5, side, wid);
}
}
});
for (let w = 0; w < 45; w++) {
const wid = wire(0, 0, 'callosum');
const t = rnd();
const M = { x: 0, y: 0.05 + 0.11 * Math.sin(PI * t), z: 0.34 - 0.72 * t };
for (let k = 0; k < 10; k++) {
const mk = { x: 0, y: M.y + g() * 0.012, z: M.z + g() * 0.015 };
const half = (side) => {
const T = surf((25 + 135 * t + g() * 5) * D, 0.12 + 0.6 * rnd(), side);
const pull = 0.9 + 0.1 * rnd();
return [{ x: T.x * pull, y: T.y * pull, z: T.z * pull }, { x: side * 0.2, y: mk.y + 0.07, z: T.z * pull + (mk.z - T.z * pull) * 0.65 }];
};
const L = half(-1), R = half(1);
strand(sample([L[0], L[1], mk, R[1], R[0]], 22, 0, 1, null), 0, 0, wid);
}
}
for (let w = 0; w < 20; w++) {
const wid = wire(5, 0, 'stem');
const ang = TAU * w / 20;
for (let k = 0; k < 6; k++) {
const an = ang + g() * 0.12, rs = 0.55 + 0.45 * rnd();
const pts = [];
for (let i = 0; i < 12; i++) {
const u = i / 11;
const bulge = Math.exp(-Math.pow((u - 0.3) / 0.16, 2));
const rr = (0.075 - 0.02 * u + 0.03 * bulge) * rs;
pts.push({ x: rr * Math.cos(an), y: -0.28 - 0.66 * u, z: -0.24 - 0.14 * u + 0.06 * bulge + rr * Math.sin(an) });
}
strand(pts, 5, 0, wid);
}
}
pieces.forEach((p) => { p.cx /= p.n || 1; p.cy /= p.n || 1; p.cz /= p.n || 1; });
const hsl = (h, s, l) => 'hsl(' + Math.round((h + 360) % 360) + ',' + s + '%,' + l + '%)';
const HUES = [0, 190, 322, 140, 38, 262];
const byRegion = [[], [], [], [], [], []];
wires.forEach((w, i) => {
byRegion[w.r].push(w);
const isLit = w.r !== 0 && ((i * 7 + w.r * 3) % 20) < (w.tag === 'u' ? 3 : 6);
const q = (Math.imul(i + 11, 0x9E3779B1) >>> 0) / 4294967296;
w.level = isLit && w.tag !== 'stem' ? (q < 0.5 ? 1 : (q < 0.76 ? 2 : (q < 0.91 ? 3 : 4))) : 0;
w.color = w.r ? hsl(HUES[w.r] + ((i * 37) % 29) - 14, 92, 56 + ((i * 11) % 13)) : '#9AA3B5';
});
const waiting = [null, null, null, null, null, null];
[[1, 'rad'], [2, 'arcuate'], [3, 'rad']].forEach((q) => {
const c = wires.filter((w) => w.r === q[0] && w.tag === q[1] && w.side === 1 && w.level === 0);
if (c.length) { waiting[q[0]] = c[c.length >> 1]; waiting[q[0]].waiting = true; }
});
// One point of light per strand end: the unlit field, and the lights each start leaves behind.
const stA = [], stW = [], stO = [], stP = [];
wires.forEach((w, wi) => {
w.strands.forEach((s, ord) => {
stA.push(s0[s] + sn[s] - 1); stW.push(wi); stO.push(ord); stP.push(sPiece[s]);
if (w.tag === 'u') { stA.push(s0[s]); stW.push(wi); stO.push(ord + 6); stP.push(sPiece[s]); }
});
});
const total = flat.length / 3;
this.F = {
n: s0.length, total: total, b: Float32Array.from(flat), s0: Int32Array.from(s0), sn: Int16Array.from(sn),
area: Uint8Array.from(sArea), piece: Uint8Array.from(sPiece), wire: Int32Array.from(sWire),
sx: new Float32Array(total), sy: new Float32Array(total), sz: new Float32Array(total)
};
this.stars = { n: stA.length, at: Int32Array.from(stA), wire: Int32Array.from(stW), ord: Uint8Array.from(stO), piece: Uint8Array.from(stP) };
this.pieces = pieces;
this.wires = wires;
this.byRegion = byRegion;
this.waiting = waiting;
this.views = [null, { yaw: -0.75, pitch: 0.1 }, { yaw: -1.45, pitch: -0.05 }, { yaw: -1.95, pitch: 0.55 }, { yaw: -2.6, pitch: 0.1 }, { yaw: -2.5, pitch: -0.35 }];
this.partColors = [null, hsl(190, 92, 62), hsl(322, 92, 66), hsl(140, 82, 58), hsl(38, 95, 60), hsl(262, 92, 72)];
this.partNames = ['All', 'Portfolio', 'Studies', 'Fitness', 'Money', 'Home'];
}
bind(cv) {
const pts = new Map();
let pinch = 0, moved = 0, t0 = 0, multi = false;
const dist = () => {
const a = Array.from(pts.values());
return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
};
const down = (e) => {
try { cv.setPointerCapture(e.pointerId); } catch (err) { /* pointer already released */ }
pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
this.dragging = true;
if (pts.size === 1) { moved = 0; t0 = performance.now(); multi = false; }
if (pts.size === 2) { pinch = dist(); multi = true; }
};
const move = (e) => {
const p = pts.get(e.pointerId);
if (!p) return;
const dx = e.clientX - p.x, dy = e.clientY - p.y;
p.x = e.clientX;
p.y = e.clientY;
moved += Math.abs(dx) + Math.abs(dy);
if (moved > 6) this.goal = null;
if (pts.size === 1 && moved > 6) {
this.cam.yaw += dx * 0.01;
this.cam.pitch = this.clamp(this.cam.pitch + dy * 0.01, -1.3, 1.3);
} else if (pts.size === 2) {
const d = dist();
if (pinch > 0) this.cam.zoom = this.clamp(this.cam.zoom * d / pinch, 0.8, 3.2);
pinch = d;
}
};
const up = (e) => {
const had = pts.has(e.pointerId);
pts.delete(e.pointerId);
pinch = 0;
if (pts.size === 0) {
this.dragging = false;
if (had && !multi && moved <= 6 && performance.now() - t0 < 400 && e.type === 'pointerup') {
const box = cv.getBoundingClientRect();
const k = box.width ? 358 / box.width : 1;
this.tap((e.clientX - box.left) * k, (e.clientY - box.top) * k);
}
}
};
cv.addEventListener('pointerdown', down);
cv.addEventListener('pointermove', move);
cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', (e) => {
e.preventDefault();
this.goal = null;
this.cam.zoom = this.clamp(this.cam.zoom * Math.exp(-e.deltaY * 0.0015), 0.8, 3.2);
}, { passive: false });
}
project(x, y, z) {
const v = this.view;
const X = x - v.fx, Y = y - v.fy, Z = z - v.fz;
const x1 = X * v.cy + Z * v.sy, z1 = -X * v.sy + Z * v.cy;
const y2 = Y * v.cp - z1 * v.sp, z2 = Y * v.sp + z1 * v.cp;
const f = 3.4 / (3.4 - z2);
return { x: 179 + x1 * v.S * f, y: 170 - y2 * v.S * f, z: z2 };
}
tap(x, y) {
if (!this.view || this.phase === 'drawing') return;
const e = this.ex;
let best = null, score = 1e9;
this.pieces.forEach((p) => {
if (p.r === 0) return;
const q = this.project(p.cx + p.ox * e, p.cy + p.oy * e, p.cz + p.oz * e);
const d = Math.hypot(q.x - x, q.y - y);
if (d > 62 * this.view.S / 150) return;
const s = d - q.z * 25;
if (s < score) { score = s; best = p; }
});
this.pick(best ? best.r : 0);
}
pick(r) {
this.region = r;
if (this.cam) {
if (r === 0) {
this.goal = { zoom: 1, fx: 0, fy: -0.16, fz: 0 };
} else {
const v = this.views[r];
let cx = 0, cy = 0, cz = 0, m = 0;
this.pieces.forEach((p) => {
if (p.r !== r || (r === 2 && p.side !== 1)) return;
cx += p.cx + p.ox; cy += p.cy + p.oy; cz += p.cz + p.oz; m++;
});
m = m || 1;
let ty = v.yaw;
while (ty - this.cam.yaw > Math.PI) ty -= Math.PI * 2;
while (ty - this.cam.yaw < -Math.PI) ty += Math.PI * 2;
this.goal = { yaw: ty, pitch: v.pitch, zoom: 2.9, fx: cx / m, fy: cy / m, fz: cz / m };
}
}
this.rerender();
}
zoomBy(f) {
if (!this.cam) return;
this.goal = { zoom: this.clamp(this.cam.zoom * f, 0.8, 3.2) };
}
next() {
if (!this.waiting) return 0;
for (let r = 1; r <= 5; r++) if (this.waiting[r]) return r;
return 0;
}
start(r) {
if (!this.waiting || this.phase === 'drawing' || !this.waiting[r]) return;
this.active = this.waiting[r];
this.phase = 'drawing';
this.elapsed = 0;
this.paused = false;
this.clock = '2:00';
const tracks = [];
let s = 17 + r * 101;
const rn = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
for (let i = 0; i < 14; i++) tracks.push({ ang: rn() * Math.PI * 2, len: 26 + rn() * 54, bend: (rn() - 0.5) * 46, w: rn() });
this.burst = { t: 0, tracks: tracks };
this.pick(r);
}
finish() {
const w = this.active;
w.waiting = false;
w.level = 1;
this.waiting[w.r] = null;
this.flare = { t: 0, wire: w };
this.active = null;
this.phase = 'awake';
this.ver += 1;
this.rerender();
}
hull(points) {
const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
if (p.length < 3) return p;
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const lo = [];
for (let i = 0; i < p.length; i++) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p[i]) <= 0) lo.pop(); lo.push(p[i]); }
const hi = [];
for (let i = p.length - 1; i >= 0; i--) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p[i]) <= 0) hi.pop(); hi.push(p[i]); }
lo.pop(); hi.pop();
return lo.concat(hi);
}
renderSky(dpr) {
const F = this.F, cam = this.cam, v = this.view, e = this.ex, region = this.region, T = this.stars;
const WC = 358, HC = 340, CX = 179, CY = 170;
const off = this.off, ctx = this.octx;
if (off.width !== WC * dpr) { off.width = WC * dpr; off.height = HC * dpr; }
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
ctx.globalCompositeOperation = 'source-over';
ctx.globalAlpha = 1;
ctx.fillStyle = '#05060A';
ctx.fillRect(0, 0, WC, HC);
ctx.lineJoin = 'round';
ctx.lineCap = 'round';
const pieces = this.pieces, wires = this.wires;
for (let i = 0; i < F.n; i++) {
const p = pieces[F.piece[i]];
const ox = p.ox * e - cam.fx, oy = p.oy * e - cam.fy, oz = p.oz * e - cam.fz;
const a = F.s0[i], n = F.sn[i];
for (let k = 0; k < n; k++) {
const j = a + k;
const x = F.b[j * 3] + ox, y = F.b[j * 3 + 1] + oy, z = F.b[j * 3 + 2] + oz;
const x1 = x * v.cy + z * v.sy, z1 = -x * v.sy + z * v.cy;
const y2 = y * v.cp - z1 * v.sp, z2 = y * v.sp + z1 * v.cp;
const f = 3.4 / (3.4 - z2);
F.sx[j] = CX + x1 * v.S * f; F.sy[j] = CY - y2 * v.S * f; F.sz[j] = z2;
}
}
const depthOf = (z) => this.clamp((z + 0.95) / 1.9, 0, 1);
const match = (r) => region === 0 || r === region;
const wz = 0.8 + 0.2 * v.S / 150;
// 1. The unlit field: dim points and barely visible traces.
const dim = [[], [], []], dimOff = [[], [], []];
const litStars = [];
for (let i = 0; i < T.n; i++) {
const w = wires[T.wire[i]], j = T.at[i];
if (w.level > 0 && T.ord[i] <= w.level) { litStars.push(i); continue; }
const d = depthOf(F.sz[j]);
(match(w.r) || w.r === 0 ? dim : dimOff)[d < 0.34 ? 0 : (d < 0.67 ? 1 : 2)].push(j);
}
const ps = 1.05 * wz;
const dust = (list, alpha) => {
if (!list.length) return;
ctx.globalAlpha = alpha;
ctx.beginPath();
for (let q = 0; q < list.length; q++) ctx.rect(F.sx[list[q]] - ps / 2, F.sy[list[q]] - ps / 2, ps, ps);
ctx.fill();
};
ctx.fillStyle = '#8E98AC';
dust(dim[0], 0.16); dust(dim[1], 0.3); dust(dim[2], 0.5);
dust(dimOff[0], 0.05); dust(dimOff[1], 0.08); dust(dimOff[2], 0.12);
const line = (w) => {
const s = w.strands[0], a = F.s0[s], n = F.sn[s];
ctx.moveTo(F.sx[a], F.sy[a]);
for (let k = 1; k < n; k++) ctx.lineTo(F.sx[a + k], F.sy[a + k]);
};
const mid = (w) => { const s = w.strands[0]; return F.sz[F.s0[s] + (F.sn[s] >> 1)]; };
const traces = [[], [], []], tracesOff = [];
wires.forEach((w) => {
if (w.level > 0 || w.waiting) return;
if (!(match(w.r) || w.r === 0)) { tracesOff.push(w); return; }
const d = depthOf(mid(w));
traces[d < 0.34 ? 0 : (d < 0.67 ? 1 : 2)].push(w);
});
ctx.strokeStyle = '#7C8598';
ctx.lineWidth = 0.5 * wz;
[[traces[0], 0.07], [traces[1], 0.12], [traces[2], 0.2], [tracesOff, 0.04]].forEach((b) => {
if (!b[0].length) return;
ctx.globalAlpha = b[1];
ctx.beginPath();
b[0].forEach(line);
ctx.stroke();
});
// 2. Light: lit lines add up where they cross, like fluorescence on black.
ctx.globalCompositeOperation = 'lighter';
const glow = this.lit;
const W = [0, 0.6, 0.8, 1.0, 1.25], A = [0, 0.4, 0.62, 0.82, 0.96];
wires.forEach((w) => {
if (w.level <= 0) return;
const d = depthOf(mid(w));
const a = (0.35 + 0.65 * d) * (0.4 + 0.6 * glow) * (match(w.r) ? 1 : 0.14);
ctx.strokeStyle = w.color;
ctx.beginPath();
line(w);
if (w.level >= 3) { ctx.globalAlpha = 0.1 * a; ctx.lineWidth = (w.level === 4 ? 7 : 4.5) * wz; ctx.stroke(); }
if (w.level === 4) { ctx.globalAlpha = 0.16 * a; ctx.lineWidth = 3 * wz; ctx.stroke(); }
ctx.globalAlpha = A[w.level] * a;
ctx.lineWidth = W[w.level] * wz;
ctx.stroke();
if (w.level === 4) { ctx.strokeStyle = '#FFFFFF'; ctx.globalAlpha = 0.55 * a; ctx.lineWidth = 0.45 * wz; ctx.stroke(); }
});
for (let q = 0; q < litStars.length; q++) {
const i = litStars[q], w = wires[T.wire[i]], j = T.at[i];
const d = depthOf(F.sz[j]);
const a = (0.4 + 0.6 * d) * (0.45 + 0.55 * glow) * (match(w.r) ? 1 : 0.14);
const head = T.ord[i] === 0;
const r = (head ? 1.0 + 0.2 * w.level : 0.6 + 0.08 * w.level) * wz;
ctx.fillStyle = w.color;
if (head) { ctx.globalAlpha = 0.1 * a; ctx.beginPath(); ctx.arc(F.sx[j], F.sy[j], r * 2.6, 0, Math.PI * 2); ctx.fill(); }
ctx.globalAlpha = 0.95 * a;
ctx.beginPath();
ctx.arc(F.sx[j], F.sy[j], r, 0, Math.PI * 2);
ctx.fill();
}
// 3. Boundaries of each part once they are pulled apart or one is selected.
if (region !== 0) {
const groups = pieces.map(() => []);
for (let i = 0; i < T.n; i += 2) groups[T.piece[i]].push([F.sx[T.at[i]], F.sy[T.at[i]]]);
pieces.forEach((p, pi) => {
if (p.r !== region || groups[pi].length < 3) return;
const h = this.hull(groups[pi]);
let mx = 0, my = 0;
h.forEach((q) => { mx += q[0]; my += q[1]; });
mx /= h.length; my /= h.length;
const g2 = h.map((q) => [mx + (q[0] - mx) * 1.08, my + (q[1] - my) * 1.08]);
const m2 = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const first = m2(g2[g2.length - 1], g2[0]);
ctx.beginPath();
ctx.moveTo(first[0], first[1]);
for (let k = 0; k < g2.length; k++) {
const nx = m2(g2[k], g2[(k + 1) % g2.length]);
ctx.quadraticCurveTo(g2[k][0], g2[k][1], nx[0], nx[1]);
}
ctx.strokeStyle = this.partColors[p.r];
ctx.globalAlpha = 0.4;
ctx.lineWidth = 0.7;
ctx.stroke();
});
}
ctx.globalCompositeOperation = 'source-over';
// 4. Lines waiting to be started.
for (let r = 1; r <= 5; r++) {
const w = this.waiting[r];
if (!w) continue;
const s = w.strands[0], end = F.s0[s] + F.sn[s] - 1;
ctx.beginPath();
line(w);
ctx.setLineDash([1.5, 4]);
ctx.strokeStyle = '#EEF1F6';
ctx.globalAlpha = match(r) ? 0.9 : 0.25;
ctx.lineWidth = 0.9 * wz;
ctx.stroke();
ctx.setLineDash([]);
ctx.beginPath();
ctx.arc(F.sx[end], F.sy[end], 4, 0, Math.PI * 2);
ctx.lineWidth = 1;
ctx.stroke();
}
ctx.globalAlpha = 1;
}
along(i, p) {
const F = this.F, a = F.s0[i], n = F.sn[i];
const f = this.clamp(p, 0, 1) * (n - 1), k = Math.min(n - 2, Math.floor(f)), u = f - k;
return { k: k, x: F.sx[a + k] + (F.sx[a + k + 1] - F.sx[a + k]) * u, y: F.sy[a + k] + (F.sy[a + k + 1] - F.sy[a + k]) * u };
}
frame(now) {
const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
this.last = now;
const cv = this.cv, ctx = this.ctx, cam = this.cam, F = this.F;
const WC = 358, HC = 340;
const dpr = Math.min(2, window.devicePixelRatio || 1);
if (cv.width !== WC * dpr) { cv.width = WC * dpr; cv.height = HC * dpr; }
const awake = this.phase !== 'quiet';
this.lit += ((awake ? 1 : 0.45) - this.lit) * Math.min(1, dt * 3);
if (awake && !this.reduce) this.pulseClock += dt;
if (this.goal) {
const k = 1 - Math.exp(-dt * 4);
let far = false;
Object.keys(this.goal).forEach((key) => {
const d = this.goal[key] - cam[key];
cam[key] += d * k;
if (Math.abs(d) > 0.003) far = true;
});
if (!far) this.goal = null;
}
const te = this.clamp((cam.zoom - 1.1) / 0.8, 0, 1), target = te * te * (3 - 2 * te);
this.ex += (target - this.ex) * Math.min(1, dt * 6);
if (Math.abs(this.ex - target) < 0.002) this.ex = target;
const e = this.ex;
const drift = this.props.drift ?? true;
if (awake && drift && !this.reduce && !this.dragging && !this.goal && this.region === 0 && e < 0.05) cam.yaw += dt * 0.06;
let progress = 0;
if (this.phase === 'drawing') {
const dur = Math.max(3, Number(this.props.demoSeconds ?? 20));
if (!this.paused) this.elapsed += dt;
progress = this.clamp(this.elapsed / dur, 0, 1);
const rem = Math.ceil(120 * (1 - progress));
const text = Math.floor(rem / 60) + ':' + String(rem % 60).padStart(2, '0');
if (text !== this.clock) { this.clock = text; this.rerender(); }
}
const S = 150 * cam.zoom / (1 + 1.3 * e);
this.view = { cy: Math.cos(cam.yaw), sy: Math.sin(cam.yaw), cp: Math.cos(cam.pitch), sp: Math.sin(cam.pitch), S: S, fx: cam.fx, fy: cam.fy, fz: cam.fz };
const sig = [cam.yaw, cam.pitch, cam.zoom, cam.fx, cam.fy, cam.fz, e].map((n) => n.toFixed(4)).join(',') + '|' + this.region + '|' + this.ver + '|' + this.lit.toFixed(2) + '|' + dpr;
if (sig !== this.sig) { this.sig = sig; this.renderSky(dpr); }
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
ctx.globalCompositeOperation = 'source-over';
ctx.globalAlpha = 1;
ctx.clearRect(0, 0, WC, HC);
ctx.drawImage(this.off, 0, 0, WC, HC);
ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.globalCompositeOperation = 'lighter';
const region = this.region, wires = this.wires;
const wz = 0.8 + 0.2 * S / 150;
const depthOf = (z) => this.clamp((z + 0.95) / 1.9, 0, 1);
const spot = (x, y, r, color, alpha) => {
ctx.fillStyle = color;
ctx.globalAlpha = 0.22 * alpha;
ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill();
ctx.fillStyle = '#FFFFFF';
ctx.globalAlpha = alpha;
ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
};
// Signals: specks that travel the lit lines and leave a short trail.
for (let i = 0; i < wires.length; i++) {
const w = wires[i];
if (w.level < 2 || w.tag === 'u') continue;
const s = w.strands[0];
const m = (region === 0 || w.r === region ? 1 : 0.14) * (0.35 + 0.65 * depthOf(F.sz[F.s0[s] + (F.sn[s] >> 1)])) * (awake ? 1 : 0.5);
const p = (w.phase + this.pulseClock * w.speed * (0.7 + 0.25 * w.level)) % 1;
const head = this.along(s, p);
if (awake) {
ctx.strokeStyle = w.color;
ctx.lineWidth = 1.1 * wz;
let prev = head;
for (let t = 1; t <= 4; t++) {
const q = p - t * 0.025;
if (q < 0) break;
const pt = this.along(s, q);
ctx.globalAlpha = 0.5 * m * (1 - t / 5);
ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
prev = pt;
}
}
spot(head.x, head.y, 1.1 * wz, w.color, 0.9 * m);
}
if (this.phase === 'drawing' && this.active) {
const w = this.active, s = w.strands[0], a = F.s0[s];
const head = this.along(s, progress);
const color = this.partColors[w.r];
ctx.strokeStyle = color;
ctx.beginPath();
ctx.moveTo(F.sx[a], F.sy[a]);
for (let k = 1; k <= head.k; k++) ctx.lineTo(F.sx[a + k], F.sy[a + k]);
ctx.lineTo(head.x, head.y);
ctx.globalAlpha = 0.14; ctx.lineWidth = 7 * wz; ctx.stroke();
ctx.globalAlpha = 1; ctx.lineWidth = 1.3 * wz; ctx.stroke();
spot(head.x, head.y, 2.4 * wz, color, 1);
if (this.burst) {
this.burst.t += dt;
const t = this.burst.t / 1.8;
if (t >= 1) this.burst = null;
else {
const ease = 1 - Math.pow(1 - t, 3), ox = F.sx[a], oy = F.sy[a];
this.burst.tracks.forEach((tr) => {
const L = tr.len * ease * wz;
const ex = ox + Math.cos(tr.ang) * L, ey = oy + Math.sin(tr.ang) * L;
const bx = ox + Math.cos(tr.ang) * L * 0.5 - Math.sin(tr.ang) * tr.bend * ease, by = oy + Math.sin(tr.ang) * L * 0.5 + Math.cos(tr.ang) * tr.bend * ease;
ctx.strokeStyle = tr.w > 0.6 ? '#FFFFFF' : color;
ctx.globalAlpha = 0.75 * Math.pow(1 - t, 1.5);
ctx.lineWidth = 0.6 + 0.4 * tr.w;
ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(bx, by, ex, ey); ctx.stroke();
});
}
}
}
if (this.flare) {
this.flare.t += dt;
const t = this.flare.t / 1.1;
if (t >= 1) this.flare = null;
else {
const s = this.flare.wire.strands[0], end = F.s0[s] + F.sn[s] - 1;
ctx.strokeStyle = this.partColors[this.flare.wire.r];
ctx.globalAlpha = Math.pow(1 - t, 1.4);
ctx.lineWidth = 1.2;
ctx.beginPath(); ctx.arc(F.sx[end], F.sy[end], 4 + 26 * (1 - Math.pow(1 - t, 3)), 0, Math.PI * 2); ctx.stroke();
}
}
ctx.globalCompositeOperation = 'source-over';
if (region === 0 && e > 0.55) {
ctx.font = '600 11px Inter, system-ui, sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
const placed = [];
for (let r = 1; r <= 5; r++) {
let best = null;
this.pieces.forEach((p) => {
if (p.r !== r) return;
const q = this.project(p.cx + p.ox * e, p.cy + p.oy * e, p.cz + p.oz * e);
if (!best || q.z > best.z) best = q;
});
if (!best) continue;
const name = this.partNames[r];
const half = name.length * 3.4 + 8;
const lx = this.clamp(best.x, half, WC - half), ly = this.clamp(best.y, 10, HC - 10);
if (placed.some((p) => Math.abs(p.x - lx) < p.h + half && Math.abs(p.y - ly) < 16)) continue;
placed.push({ x: lx, y: ly, h: half });
ctx.globalAlpha = 0.8 * this.clamp((e - 0.55) / 0.3, 0, 1);
ctx.fillStyle = '#05060A';
ctx.fillRect(lx - half, ly - 9, half * 2, 18);
ctx.globalAlpha = this.clamp((e - 0.55) / 0.3, 0, 1);
ctx.fillStyle = this.partColors[r];
ctx.fillText(name, lx, ly);
}
}
ctx.globalAlpha = 1;
if (this.phase === 'drawing' && progress >= 1) this.finish();
}
renderVals() {
this.defaults();
const phase = this.phase, region = this.region;
const plans = [null,
'If I sit down with coffee, then I open the case study.',
'If I finish lunch, then I read one page of notes.',
'If I get home, then I put on my running shoes.',
'', ''];
const focus = [null,
'Keep the cue fixed. The same time and place each day is what lets repetition stick.',
'Quiz yourself instead of rereading, and spread sessions across several days.',
'Shrink the start. Shoes on counts, and two minutes is enough to fire the line.',
'A missed day erases nothing. Forgive the gap and fire one line again.',
'Reward the start, not the finish. The line lights when you begin.'];
const names = ['All', 'Portfolio', 'Studies', 'Fitness', 'Money', 'Home'];
const colors = this.partColors || [null, '#3fd5f7', '#f65bb8', '#3de87a', '#f9b338', '#a57bf7'];
const chip = (i) => {
const on = region === i;
return { pressed: on, fg: on ? '#EEF1F6' : '#9BA3B0', bd: on ? (colors[i] || '#EEF1F6') : '#262B34', dot: colors[i] || '#EEF1F6', pick: () => this.pick(i) };
};
const waiting = this.waiting || [null, 1, 1, 1, null, null];
let left = 0;
for (let r = 1; r <= 5; r++) if (waiting[r]) left++;
const nxt = this.next() || 1;
const all = this.wires || [];
const list = (this.byRegion && this.byRegion[region]) || [];
const count = (ws, lo, hi) => ws.filter((w) => w.level >= lo && w.level <= hi).length;
const starts = (ws) => ws.reduce((n, w) => n + (w.level > 0 ? [0, 1, 3, 7, 14][w.level] : 0), 0);
const drawing = phase === 'drawing';
if (!this.setCanvas) this.setCanvas = (el) => { if (el) this.cv = el; };
return {
c0: chip(0), c1: chip(1), c2: chip(2), c3: chip(3), c4: chip(4), c5: chip(5),
isQuiet: phase === 'quiet',
isDrawing: drawing,
isAwake: phase === 'awake',
showOverview: !drawing && region === 0 && left > 0,
showDone: !drawing && region === 0 && left === 0,
showPart: !drawing && region !== 0,
showPartStart: !drawing && region !== 0 && !!waiting[region],
waitingLine: left === 1 ? '1 line waiting' : left + ' lines waiting',
totals: count(all, 1, 4) + ' lines lit · ' + starts(all) + ' starts',
nextName: names[nxt],
nextColor: colors[nxt],
nextPlan: plans[nxt],
partName: names[region] || '',
partColor: colors[region] || '#EEF1F6',
partStarts: starts(list) + ' starts',
faint: count(list, 1, 1),
steady: count(list, 2, 3),
automatic: count(list, 4, 4),
partFocus: focus[region] || '',
partPlan: plans[region] || '',
activePlan: this.active ? plans[this.active.r] : '',
clock: this.clock,
pauseLabel: this.paused ? 'Resume' : 'Pause',
start: () => this.start(this.next()),
startHere: () => this.start(this.region),
togglePause: () => { this.paused = !this.paused; this.rerender(); },
zoomIn: () => this.zoomBy(1.4),
zoomOut: () => this.zoomBy(1 / 1.4),
setCanvas: this.setCanvas
};
}
}
