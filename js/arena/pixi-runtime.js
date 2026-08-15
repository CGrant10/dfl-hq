import { $ as e, B as t, C as n, I as r, J as i, K as a, L as o, U as s, W as c, X as l, Z as u, b as d, g as f, h as p, it as m, nt as h, q as g, rt as _, tt as v, v as y, x as b, z as x } from "./Geometry-CW_aidqb.js";
import { t as S } from "./getPo2TextureFromSource-Df-ffBe0.js";
import { t as C } from "./canvasUtils-BhZPiFjM.js";
import { D as w, E as T, f as E, u as ee } from "./RenderTargetSystem-CL31NvbB.js";
import { a as D, i as O, n as te, o as k, r as A, s as j } from "./CanvasRenderer-BB6FIAvI.js";
import { t as ne } from "./CanvasPool-BTs3zFci.js";
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/environment-browser/browserExt.mjs
var re = {
	extension: {
		type: _.Environment,
		name: "browser",
		priority: -1
	},
	test: () => !0,
	load: async () => {
		await import("./browserAll-BLsQxPm-.js");
	}
}, ie = {
	extension: {
		type: _.Environment,
		name: "webworker",
		priority: 0
	},
	test: () => typeof self < "u" && self.WorkerGlobalScope !== void 0,
	load: async () => {
		await import("./webworkerAll-N0IZNyOt.js");
	}
}, M;
function ae(e) {
	return M === void 0 && (M = (() => {
		let t = {
			stencil: !0,
			failIfMajorPerformanceCaveat: e ?? w.defaultOptions.failIfMajorPerformanceCaveat
		};
		try {
			if (!y.get().getWebGLRenderingContext()) return !1;
			let e = y.get().createCanvas().getContext("webgl", t), n = !!e?.getContextAttributes()?.stencil;
			if (e) {
				let t = e.getExtension("WEBGL_lose_context");
				t && t.loseContext();
			}
			return e = null, n;
		} catch {
			return !1;
		}
	})()), M;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/utils/browser/isWebGPUSupported.mjs
var N;
async function oe(e = {}) {
	return N === void 0 && (N = await (async () => {
		let t = y.get().getNavigator().gpu;
		if (!t) return !1;
		try {
			return await (await t.requestAdapter(e)).requestDevice(), !0;
		} catch {
			return !1;
		}
	})()), N;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/autoDetectRenderer.mjs
var se = [
	"webgl",
	"webgpu",
	"canvas"
];
async function ce(e) {
	let t = [];
	e.preference ? Array.isArray(e.preference) ? t = e.preference.slice() : (t.push(e.preference), se.forEach((n) => {
		n !== e.preference && t.push(n);
	})) : t = se.slice();
	let n, r = {};
	for (let i = 0; i < t.length; i++) {
		let a = t[i];
		if (a === "webgpu" && await oe()) {
			let { WebGPURenderer: t } = await import("./WebGPURenderer-qWv9ERNr.js").then((e) => e.t);
			n = t, r = {
				...e,
				...e.webgpu
			};
			break;
		}
		if (a === "webgl" && ae(e.failIfMajorPerformanceCaveat ?? w.defaultOptions.failIfMajorPerformanceCaveat)) {
			let { WebGLRenderer: t } = await import("./WebGLRenderer-CYZnrh0q.js").then((e) => e.t);
			n = t, r = {
				...e,
				...e.webgl
			};
			break;
		}
		if (a === "canvas") {
			let { CanvasRenderer: t } = await import("./CanvasRenderer-BB6FIAvI.js").then((e) => e.t);
			n = t, r = {
				...e,
				...e.canvasOptions
			};
			break;
		}
	}
	if (delete r.webgpu, delete r.webgl, delete r.canvasOptions, !n) throw Error("No available renderer for the current environment");
	let i = new n();
	return await i.init(r), i;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/app/ResizePlugin.mjs
var le = class {
	static init(e) {
		Object.defineProperty(this, "resizeTo", {
			configurable: !0,
			set(e) {
				globalThis.removeEventListener("resize", this.queueResize), this._resizeTo = e, e && (globalThis.addEventListener("resize", this.queueResize), this.resize());
			},
			get() {
				return this._resizeTo;
			}
		}), this.queueResize = () => {
			this._resizeTo && (this._cancelResize(), this._resizeId = requestAnimationFrame(() => this.resize()));
		}, this._cancelResize = () => {
			this._resizeId &&= (cancelAnimationFrame(this._resizeId), null);
		}, this.resize = () => {
			if (!this._resizeTo) return;
			this._cancelResize();
			let e, t;
			if (this._resizeTo === globalThis.window) e = globalThis.innerWidth, t = globalThis.innerHeight;
			else {
				let { clientWidth: n, clientHeight: r } = this._resizeTo;
				e = n, t = r;
			}
			this.renderer.resize(e, t), this.render();
		}, this._resizeId = null, this._resizeTo = null, this.resizeTo = e.resizeTo || null;
	}
	static destroy() {
		globalThis.removeEventListener("resize", this.queueResize), this._cancelResize(), this._cancelResize = null, this.queueResize = null, this.resizeTo = null, this.resize = null;
	}
};
le.extension = _.Application;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/app/TickerPlugin.mjs
var ue = class {
	static init(e) {
		e = Object.assign({
			autoStart: !0,
			sharedTicker: !1
		}, e), Object.defineProperty(this, "ticker", {
			configurable: !0,
			set(e) {
				this._ticker && this._ticker.remove(this.render, this), this._ticker = e, e && e.add(this.render, this, f.LOW);
			},
			get() {
				return this._ticker;
			}
		}), this.stop = () => {
			this._ticker.stop();
		}, this.start = () => {
			this._ticker.start();
		}, this._ticker = null, this.ticker = e.sharedTicker ? p.shared : new p(), e.autoStart && this.start();
	}
	static destroy() {
		if (this._ticker) {
			let e = this._ticker;
			this.ticker = null, e.destroy();
		}
	}
};
ue.extension = _.Application, m.add(le), m.add(ue);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/app/Application.mjs
var de = class e {
	constructor(...e) {
		this.stage = new b(), e[0] !== void 0 && g(i, "Application constructor options are deprecated, please use Application.init() instead.");
	}
	async init(t) {
		t = { ...t }, this.stage ||= new b(), this.renderer = await ce(t), e._plugins.forEach((e) => {
			e.init.call(this, t);
		});
	}
	render() {
		this.renderer.render({ container: this.stage });
	}
	get canvas() {
		return this.renderer.canvas;
	}
	get view() {
		return g(i, "Application.view is deprecated, please use Application.canvas instead."), this.renderer.canvas;
	}
	get screen() {
		return this.renderer.screen;
	}
	get domContainerRoot() {
		return this.renderer.renderPipes.dom?._domElement;
	}
	destroy(t = !1, n = !1) {
		let r = e._plugins.slice(0);
		r.reverse(), r.forEach((e) => {
			e.destroy.call(this);
		}), this.stage.destroy(n), this.stage = null, this.renderer.destroy(t), this.renderer = null;
	}
};
de._plugins = [];
var fe = de;
m.handleByList(_.Application, fe._plugins), m.add(T);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/AbstractText.mjs
var pe = class extends d {
	constructor(e, t) {
		let { text: n, resolution: r, style: i, anchor: a, width: o, height: s, roundPixels: c, ...l } = e;
		super({ ...l }), this.batched = !0, this._resolution = null, this._autoResolution = !0, this._didTextUpdate = !0, this._styleClass = t, this.text = n ?? "", this.style = i, this.resolution = r ?? null, this.allowChildren = !1, this._anchor = new h({ _onUpdate: () => {
			this.onViewUpdate();
		} }), a && (this.anchor = a), this.roundPixels = c ?? !1, o !== void 0 && (this.width = o), s !== void 0 && (this.height = s);
	}
	get anchor() {
		return this._anchor;
	}
	set anchor(e) {
		typeof e == "number" ? this._anchor.set(e) : this._anchor.copyFrom(e);
	}
	set text(e) {
		e = e.toString(), this._text !== e && (this._text = e, this.onViewUpdate());
	}
	get text() {
		return this._text;
	}
	set resolution(e) {
		this._autoResolution = e === null, this._resolution = e, this.onViewUpdate();
	}
	get resolution() {
		return this._resolution;
	}
	get style() {
		return this._style;
	}
	set style(e) {
		e ||= {}, this._style?.off("update", this.onViewUpdate, this), this._style = e instanceof this._styleClass ? e : new this._styleClass(e), this._style.on("update", this.onViewUpdate, this), this.onViewUpdate();
	}
	get width() {
		return Math.abs(this.scale.x) * this.bounds.width;
	}
	set width(e) {
		this._setWidth(e, this.bounds.width);
	}
	get height() {
		return Math.abs(this.scale.y) * this.bounds.height;
	}
	set height(e) {
		this._setHeight(e, this.bounds.height);
	}
	getSize(e) {
		return e ||= {}, e.width = Math.abs(this.scale.x) * this.bounds.width, e.height = Math.abs(this.scale.y) * this.bounds.height, e;
	}
	setSize(e, t) {
		typeof e == "object" ? (t = e.height ?? e.width, e = e.width) : t ??= e, e !== void 0 && this._setWidth(e, this.bounds.width), t !== void 0 && this._setHeight(t, this.bounds.height);
	}
	containsPoint(e) {
		let t = this.bounds.width, n = this.bounds.height, r = -t * this.anchor.x, i = 0;
		return e.x >= r && e.x <= r + t && (i = -n * this.anchor.y, e.y >= i && e.y <= i + n);
	}
	onViewUpdate() {
		this.didViewUpdate || (this._didTextUpdate = !0), super.onViewUpdate();
	}
	destroy(e = !1) {
		super.destroy(e), this.owner = null, this._bounds = null, this._anchor = null, (typeof e == "boolean" ? e : e?.style) && this._style.destroy(e), this._style = null, this._text = null;
	}
	get styleKey() {
		return `${this._text}:${this._style.styleKey}:${this._resolution}`;
	}
};
function me(e, t) {
	let n = e[0] ?? {};
	return (typeof n == "string" || e[1]) && (g(i, `use new ${t}({ text: "hi!", style }) instead`), n = {
		text: n,
		style: e[1]
	}), n;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/utils/canvas/getCanvasBoundingBox.mjs
var P = null, F = null;
function he(e, t) {
	P || (P = y.get().createCanvas(256, 128), F = P.getContext("2d", { willReadFrequently: !0 }), F.globalCompositeOperation = "copy", F.globalAlpha = 1), (P.width < e || P.height < t) && (P.width = a(e), P.height = a(t));
}
function ge(e, t, n) {
	for (let r = 0, i = 4 * n * t; r < t; ++r, i += 4) if (e[i + 3] !== 0) return !1;
	return !0;
}
function I(e, t, n, r, i) {
	let a = 4 * t;
	for (let t = r, o = r * a + 4 * n; t <= i; ++t, o += a) if (e[o + 3] !== 0) return !1;
	return !0;
}
function _e(...e) {
	let t = e[0];
	t.canvas || (t = {
		canvas: e[0],
		resolution: e[1]
	});
	let { canvas: n } = t, r = Math.min(t.resolution ?? 1, 1), i = t.width ?? n.width, a = t.height ?? n.height, o = t.output;
	if (he(i, a), !F) throw TypeError("Failed to get canvas 2D context");
	F.drawImage(n, 0, 0, i, a, 0, 0, i * r, a * r);
	let s = F.getImageData(0, 0, i, a).data, c = 0, l = 0, d = i - 1, f = a - 1;
	for (; l < a && ge(s, i, l);) ++l;
	if (l === a) return u.EMPTY;
	for (; ge(s, i, f);) --f;
	for (; I(s, i, c, l, f);) ++c;
	for (; I(s, i, d, l, f);) --d;
	return ++d, ++f, F.globalCompositeOperation = "source-over", F.strokeRect(c, l, d - c, f - l), F.globalCompositeOperation = "copy", o ??= new u(), o.set(c / r, l / r, (d - c) / r, (f - l) / r), o;
}
//#endregion
//#region node_modules/.pnpm/tiny-lru@11.4.7/node_modules/tiny-lru/dist/tiny-lru.js
var ve = class {
	constructor(e = 0, t = 0, n = !1) {
		this.first = null, this.items = Object.create(null), this.last = null, this.max = e, this.resetTtl = n, this.size = 0, this.ttl = t;
	}
	clear() {
		return this.first = null, this.items = Object.create(null), this.last = null, this.size = 0, this;
	}
	delete(e) {
		if (this.has(e)) {
			let t = this.items[e];
			delete this.items[e], this.size--, t.prev !== null && (t.prev.next = t.next), t.next !== null && (t.next.prev = t.prev), this.first === t && (this.first = t.next), this.last === t && (this.last = t.prev);
		}
		return this;
	}
	entries(e = this.keys()) {
		let t = Array(e.length);
		for (let n = 0; n < e.length; n++) {
			let r = e[n];
			t[n] = [r, this.get(r)];
		}
		return t;
	}
	evict(e = !1) {
		if (e || this.size > 0) {
			let e = this.first;
			delete this.items[e.key], --this.size === 0 ? (this.first = null, this.last = null) : (this.first = e.next, this.first.prev = null);
		}
		return this;
	}
	expiresAt(e) {
		let t;
		return this.has(e) && (t = this.items[e].expiry), t;
	}
	get(e) {
		let t = this.items[e];
		if (t !== void 0) {
			if (this.ttl > 0 && t.expiry <= Date.now()) {
				this.delete(e);
				return;
			}
			return this.moveToEnd(t), t.value;
		}
	}
	has(e) {
		return e in this.items;
	}
	moveToEnd(e) {
		this.last !== e && (e.prev !== null && (e.prev.next = e.next), e.next !== null && (e.next.prev = e.prev), this.first === e && (this.first = e.next), e.prev = this.last, e.next = null, this.last !== null && (this.last.next = e), this.last = e, this.first === null && (this.first = e));
	}
	keys() {
		let e = Array(this.size), t = this.first, n = 0;
		for (; t !== null;) e[n++] = t.key, t = t.next;
		return e;
	}
	setWithEvicted(e, t, n = this.resetTtl) {
		let r = null;
		if (this.has(e)) this.set(e, t, !0, n);
		else {
			this.max > 0 && this.size === this.max && (r = { ...this.first }, this.evict(!0));
			let n = this.items[e] = {
				expiry: this.ttl > 0 ? Date.now() + this.ttl : this.ttl,
				key: e,
				prev: this.last,
				next: null,
				value: t
			};
			++this.size === 1 ? this.first = n : this.last.next = n, this.last = n;
		}
		return r;
	}
	set(e, t, n = !1, r = this.resetTtl) {
		let i = this.items[e];
		return n || i !== void 0 ? (i.value = t, n === !1 && r && (i.expiry = this.ttl > 0 ? Date.now() + this.ttl : this.ttl), this.moveToEnd(i)) : (this.max > 0 && this.size === this.max && this.evict(!0), i = this.items[e] = {
			expiry: this.ttl > 0 ? Date.now() + this.ttl : this.ttl,
			key: e,
			prev: this.last,
			next: null,
			value: t
		}, ++this.size === 1 ? this.first = i : this.last.next = i, this.last = i), this;
	}
	values(e = this.keys()) {
		let t = Array(e.length);
		for (let n = 0; n < e.length; n++) t[n] = this.get(e[n]);
		return t;
	}
};
function ye(e = 1e3, t = 0, n = !1) {
	if (isNaN(e) || e < 0) throw TypeError("Invalid max value");
	if (isNaN(t) || t < 0) throw TypeError("Invalid ttl value");
	if (typeof n != "boolean") throw TypeError("Invalid resetTtl value");
	return new ve(e, t, n);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/utils/parseTaggedText.mjs
function L(e) {
	return !!e.tagStyles && Object.keys(e.tagStyles).length > 0;
}
function R(e) {
	return e.includes("<");
}
function be(e, t) {
	return e.clone().assign(t);
}
function xe(e, t) {
	let n = [], r = t.tagStyles;
	if (!L(t) || !R(e)) return n.push({
		text: e,
		style: t
	}), n;
	let i = [t], a = [], o = "", s = 0;
	for (; s < e.length;) {
		let t = e[s];
		if (t === "<") {
			let c = e.indexOf(">", s);
			if (c === -1) {
				o += t, s++;
				continue;
			}
			let l = e.indexOf("<", s + 1);
			if (l !== -1 && l < c) {
				o += t, s++;
				continue;
			}
			let u = e.slice(s + 1, c);
			if (u.startsWith("/")) {
				let t = u.slice(1).trim();
				if (a.length > 0 && a[a.length - 1] === t) {
					o.length > 0 && (n.push({
						text: o,
						style: i[i.length - 1]
					}), o = ""), i.pop(), a.pop(), s = c + 1;
					continue;
				}
				o += e.slice(s, c + 1), s = c + 1;
				continue;
			}
			{
				let t = u.trim();
				if (r[t]) {
					o.length > 0 && (n.push({
						text: o,
						style: i[i.length - 1]
					}), o = "");
					let e = i[i.length - 1], l = be(e, r[t]);
					i.push(l), a.push(t), s = c + 1;
					continue;
				}
				o += e.slice(s, c + 1), s = c + 1;
				continue;
			}
		}
		o += t, s++;
	}
	return o.length > 0 && n.push({
		text: o,
		style: i[i.length - 1]
	}), n;
}
var Se = /* @__PURE__ */ new Set([10, 13]), Ce = /* @__PURE__ */ new Set([
	9,
	32,
	8192,
	8193,
	8194,
	8195,
	8196,
	8197,
	8198,
	8200,
	8201,
	8202,
	8287,
	12288
]), we = /* @__PURE__ */ new Set([
	45,
	8208,
	8211,
	8212,
	173
]), Te = /(\r\n|\r|\n)/, Ee = /(?:\r\n|\r|\n)/;
function z(e) {
	return typeof e == "string" && Se.has(e.charCodeAt(0));
}
function B(e, t) {
	return typeof e == "string" && Ce.has(e.charCodeAt(0));
}
function De(e) {
	return typeof e == "string" && we.has(e.charCodeAt(0));
}
function V(e) {
	return e === "normal" || e === "pre-line";
}
function H(e) {
	return e === "normal";
}
function U(e) {
	if (typeof e != "string") return "";
	let t = e.length - 1;
	for (; t >= 0 && B(e[t]);) t--;
	return t < e.length - 1 ? e.slice(0, t + 1) : e;
}
function Oe(e) {
	let t = [], n = [];
	if (typeof e != "string") return t;
	for (let r = 0; r < e.length; r++) {
		let i = e[r], a = e[r + 1];
		if (B(i, a) || z(i)) {
			n.length > 0 && (t.push(n.join("")), n.length = 0), i === "\r" && a === "\n" ? (t.push("\r\n"), r++) : t.push(i);
			continue;
		}
		n.push(i), De(i) && a && !B(a) && !z(a) && (t.push(n.join("")), n.length = 0);
	}
	return n.length > 0 && t.push(n.join("")), t;
}
function ke(e, t, n, r) {
	let i = n(e), a = [];
	for (let n = 0; n < i.length; n++) {
		let o = i[n], s = o, c = 1;
		for (; i[n + c];) {
			let a = i[n + c];
			if (!r(s, a, e, n, t)) o += a, s = a, c++;
			else break;
		}
		n += c - 1, a.push(o);
	}
	return a;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/utils/measureTaggedText.mjs
var Ae = /\r\n|\r|\n/g;
function je(e, t, n, r, i, a, o, s, c) {
	let l = xe(e, t);
	if (H(t.whiteSpace)) for (let e = 0; e < l.length; e++) {
		let t = l[e];
		l[e] = {
			text: t.text.replace(Ae, " "),
			style: t.style
		};
	}
	let u = [], d = [];
	for (let e of l) {
		let t = e.text.split(Te);
		for (let n = 0; n < t.length; n++) {
			let r = t[n];
			r === "\r\n" || r === "\r" || r === "\n" ? (u.push(d), d = []) : r.length > 0 && d.push({
				text: r,
				style: e.style
			});
		}
	}
	(d.length > 0 || u.length === 0) && u.push(d);
	let f = n ? Me(u, t, r, a, s, c) : u, p = [], m = [], h = [], g = [], _ = [], v = 0, y = t._fontString, b = o(y);
	b.fontSize === 0 && (b.fontSize = t.fontSize, b.ascent = t.fontSize);
	let x = "", S = !!t.dropShadow, C = t._stroke?.width || 0;
	for (let e of f) {
		let n = 0, a = b.ascent, s = b.descent, c = "";
		for (let t of e) {
			let e = t.style._fontString, l = o(e);
			e !== x && (r.font = e, x = e);
			let u = i(t.text, t.style.letterSpacing, r);
			n += u, a = Math.max(a, l.ascent), s = Math.max(s, l.descent), c += t.text;
			let d = t.style._stroke?.width || 0;
			d > C && (C = d), !S && t.style.dropShadow && (S = !0);
		}
		e.length === 0 && (a = b.ascent, s = b.descent), p.push(n), m.push(a), h.push(s), _.push(c);
		let l = t.lineHeight || a + s;
		g.push(l + t.leading), v = Math.max(v, n);
	}
	let w = C, T = v + w + (t.dropShadow ? t.dropShadow.distance : 0), E = 0;
	for (let e = 0; e < g.length; e++) E += g[e];
	return E = Math.max(E, g[0] + w), {
		width: T,
		height: E + (t.dropShadow ? t.dropShadow.distance : 0),
		lines: _,
		lineWidths: p,
		lineHeight: (t.lineHeight || b.fontSize) + t.leading,
		maxLineWidth: v,
		fontProperties: b,
		runsByLine: f,
		lineAscents: m,
		lineDescents: h,
		lineHeights: g,
		hasDropShadow: S
	};
}
function Me(e, t, n, r, i, a) {
	let { letterSpacing: o, whiteSpace: s, wordWrapWidth: c, breakWords: l } = t, u = V(s), d = c + o, f = {}, p = "", m = (e, t) => {
		let i = `${e}|${t.styleKey}`, a = f[i];
		if (a === void 0) {
			let o = t._fontString;
			o !== p && (n.font = o, p = o), a = r(e, t.letterSpacing, n) + t.letterSpacing, f[i] = a;
		}
		return a;
	}, h = [];
	for (let t of e) {
		let e = Ne(t), n = h.length, r = (t) => {
			let n = 0, r = t;
			do {
				let { token: t, style: i } = e[r];
				n += m(t, i), r++;
			} while (r < e.length && e[r].continuesFromPrevious);
			return n;
		}, o = (t) => {
			let n = [], r = t;
			do
				n.push({
					token: e[r].token,
					style: e[r].style
				}), r++;
			while (r < e.length && e[r].continuesFromPrevious);
			return n;
		}, s = [], c = 0, f = !u, p = null, g = () => {
			p && p.text.length > 0 && s.push(p), p = null;
		}, _ = () => {
			if (g(), s.length > 0) {
				let e = s[s.length - 1];
				e.text = U(e.text), e.text.length === 0 && s.pop();
			}
			h.push(s), s = [], c = 0, f = !1;
		};
		for (let t = 0; t < e.length; t++) {
			let { token: n, style: v, continuesFromPrevious: y } = e[t], b = m(n, v);
			if (u) {
				let e = B(n), t = p?.text[p.text.length - 1] ?? s[s.length - 1]?.text.slice(-1) ?? "", r = t ? B(t) : !1;
				if (e && r) continue;
			}
			let x = !y, S = x ? r(t) : b;
			if (S > d && x) {
				if (c > 0 && _(), l) {
					let e = o(t);
					for (let t = 0; t < e.length; t++) {
						let n = e[t].token, r = e[t].style, o = ke(n, l, a, i);
						for (let e of o) {
							let t = m(e, r);
							t + c > d && _(), !p || p.style !== r ? (g(), p = {
								text: e,
								style: r
							}) : p.text += e, c += t;
						}
					}
					t += e.length - 1;
				} else {
					let e = o(t);
					g(), h.push(e.map((e) => ({
						text: e.token,
						style: e.style
					}))), f = !1, t += e.length - 1;
				}
			} else if (S + c > d && x) {
				if (B(n)) {
					f = !1;
					continue;
				}
				_(), p = {
					text: n,
					style: v
				}, c = b;
			} else if (y && !l) !p || p.style !== v ? (g(), p = {
				text: n,
				style: v
			}) : p.text += n, c += b;
			else {
				let e = B(n);
				if (c === 0 && e && !f) continue;
				!p || p.style !== v ? (g(), p = {
					text: n,
					style: v
				}) : p.text += n, c += b;
			}
		}
		if (g(), s.length > 0) {
			let e = s[s.length - 1];
			e.text = U(e.text), e.text.length === 0 && s.pop();
		}
		(s.length > 0 || h.length === n) && h.push(s);
	}
	return h;
}
function Ne(e) {
	let t = [], n = !1;
	for (let r of e) {
		let e = Oe(r.text), i = !0;
		for (let a of e) {
			let e = B(a) || z(a), o = i && n && !e;
			t.push({
				token: a,
				style: r.style,
				continuesFromPrevious: o
			}), n = !e, i = !1;
		}
	}
	return t;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/utils/wordWrap.mjs
var Pe = { willReadFrequently: !0 };
function Fe(e, t, n, r, i) {
	let a = n[e];
	return typeof a != "number" && (a = i(e, t, r) + t, n[e] = a), a;
}
function Ie(e, t, n, r, i, a, o) {
	let s = n.getContext("2d", Pe);
	s.font = t._fontString;
	let c = 0, l = "", u = [], d = /* @__PURE__ */ Object.create(null), { letterSpacing: f, whiteSpace: p } = t, m = V(p), h = H(p), g = !m, _ = t.wordWrapWidth + f, v = Oe(e);
	for (let e = 0; e < v.length; e++) {
		let n = v[e];
		if (z(n)) {
			if (!h) {
				u.push(U(l)), g = !m, l = "", c = 0;
				continue;
			}
			n = " ";
		}
		if (m) {
			let e = B(n), t = B(l[l.length - 1]);
			if (e && t) continue;
		}
		let p = Fe(n, f, d, s, r);
		if (p > _) {
			if (l !== "" && (u.push(U(l)), l = "", c = 0), i(n, t.breakWords)) {
				let e = ke(n, t.breakWords, o, a);
				for (let t of e) {
					let e = Fe(t, f, d, s, r);
					e + c > _ && (u.push(U(l)), g = !1, l = "", c = 0), l += t, c += e;
				}
			} else l.length > 0 && (u.push(U(l)), l = "", c = 0), u.push(U(n)), g = !1, l = "", c = 0;
		} else p + c > _ && (g = !1, u.push(U(l)), l = "", c = 0), (l.length > 0 || !B(n) || g) && (l += n, c += p);
	}
	let y = U(l);
	return y.length > 0 && u.push(y), u.join("\n");
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/CanvasTextMetrics.mjs
var Le = { willReadFrequently: !0 }, W = class e {
	static get experimentalLetterSpacingSupported() {
		let t = e._experimentalLetterSpacingSupported;
		if (t === void 0) {
			let n = y.get().getCanvasRenderingContext2D().prototype;
			t = e._experimentalLetterSpacingSupported = "letterSpacing" in n || "textLetterSpacing" in n;
		}
		return t;
	}
	constructor(e, t, n, r, i, a, o, s, c, l) {
		this.text = e, this.style = t, this.width = n, this.height = r, this.lines = i, this.lineWidths = a, this.lineHeight = o, this.maxLineWidth = s, this.fontProperties = c, l && (this.runsByLine = l.runsByLine, this.lineAscents = l.lineAscents, this.lineDescents = l.lineDescents, this.lineHeights = l.lineHeights, this.hasDropShadow = l.hasDropShadow);
	}
	static measureText(t = " ", n, r = e._canvas, i = n.wordWrap) {
		let a = `${t}-${n.styleKey}-wordWrap-${i}`;
		if (e._measurementCache.has(a)) return e._measurementCache.get(a);
		if (L(n) && R(t)) {
			let r = je(t, n, i, e._context, e._measureText, e._measureTextAdvance, e.measureFont, e.canBreakChars, e.wordWrapSplit), o = new e(t, n, r.width, r.height, r.lines, r.lineWidths, r.lineHeight, r.maxLineWidth, r.fontProperties, {
				runsByLine: r.runsByLine,
				lineAscents: r.lineAscents,
				lineDescents: r.lineDescents,
				lineHeights: r.lineHeights,
				hasDropShadow: r.hasDropShadow
			});
			return e._measurementCache.set(a, o), o;
		}
		let o = n._fontString, s = e.measureFont(o);
		s.fontSize === 0 && (s.fontSize = n.fontSize, s.ascent = n.fontSize, s.descent = 0);
		let c = e._context;
		c.font = o;
		let l = (i ? e._wordWrap(t, n, r) : t).split(Ee), u = Array(l.length), d = 0;
		for (let t = 0; t < l.length; t++) {
			let r = e._measureText(l[t], n.letterSpacing, c);
			u[t] = r, d = Math.max(d, r);
		}
		let f = n._stroke?.width ?? 0, p = n.lineHeight || s.fontSize, m = e._adjustWidthForStyle(d, n), h = Math.max(p, s.fontSize + f) + (l.length - 1) * (p + n.leading), g = e._adjustHeightForStyle(h, n), _ = new e(t, n, m, g, l, u, p + n.leading, d, s);
		return e._measurementCache.set(a, _), _;
	}
	static _adjustWidthForStyle(e, t) {
		let n = e + (t._stroke?.width || 0);
		return t.dropShadow && (n += t.dropShadow.distance), n;
	}
	static _adjustHeightForStyle(e, t) {
		let n = e;
		return t.dropShadow && (n += t.dropShadow.distance), n;
	}
	static _measureText(t, n, r) {
		let { metricWidth: i, metrics: a, letterSpacingVal: o } = e._measureTextCore(t, n, r), s = -(a.actualBoundingBoxLeft ?? 0), c = (a.actualBoundingBoxRight ?? 0) - s;
		return a.width > 0 && (c += o), Math.max(i, c);
	}
	static _measureTextAdvance(t, n, r) {
		return e._measureTextCore(t, n, r).metricWidth;
	}
	static _measureTextCore(t, n, r) {
		let i = !1;
		e.experimentalLetterSpacingSupported && (e.experimentalLetterSpacing ? (r.letterSpacing = `${n}px`, r.textLetterSpacing = `${n}px`, i = !0) : (r.letterSpacing = "0px", r.textLetterSpacing = "0px"));
		let a = r.measureText(t), o = a.width, s = 0;
		return o > 0 && (s = i ? -n : (e.graphemeSegmenter(t).length - 1) * n, o += s), {
			metricWidth: o,
			metrics: a,
			letterSpacingVal: s
		};
	}
	static _wordWrap(t, n, r = e._canvas) {
		return Ie(t, n, r, e._measureTextAdvance, e.canBreakWords, e.canBreakChars, e.wordWrapSplit);
	}
	static isBreakingSpace(e, t) {
		return B(e, t);
	}
	static canBreakWords(e, t) {
		return t;
	}
	static canBreakChars(e, t, n, r, i) {
		return !0;
	}
	static wordWrapSplit(t) {
		return e.graphemeSegmenter(t);
	}
	static measureFont(t) {
		if (e._fonts[t]) return e._fonts[t];
		let n = e._context;
		n.font = t;
		let r = n.measureText(e.METRICS_STRING + e.BASELINE_SYMBOL), i = r.actualBoundingBoxAscent ?? 0, a = r.actualBoundingBoxDescent ?? 0, o = {
			ascent: i,
			descent: a,
			fontSize: i + a
		};
		return e._fonts[t] = o, o;
	}
	static clearMetrics(t = "") {
		t ? delete e._fonts[t] : e._fonts = {};
	}
	static get _canvas() {
		if (!e.__canvas) {
			let t;
			try {
				let n = new OffscreenCanvas(0, 0);
				if (n.getContext("2d", Le)?.measureText) return e.__canvas = n, n;
				t = y.get().createCanvas();
			} catch {
				t = y.get().createCanvas();
			}
			t.width = t.height = 10, e.__canvas = t;
		}
		return e.__canvas;
	}
	static get _context() {
		return e.__context ||= e._canvas.getContext("2d", Le), e.__context;
	}
};
W.METRICS_STRING = "|ÉqÅ", W.BASELINE_SYMBOL = "M", W.BASELINE_MULTIPLIER = 1.4, W.HEIGHT_MULTIPLIER = 2, W.graphemeSegmenter = (() => {
	if (typeof Intl?.Segmenter == "function") {
		let e = new Intl.Segmenter();
		return (t) => {
			let n = e.segment(t), r = [], i = 0;
			for (let e of n) r[i++] = e.segment;
			return r;
		};
	}
	return (e) => [...e];
})(), W.experimentalLetterSpacing = !1, W._fonts = {}, W._measurementCache = ye(1e3);
var G = W, Re = [
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui"
];
function K(e) {
	let t = typeof e.fontSize == "number" ? `${e.fontSize}px` : e.fontSize, n = e.fontFamily;
	Array.isArray(e.fontFamily) || (n = e.fontFamily.split(","));
	for (let e = n.length - 1; e >= 0; e--) {
		let t = n[e].trim();
		!/([\"\'])[^\'\"]+\1/.test(t) && !Re.includes(t) && (t = `"${t}"`), n[e] = t;
	}
	return `${e.fontStyle} ${e.fontVariant} ${e.fontWeight} ${t} ${n.join(",")}`;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/utils/getCanvasFillStyle.mjs
var ze = 1e5;
function q(n, i, a, s = 0, c = 0, l = 0) {
	if (n.texture === t.WHITE && !n.fill) return o.shared.setValue(n.color).setAlpha(n.alpha ?? 1).toHexa();
	if (!n.fill) {
		let t = i.createPattern(n.texture.source.resource, "repeat"), r = n.matrix.copyTo(e.shared);
		return r.scale(n.texture.source.pixelWidth, n.texture.source.pixelHeight), t.setTransform(r), t;
	}
	if (n.fill instanceof k) {
		let e = n.fill, t = i.createPattern(e.texture.source.resource, "repeat");
		return C.applyPatternTransform(t, e.transform, !1), t;
	}
	if (n.fill instanceof j) {
		let e = n.fill, t = e.type === "linear", r = e.textureSpace === "local", u = 1, d = 1;
		r && a && (u = a.width + s, d = a.height + s);
		let f, p = !1;
		if (t) {
			let { start: t, end: n } = e;
			f = i.createLinearGradient(t.x * u + c, t.y * d + l, n.x * u + c, n.y * d + l), p = Math.abs(n.x - t.x) < Math.abs((n.y - t.y) * .1);
		} else {
			let { center: t, innerRadius: n, outerCenter: r, outerRadius: a } = e;
			f = i.createRadialGradient(t.x * u + c, t.y * d + l, n * u, r.x * u + c, r.y * d + l, a * u);
		}
		if (p && r && a) {
			let t = a.lineHeight / d;
			for (let n = 0; n < a.lines.length; n++) {
				let r = (n * a.lineHeight + s / 2) / d;
				e.colorStops.forEach((e) => {
					let n = r + e.offset * t;
					n = Math.max(0, Math.min(1, n)), f.addColorStop(Math.floor(n * ze) / ze, o.shared.setValue(e.color).toHex());
				});
			}
		} else e.colorStops.forEach((e) => {
			f.addColorStop(e.offset, o.shared.setValue(e.color).toHex());
		});
		return f;
	}
	return r("FillStyle not recognised", n), "red";
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/CanvasTextGenerator.mjs
var Be = new u();
function J(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) e.charCodeAt(n) === 32 && t++;
	return t;
}
var Y = new class {
	getCanvasAndContext(e) {
		let { text: t, style: n, resolution: r = 1 } = e, i = n._getFinalPadding(), a = G.measureText(t || " ", n), o = Math.ceil(Math.ceil(Math.max(1, a.width) + i * 2) * r), s = Math.ceil(Math.ceil(Math.max(1, a.height) + i * 2) * r), c = ne.getOptimalCanvasAndContext(o, s);
		return this._renderTextToCanvas(n, i, r, c, a), {
			canvasAndContext: c,
			frame: n.trim ? _e({
				canvas: c.canvas,
				width: o,
				height: s,
				resolution: 1,
				output: Be
			}) : Be.set(0, 0, o, s)
		};
	}
	returnCanvasAndContext(e) {
		ne.returnCanvasAndContext(e);
	}
	_renderTextToCanvas(e, t, n, r, i) {
		if (i.runsByLine && i.runsByLine.length > 0) {
			this._renderTaggedTextToCanvas(i, e, t, n, r);
			return;
		}
		let { canvas: a, context: o } = r, s = K(e), c = i.lines, l = i.lineHeight, u = i.lineWidths, d = i.maxLineWidth, f = i.fontProperties, p = a.height;
		if (o.resetTransform(), o.scale(n, n), o.textBaseline = e.textBaseline, e._stroke?.width) {
			let t = e._stroke;
			o.lineWidth = t.width, o.miterLimit = t.miterLimit, o.lineJoin = t.join, o.lineCap = t.cap;
		}
		o.font = s;
		let m, h, g = e.dropShadow ? 2 : 1, _ = (e._stroke?.width ?? 0) / 2, v = (l - f.fontSize) / 2;
		l - f.fontSize < 0 && (v = 0);
		for (let a = 0; a < g; ++a) {
			let s = e.dropShadow && a === 0, g = s ? Math.ceil(Math.max(1, p) + t * 2) : 0, y = g * n;
			if (s) this._setupDropShadow(o, e, n, y);
			else {
				let n = e._gradientBounds, r = e._gradientOffset;
				if (n) {
					let a = {
						width: n.width,
						height: n.height,
						lineHeight: n.height,
						lines: i.lines
					};
					this._setFillAndStrokeStyles(o, e, a, t, _, r?.x ?? 0, r?.y ?? 0);
				} else r ? this._setFillAndStrokeStyles(o, e, i, t, _, r.x, r.y) : this._setFillAndStrokeStyles(o, e, i, t, _);
				o.shadowColor = "rgba(0,0,0,0)";
			}
			for (let n = 0; n < c.length; n++) {
				m = _, h = _ + n * l + f.ascent + v, m += this._getAlignmentOffset(u[n], d, e.align);
				let i = 0;
				if (e.align === "justify" && e.wordWrap && n < c.length - 1) {
					let e = J(c[n]);
					e > 0 && (i = (d - u[n]) / e);
				}
				e._stroke?.width && this._drawLetterSpacing(c[n], e, r, m + t, h + t - g, !0, i), e._fill !== void 0 && this._drawLetterSpacing(c[n], e, r, m + t, h + t - g, !1, i);
			}
		}
	}
	_renderTaggedTextToCanvas(e, t, n, r, i) {
		let { canvas: a, context: o } = i, { runsByLine: s, lineWidths: c, maxLineWidth: l, lineAscents: u, lineHeights: d, hasDropShadow: f } = e, p = a.height;
		o.resetTransform(), o.scale(r, r), o.textBaseline = t.textBaseline;
		let m = f ? 2 : 1, h = t._stroke?.width ?? 0;
		for (let e of s) for (let t of e) {
			let e = t.style._stroke?.width ?? 0;
			e > h && (h = e);
		}
		let g = h / 2, _ = [];
		for (let e = 0; e < s.length; e++) {
			let t = s[e], n = [];
			for (let e of t) {
				let t = K(e.style);
				o.font = t, n.push({
					width: G._measureText(e.text, e.style.letterSpacing, o),
					font: t
				});
			}
			_.push(n);
		}
		for (let e = 0; e < m; ++e) {
			let a = f && e === 0, m = a ? Math.ceil(Math.max(1, p) + n * 2) : 0, h = m * r;
			a || (o.shadowColor = "rgba(0,0,0,0)");
			let v = g;
			for (let e = 0; e < s.length; e++) {
				let f = s[e], p = c[e], y = u[e], b = d[e], x = _[e], S = g;
				S += this._getAlignmentOffset(p, l, t.align);
				let C = 0;
				if (t.align === "justify" && t.wordWrap && e < s.length - 1) {
					let e = 0;
					for (let t of f) e += J(t.text);
					e > 0 && (C = (l - p) / e);
				}
				let w = v + y, T = S + n;
				for (let e = 0; e < f.length; e++) {
					let t = f[e], { width: s, font: c } = x[e];
					if (o.font = c, o.textBaseline = t.style.textBaseline, t.style._stroke?.width) {
						let e = t.style._stroke;
						if (o.lineWidth = e.width, o.miterLimit = e.miterLimit, o.lineJoin = e.join, o.lineCap = e.cap, a) {
							if (t.style.dropShadow) this._setupDropShadow(o, t.style, r, h);
							else {
								let e = J(t.text);
								T += s + e * C;
								continue;
							}
						} else {
							let r = G.measureFont(c), i = t.style.lineHeight || r.fontSize;
							o.strokeStyle = q(e, o, {
								width: s,
								height: i,
								lineHeight: i,
								lines: [t.text]
							}, n * 2, T - n, v);
						}
						this._drawLetterSpacing(t.text, t.style, i, T, w + n - m, !0, C);
					}
					let l = J(t.text);
					T += s + l * C;
				}
				T = S + n;
				for (let e = 0; e < f.length; e++) {
					let t = f[e], { width: s, font: c } = x[e];
					if (o.font = c, o.textBaseline = t.style.textBaseline, t.style._fill !== void 0) {
						if (a) {
							if (t.style.dropShadow) this._setupDropShadow(o, t.style, r, h);
							else {
								let e = J(t.text);
								T += s + e * C;
								continue;
							}
						} else {
							let e = G.measureFont(c), r = t.style.lineHeight || e.fontSize, i = {
								width: s,
								height: r,
								lineHeight: r,
								lines: [t.text]
							};
							o.fillStyle = q(t.style._fill, o, i, n * 2, T - n, v);
						}
						this._drawLetterSpacing(t.text, t.style, i, T, w + n - m, !1, C);
					}
					let l = J(t.text);
					T += s + l * C;
				}
				v += b;
			}
		}
	}
	_setFillAndStrokeStyles(e, t, n, r, i, a = 0, o = 0) {
		if (e.fillStyle = t._fill ? q(t._fill, e, n, r * 2, a, o) : null, t._stroke?.width) {
			let s = i + r * 2;
			e.strokeStyle = q(t._stroke, e, n, s, a, o);
		}
	}
	_setupDropShadow(e, t, n, r) {
		e.fillStyle = "black", e.strokeStyle = "black";
		let i = t.dropShadow, a = i.color, s = i.alpha;
		e.shadowColor = o.shared.setValue(a).setAlpha(s).toRgbaString();
		let c = i.blur * n, l = i.distance * n;
		e.shadowBlur = c, e.shadowOffsetX = Math.cos(i.angle) * l, e.shadowOffsetY = Math.sin(i.angle) * l + r;
	}
	_getAlignmentOffset(e, t, n) {
		return n === "right" ? t - e : n === "center" ? (t - e) / 2 : 0;
	}
	_drawLetterSpacing(e, t, n, r, i, a = !1, o = 0) {
		let { context: s } = n, c = t.letterSpacing, l = !1;
		if (G.experimentalLetterSpacingSupported && (G.experimentalLetterSpacing ? (s.letterSpacing = `${c}px`, s.textLetterSpacing = `${c}px`, l = !0) : (s.letterSpacing = "0px", s.textLetterSpacing = "0px")), (c === 0 || l) && o === 0) {
			a ? s.strokeText(e, r, i) : s.fillText(e, r, i);
			return;
		}
		if (o !== 0 && (c === 0 || l)) {
			let t = e.split(" "), n = r, c = s.measureText(" ").width;
			for (let e = 0; e < t.length; e++) a ? s.strokeText(t[e], n, i) : s.fillText(t[e], n, i), n += s.measureText(t[e]).width + c + o;
			return;
		}
		let u = r, d = G.graphemeSegmenter(e), f = s.measureText(e).width, p = 0;
		for (let e = 0; e < d.length; ++e) {
			let t = d[e];
			a ? s.strokeText(t, u, i) : s.fillText(t, u, i);
			let n = "";
			for (let t = e + 1; t < d.length; ++t) n += d[t];
			p = s.measureText(n).width, u += f - p + c, t === " " && (u += o), f = p;
		}
	}
}(), X = class e extends v {
	constructor(t = {}) {
		super(), this.uid = l("textStyle"), this._tick = 0, this._cachedFontString = null, Ve(t), t instanceof e && (t = t._toObject());
		let n = {
			...e.defaultTextStyle,
			...t
		};
		for (let e in n) {
			let t = e;
			this[t] = n[e];
		}
		this._tagStyles = t.tagStyles ?? void 0, this.update(), this._tick = 0;
	}
	get align() {
		return this._align;
	}
	set align(e) {
		this._align !== e && (this._align = e, this.update());
	}
	get breakWords() {
		return this._breakWords;
	}
	set breakWords(e) {
		this._breakWords !== e && (this._breakWords = e, this.update());
	}
	get dropShadow() {
		return this._dropShadow;
	}
	set dropShadow(t) {
		this._dropShadow !== t && (this._dropShadow = typeof t == "object" && t ? this._createProxy({
			...e.defaultDropShadow,
			...t
		}) : t ? this._createProxy({ ...e.defaultDropShadow }) : null, this.update());
	}
	get fontFamily() {
		return this._fontFamily;
	}
	set fontFamily(e) {
		this._fontFamily !== e && (this._fontFamily = e, this.update());
	}
	get fontSize() {
		return this._fontSize;
	}
	set fontSize(e) {
		this._fontSize !== e && (this._fontSize = typeof e == "string" ? parseInt(e, 10) : e, this.update());
	}
	get fontStyle() {
		return this._fontStyle;
	}
	set fontStyle(e) {
		this._fontStyle !== e && (this._fontStyle = e.toLowerCase(), this.update());
	}
	get fontVariant() {
		return this._fontVariant;
	}
	set fontVariant(e) {
		this._fontVariant !== e && (this._fontVariant = e, this.update());
	}
	get fontWeight() {
		return this._fontWeight;
	}
	set fontWeight(e) {
		this._fontWeight !== e && (this._fontWeight = e, this.update());
	}
	get leading() {
		return this._leading;
	}
	set leading(e) {
		this._leading !== e && (this._leading = e, this.update());
	}
	get letterSpacing() {
		return this._letterSpacing;
	}
	set letterSpacing(e) {
		this._letterSpacing !== e && (this._letterSpacing = e, this.update());
	}
	get lineHeight() {
		return this._lineHeight;
	}
	set lineHeight(e) {
		this._lineHeight !== e && (this._lineHeight = e, this.update());
	}
	get padding() {
		return this._padding;
	}
	set padding(e) {
		this._padding !== e && (this._padding = e, this.update());
	}
	get filters() {
		return this._filters;
	}
	set filters(e) {
		this._filters !== e && (this._filters = Object.freeze(e), this.update());
	}
	get trim() {
		return this._trim;
	}
	set trim(e) {
		this._trim !== e && (this._trim = e, this.update());
	}
	get textBaseline() {
		return this._textBaseline;
	}
	set textBaseline(e) {
		this._textBaseline !== e && (this._textBaseline = e, this.update());
	}
	get whiteSpace() {
		return this._whiteSpace;
	}
	set whiteSpace(e) {
		this._whiteSpace !== e && (this._whiteSpace = e, this.update());
	}
	get wordWrap() {
		return this._wordWrap;
	}
	set wordWrap(e) {
		this._wordWrap !== e && (this._wordWrap = e, this.update());
	}
	get wordWrapWidth() {
		return this._wordWrapWidth;
	}
	set wordWrapWidth(e) {
		this._wordWrapWidth !== e && (this._wordWrapWidth = e, this.update());
	}
	get fill() {
		return this._originalFill;
	}
	set fill(e) {
		e !== this._originalFill && (this._originalFill = e, this._isFillStyle(e) && (this._originalFill = this._createProxy({
			...A.defaultFillStyle,
			...e
		}, () => {
			this._fill = O({ ...this._originalFill }, A.defaultFillStyle);
		})), this._fill = O(e === 0 ? "black" : e, A.defaultFillStyle), this.update());
	}
	get stroke() {
		return this._originalStroke;
	}
	set stroke(e) {
		e !== this._originalStroke && (this._originalStroke = e, this._isFillStyle(e) && (this._originalStroke = this._createProxy({
			...A.defaultStrokeStyle,
			...e
		}, () => {
			this._stroke = D({ ...this._originalStroke }, A.defaultStrokeStyle);
		})), this._stroke = D(e, A.defaultStrokeStyle), this.update());
	}
	get tagStyles() {
		return this._tagStyles;
	}
	set tagStyles(e) {
		this._tagStyles !== e && (this._tagStyles = e ?? void 0, this.update());
	}
	update() {
		this._tick++, this._cachedFontString = null, this.emit("update", this);
	}
	reset() {
		let t = e.defaultTextStyle;
		for (let e in t) this[e] = t[e];
	}
	assign(e) {
		for (let t in e) {
			let n = t;
			this[n] = e[t];
		}
		return this;
	}
	get styleKey() {
		return `${this.uid}-${this._tick}`;
	}
	get _fontString() {
		return this._cachedFontString === null && (this._cachedFontString = K(this)), this._cachedFontString;
	}
	_toObject() {
		return {
			align: this.align,
			breakWords: this.breakWords,
			dropShadow: this._dropShadow ? { ...this._dropShadow } : null,
			fill: this._fill ? { ...this._fill } : void 0,
			fontFamily: this.fontFamily,
			fontSize: this.fontSize,
			fontStyle: this.fontStyle,
			fontVariant: this.fontVariant,
			fontWeight: this.fontWeight,
			leading: this.leading,
			letterSpacing: this.letterSpacing,
			lineHeight: this.lineHeight,
			padding: this.padding,
			stroke: this._stroke ? { ...this._stroke } : void 0,
			textBaseline: this.textBaseline,
			trim: this.trim,
			whiteSpace: this.whiteSpace,
			wordWrap: this.wordWrap,
			wordWrapWidth: this.wordWrapWidth,
			filters: this._filters ? [...this._filters] : void 0,
			tagStyles: this._tagStyles ? { ...this._tagStyles } : void 0
		};
	}
	clone() {
		return new e(this._toObject());
	}
	_getFinalPadding() {
		let e = 0;
		if (this._filters) for (let t = 0; t < this._filters.length; t++) e += this._filters[t].padding;
		return Math.max(this._padding, e);
	}
	destroy(e = !1) {
		if (this.removeAllListeners(), typeof e == "boolean" ? e : e?.texture) {
			let t = typeof e == "boolean" ? e : e?.textureSource;
			this._fill?.texture && this._fill.texture.destroy(t), this._originalFill?.texture && this._originalFill.texture.destroy(t), this._stroke?.texture && this._stroke.texture.destroy(t), this._originalStroke?.texture && this._originalStroke.texture.destroy(t);
		}
		this._fill = null, this._stroke = null, this.dropShadow = null, this._originalStroke = null, this._originalFill = null;
	}
	_createProxy(e, t) {
		return new Proxy(e, { set: (e, n, r) => e[n] === r || (e[n] = r, t?.(n, r), this.update(), !0) });
	}
	_isFillStyle(e) {
		return (e ?? null) !== null && !(o.isColorLike(e) || e instanceof j || e instanceof k);
	}
};
X.defaultDropShadow = {
	alpha: 1,
	angle: Math.PI / 6,
	blur: 0,
	color: "black",
	distance: 5
}, X.defaultTextStyle = {
	align: "left",
	breakWords: !1,
	dropShadow: null,
	fill: "black",
	fontFamily: "Arial",
	fontSize: 26,
	fontStyle: "normal",
	fontVariant: "normal",
	fontWeight: "normal",
	leading: 0,
	letterSpacing: 0,
	lineHeight: 0,
	padding: 0,
	stroke: null,
	textBaseline: "alphabetic",
	trim: !1,
	whiteSpace: "pre",
	wordWrap: !1,
	wordWrapWidth: 100
};
var Z = X;
function Ve(e) {
	let t = e;
	if (typeof t.dropShadow == "boolean" && t.dropShadow) {
		let n = Z.defaultDropShadow;
		e.dropShadow = {
			alpha: t.dropShadowAlpha ?? n.alpha,
			angle: t.dropShadowAngle ?? n.angle,
			blur: t.dropShadowBlur ?? n.blur,
			color: t.dropShadowColor ?? n.color,
			distance: t.dropShadowDistance ?? n.distance
		};
	}
	if (t.strokeThickness !== void 0) {
		g(i, "strokeThickness is now a part of stroke");
		let n = t.stroke, r = {};
		if (o.isColorLike(n)) r.color = n;
		else if (n instanceof j || n instanceof k) r.fill = n;
		else if (Object.hasOwnProperty.call(n, "color") || Object.hasOwnProperty.call(n, "fill")) r = n;
		else throw Error("Invalid stroke value.");
		e.stroke = {
			...r,
			width: t.strokeThickness
		};
	}
	if (Array.isArray(t.fillGradientStops)) {
		if (g(i, "gradient fill is now a fill pattern: `new FillGradient(...)`"), !Array.isArray(t.fill) || t.fill.length === 0) throw Error("Invalid fill value. Expected an array of colors for gradient fill.");
		t.fill.length !== t.fillGradientStops.length && r("The number of fill colors must match the number of fill gradient stops.");
		let n = new j({
			start: {
				x: 0,
				y: 0
			},
			end: {
				x: 0,
				y: 1
			},
			textureSpace: "local"
		}), a = t.fillGradientStops.slice(), s = t.fill.map((e) => o.shared.setValue(e).toNumber());
		a.forEach((e, t) => {
			n.addColorStop(e, s[t]);
		}), e.fill = { fill: n };
	}
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/utils/updateTextBounds.mjs
function He(e, t) {
	let { texture: n, bounds: r } = e, i = t._style._getFinalPadding();
	x(r, t._anchor, n);
	let a = t._anchor._x * i * 2, o = t._anchor._y * i * 2;
	r.minX -= i - a, r.minY -= i - o, r.maxX -= i - a, r.maxY -= i - o;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/BatchableText.mjs
var Ue = class extends ee {}, We = class {
	constructor(e) {
		this._renderer = e, e.runners.resolutionChange.add(this), this._managedTexts = new E({
			renderer: e,
			type: "renderable",
			onUnload: this.onTextUnload.bind(this),
			name: "canvasText"
		});
	}
	resolutionChange() {
		for (let e in this._managedTexts.items) {
			let t = this._managedTexts.items[e];
			t?._autoResolution && t.onViewUpdate();
		}
	}
	validateRenderable(e) {
		let t = this._getGpuText(e), n = e.styleKey;
		return t.currentKey !== n || e._didTextUpdate;
	}
	addRenderable(e, t) {
		let n = this._getGpuText(e);
		if (e._didTextUpdate) {
			let t = e._autoResolution ? this._renderer.resolution : e.resolution;
			(n.currentKey !== e.styleKey || e._resolution !== t) && this._updateGpuText(e), e._didTextUpdate = !1, He(n, e);
		}
		this._renderer.renderPipes.batch.addToBatch(n, t);
	}
	updateRenderable(e) {
		let t = this._getGpuText(e);
		t._batcher.updateElement(t);
	}
	_updateGpuText(e) {
		let t = this._getGpuText(e);
		t.texture && this._renderer.canvasText.decreaseReferenceCount(t.currentKey), e._resolution = e._autoResolution ? this._renderer.resolution : e.resolution, t.texture = this._renderer.canvasText.getManagedTexture(e), t.currentKey = e.styleKey;
	}
	_getGpuText(e) {
		return e._gpuData[this._renderer.uid] || this.initGpuText(e);
	}
	initGpuText(e) {
		let t = new Ue();
		return t.currentKey = "--", t.renderable = e, t.transform = e.groupTransform, t.bounds = {
			minX: 0,
			maxX: 1,
			minY: 0,
			maxY: 0
		}, t.roundPixels = this._renderer._roundPixels | e._roundPixels, e._gpuData[this._renderer.uid] = t, this._managedTexts.add(e), t;
	}
	onTextUnload(e) {
		let t = e._gpuData[this._renderer.uid];
		if (!t) return;
		let { canvasText: n } = this._renderer;
		n.getReferenceCount(t.currentKey) > 0 ? n.decreaseReferenceCount(t.currentKey) : t.texture && n.returnTexture(t.texture);
	}
	destroy() {
		this._managedTexts.destroy(), this._renderer = null;
	}
};
We.extension = {
	type: [
		_.WebGLPipes,
		_.WebGPUPipes,
		_.CanvasPipes
	],
	name: "text"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/shared/AbstractTextSystem.mjs
var Ge = class {
	constructor(e, t) {
		this._activeTextures = {}, this._renderer = e, this._retainCanvasContext = t;
	}
	getTexture(e, t, n, r) {
		typeof e == "string" && (g("8.0.0", "CanvasTextSystem.getTexture: Use object TextOptions instead of separate arguments"), e = {
			text: e,
			style: n,
			resolution: t
		}), e.style instanceof Z || (e.style = new Z(e.style)), e.textureStyle instanceof c || (e.textureStyle = new c(e.textureStyle)), typeof e.text != "string" && (e.text = e.text.toString());
		let { text: i, style: a, textureStyle: o, autoGenerateMipmaps: s } = e, l = e.resolution ?? this._renderer.resolution, { frame: u, canvasAndContext: d } = Y.getCanvasAndContext({
			text: i,
			style: a,
			resolution: l
		}), f = S(d.canvas, u.width, u.height, l, s);
		if (o && (f.source.style = o), a.trim && (u.pad(a.padding), f.frame.copyFrom(u), f.frame.scale(1 / l), f.updateUvs()), a.filters) {
			let e = this._applyFilters(f, a.filters);
			return this.returnTexture(f), Y.returnCanvasAndContext(d), e;
		}
		return this._renderer.texture.initSource(f._source), this._retainCanvasContext || Y.returnCanvasAndContext(d), f;
	}
	returnTexture(e) {
		let t = e.source, r = t.resource;
		if (this._retainCanvasContext && r?.getContext) {
			let e = r.getContext("2d");
			e && Y.returnCanvasAndContext({
				canvas: r,
				context: e
			});
		}
		t.resource = null, t.uploadMethodId = "unknown", t.alphaMode = "no-premultiply-alpha", n.returnTexture(e, !0);
	}
	renderTextToCanvas() {
		g("8.10.0", "CanvasTextSystem.renderTextToCanvas: no longer supported, use CanvasTextSystem.getTexture instead");
	}
	getManagedTexture(e) {
		e._resolution = e._autoResolution ? this._renderer.resolution : e.resolution;
		let t = e.styleKey;
		if (this._activeTextures[t]) return this._increaseReferenceCount(t), this._activeTextures[t].texture;
		let n = this.getTexture({
			text: e.text,
			style: e.style,
			resolution: e._resolution,
			textureStyle: e.textureStyle,
			autoGenerateMipmaps: e.autoGenerateMipmaps
		});
		return this._activeTextures[t] = {
			texture: n,
			usageCount: 1
		}, n;
	}
	decreaseReferenceCount(e) {
		let t = this._activeTextures[e];
		t && (t.usageCount--, t.usageCount === 0 && (this.returnTexture(t.texture), this._activeTextures[e] = null));
	}
	getReferenceCount(e) {
		return this._activeTextures[e]?.usageCount ?? 0;
	}
	_increaseReferenceCount(e) {
		this._activeTextures[e].usageCount++;
	}
	_applyFilters(e, t) {
		let n = this._renderer.renderTarget.renderTarget, r = this._renderer.filter.generateFilteredTexture({
			texture: e,
			filters: t
		});
		return this._renderer.renderTarget.bind(n, !1), r;
	}
	destroy() {
		this._renderer = null;
		for (let e in this._activeTextures) this._activeTextures[e] && this.returnTexture(this._activeTextures[e].texture);
		this._activeTextures = null;
	}
}, Ke = class extends Ge {
	constructor(e) {
		super(e, !0);
	}
};
Ke.extension = {
	type: [_.CanvasSystem],
	name: "canvasText"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/shared/GpuTextSystem.mjs
var qe = class extends Ge {
	constructor(e) {
		super(e, !1);
	}
};
qe.extension = {
	type: [_.WebGLSystem, _.WebGPUSystem],
	name: "canvasText"
}, m.add(Ke), m.add(qe), m.add(We);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/Text.mjs
var Je = class extends pe {
	constructor(...e) {
		let t = me(e, "Text");
		super(t, Z), this.renderPipeId = "text", t.textureStyle && (this.textureStyle = t.textureStyle instanceof c ? t.textureStyle : new c(t.textureStyle)), this.autoGenerateMipmaps = t.autoGenerateMipmaps ?? s.defaultOptions.autoGenerateMipmaps;
	}
	updateBounds() {
		let e = this._bounds, t = this._anchor, n = 0, r = 0;
		if (this._style.trim) {
			let { frame: e, canvasAndContext: t } = Y.getCanvasAndContext({
				text: this.text,
				style: this._style,
				resolution: 1
			});
			Y.returnCanvasAndContext(t), n = e.width, r = e.height;
		} else {
			let e = G.measureText(this._text, this._style);
			n = e.width, r = e.height;
		}
		e.minX = -t._x * n, e.maxX = e.minX + n, e.minY = -t._y * r, e.maxY = e.minY + r;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/index.mjs
m.add(re, ie);
//#endregion
//#region src/arena/pet-texture.ts
var Ye = /^#[0-9a-f]{6}$/i, Xe = /* @__PURE__ */ new Set([
	"none",
	"bandana",
	"visor",
	"crown",
	"headphones",
	"cape"
]), Ze = /* @__PURE__ */ new Set([
	"focused",
	"happy",
	"fierce",
	"sleepy"
]);
function Qe(e, t = "#38bdf8") {
	let n = e || {};
	return {
		name: String(n.name || "").slice(0, 24),
		species: String(n.species || "emberrat").replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "emberrat",
		color: Ye.test(n.color || "") ? n.color : t,
		accent: Ye.test(n.accent || "") ? n.accent : "#ffffff",
		trail: [
			"none",
			"dust",
			"spark",
			"rainbow"
		].includes(n.trail || "") ? n.trail : "none",
		accessory: Xe.has(n.accessory) ? n.accessory : "none",
		expression: Ze.has(n.expression) ? n.expression : "focused"
	};
}
function $e(e, t, n) {
	return t ? "win" : e && [
		"surge",
		"stumble",
		"jump",
		"duel",
		"near"
	].includes(e) ? e : n === "running" ? "run" : "idle";
}
//#endregion
//#region src/arena/viewport.ts
function et(e, t) {
	let n = Math.max(240, e), r = Math.max(240, t), i = r > n, a = r < 520 || n < 520, o = r * .1, s = r * .9, c = n * .03, l = n * .91, u = s - o, d = (!i && r <= 600 ? 56 : n <= 640 ? 68 : 88) / 72;
	return {
		width: n,
		height: r,
		portrait: i,
		compact: a,
		laneTop: o,
		laneBottom: s,
		laneHeight: u,
		trackLeft: c,
		trackRight: l,
		trackWidth: l - c,
		actorScale: d
	};
}
function tt(e, t, n) {
	let r = Math.max(1, n), i = Math.max(0, Math.min(r - 1, t));
	return e.laneTop + e.laneHeight * ((i + .5) / r);
}
function nt(e, t) {
	let n = Math.max(0, Math.min(1, t));
	return e.trackLeft + e.trackWidth * n;
}
//#endregion
//#region js/arena/dfl-sprites.js
var Q = [
	{
		id: "emberrat",
		label: "Emberrat",
		blurb: "Small, on fire, unbothered.",
		palette: {
			D: "#2a1206",
			K: "#e0572b",
			S: "#a83415",
			W: "#ffffff",
			E: "#2a1206",
			A: "#ffb02e"
		},
		px: [
			"........A...A...........",
			".......AAA.AAA..........",
			"........AAAAA...........",
			"......DDDDDDDD..........",
			".....DKKKKKKKKD.........",
			".....DKWWKKWWKD.........",
			".....DKWEKKWEKD.........",
			".....DKKKKKKKKD.........",
			"....DDLLLLLLLLDD........",
			"....DLLLLLLLLLLD...AA...",
			"....DLLLLLLLLLLDDAAA....",
			"....DLSSLLLLSSLDAA......",
			"....DDDDDDDDDDDD........",
			".....DKKD..DKKD.........",
			".....DDDD..DDDD........."
		]
	},
	{
		id: "sparkpup",
		label: "Sparkpup",
		blurb: "Chews cables. Regrets nothing.",
		palette: {
			D: "#0d1a2e",
			K: "#5ec8f5",
			S: "#2a7fb8",
			W: "#ffffff",
			E: "#0d1a2e",
			A: "#fff35c"
		},
		px: [
			".....A.......A..........",
			"....AA.......AA.........",
			"....DDDDDDDDDDD.........",
			"...DKKKKKKKKKKKD........",
			"...DKKKKKKKKKKKD........",
			"...DKWWKKKKKWWKD........",
			"...DKWEKKKKKWEKD........",
			"...DKKKKAAAKKKKD........",
			"...DDLLLLLLLLLDD........",
			"....DLLLLLLLLLD....AA...",
			"....DLLLLLLLLLDDDDAA....",
			"....DLSSLLLSSLDAAA......",
			"....DDDDDDDDDDD.........",
			".....DKKD.DKKD..........",
			".....DDDD.DDDD.........."
		]
	},
	{
		id: "tinplate",
		label: "Tin Plate",
		blurb: "All armour, no plan.",
		palette: {
			D: "#141a22",
			K: "#9aa7b4",
			S: "#5d6a78",
			W: "#ffffff",
			E: "#ff5a4a",
			A: "#e2e8ee"
		},
		px: [
			"........AAAA............",
			"......DDDDDDDD..........",
			".....DAAAAAAAAD.........",
			".....DKKKKKKKKD.........",
			".....DKEEKKEEKD.........",
			".....DKKKKKKKKD.........",
			"....DDKKSSSSKKDD........",
			"....DLLLLLLLLLLD........",
			"...DLLLLLLLLLLLLD.......",
			"...DLLSSLLLLSSLLD.......",
			"...DLLLLLLLLLLLLD.......",
			"...DDLLLLLLLLLLDD.......",
			"....DDDDDDDDDDDD........",
			".....DKKD..DKKD.........",
			".....DDDD..DDDD........."
		]
	},
	{
		id: "boogey",
		label: "Boogey",
		blurb: "Not scary. Very committed.",
		palette: {
			D: "#1b1330",
			K: "#cdbdf5",
			S: "#8f79c9",
			W: "#ffffff",
			E: "#1b1330",
			A: "#a88ce0"
		},
		px: [
			"........................",
			"......DDDDDDDD..........",
			".....DKKKKKKKKD.........",
			"....DKKKKKKKKKKD........",
			"....DKWWKKKKWWKD........",
			"....DKWEKKKKWEKD........",
			"....DKKKKKKKKKKD........",
			"....DKKKSSSSKKKD........",
			"....DLLLLLLLLLLD........",
			"....DLLLLLLLLLLD........",
			"....DLLLLLLLLLLD........",
			"....DLLLLLLLLLLD........",
			"....DLDDLDDLDDLD........",
			".....DD.DD.DD.D.........",
			"........................"
		]
	},
	{
		id: "cobble",
		label: "Cobble",
		blurb: "Solid. Slow. Correct.",
		palette: {
			D: "#1d1710",
			K: "#9c7f5c",
			S: "#6b543a",
			W: "#ffffff",
			E: "#1d1710",
			A: "#c9ae88"
		},
		px: [
			"........................",
			"......DDDDDDDD..........",
			".....DKAAKKAAKD.........",
			"....DKKKKKKKKKKD........",
			"....DKWWKKKKWWKD........",
			"....DKWEKKKKWEKD........",
			"....DKKKKKKKKKKD........",
			"...DDKKSSKKSSKKDD.......",
			"...DLLLLLLLLLLLLD.......",
			"...DLLLLLLLLLLLLD.......",
			"...DLLSSLLLLSSLLD.......",
			"...DDLLLLLLLLLLDD.......",
			"....DDDDDDDDDDDD........",
			"....DKKKD..DKKKD........",
			"....DDDDD..DDDDD........"
		]
	},
	{
		id: "gloop",
		label: "Gloop",
		blurb: "Was a liquid. Still is, mostly.",
		palette: {
			D: "#0d2415",
			K: "#4cc26a",
			S: "#2b8544",
			W: "#ffffff",
			E: "#0d2415",
			A: "#b6f5c6"
		},
		px: [
			"........................",
			"........DDDD............",
			"......DDKAAKDD..........",
			".....DKKKKKKKKD.........",
			"....DKKWWKKWWKKD........",
			"....DKKWEKKWEKKD........",
			"....DKKKKKKKKKKD........",
			"...DKKKKSSSSKKKKD.......",
			"...DLLLLLLLLLLLLD.......",
			"..DLLLLLLLLLLLLLLD......",
			"..DLLLLLLLLLLLLLLD......",
			"..DLSSLLLLLLLLSSLD......",
			"..DDLLLLLLLLLLLLDD......",
			"...DDDDDDDDDDDDDD.......",
			"........................"
		]
	},
	{
		id: "squawk",
		label: "Squawk",
		blurb: "Loud opinions, small brain.",
		palette: {
			D: "#14202a",
			K: "#3fb8c4",
			S: "#22757f",
			W: "#ffffff",
			E: "#14202a",
			A: "#ff9b2e"
		},
		px: [
			".......AA...............",
			"......AA................",
			"......DDDDDDD...........",
			".....DKKKKKKKD..........",
			".....DKWWKKKKDAA........",
			".....DKWEKKKKDAAA.......",
			".....DKKKKKKKDAA........",
			"....DDKKKKKKKDD.........",
			"....DLLLLLLLLLD.........",
			"....DLLLLLLLLLD.........",
			"....DLLLLLLLLLD.........",
			"....DLSSLLLSSLD.........",
			"....DDDDDDDDDDD.........",
			".....DAAD.DAAD..........",
			".....DDDD.DDDD.........."
		]
	},
	{
		id: "wyrmlet",
		label: "Wyrmlet",
		blurb: "One day: dragon. Today: this.",
		palette: {
			D: "#1a1030",
			K: "#8c5cf0",
			S: "#5a34a8",
			W: "#ffffff",
			E: "#1a1030",
			A: "#4ce0a8"
		},
		px: [
			"......A....A............",
			".....AA....AA...........",
			"......DDDDDD............",
			".....DKKKKKKD...........",
			"....DKKKKKKKKD..........",
			"....DKWWKKWWKD..........",
			"....DKWEKKWEKD..........",
			"....DKKKKKKKKD..........",
			"...DDLLLLLLLLDD.........",
			"...DLLLLLLLLLLD...AAA...",
			"...DLLLLLLLLLLDDDAAA....",
			"...DLSSLLLLSSLDAAA......",
			"...DDDDDDDDDDDD.........",
			"....DKKD..DKKD..........",
			"....DDDD..DDDD.........."
		]
	},
	{
		id: "divot",
		label: "Divot",
		blurb: "Took a mulligan on being born.",
		palette: {
			D: "#12220f",
			K: "#f2f5f0",
			S: "#b9c2b4",
			W: "#12220f",
			E: "#f2f5f0",
			A: "#3fa055"
		},
		px: [
			"........................",
			"......DDDDDDDD..........",
			".....DKSKKKKSKD.........",
			"....DKKKKKKKKKKD........",
			"....DKEWKKKKEWKD........",
			"....DKEWKKKKEWKD........",
			"....DKKSKKKKSKKD........",
			"....DKKKKKKKKKKD........",
			"....DDLLLLLLLLDD........",
			"....DLLLLLLLLLLD........",
			"....DLLLLLLLLLLD........",
			"....DLSSLLLLSSLD........",
			"....DDDDDDDDDDDD........",
			"...AAAAAD..DAAAAA.......",
			"........................"
		]
	},
	{
		id: "puckhead",
		label: "Puckhead",
		blurb: "Dropped the gloves immediately.",
		palette: {
			D: "#0b0d10",
			K: "#3a4048",
			S: "#22262c",
			W: "#ffffff",
			E: "#ff5a4a",
			A: "#d9dee5"
		},
		px: [
			"........................",
			"....DDDDDDDDDDDD........",
			"...DAAAAAAAAAAAAD.......",
			"...DKKKKKKKKKKKKD.......",
			"...DKEEKKKKKKEEKD.......",
			"...DKKKKKKKKKKKKD.......",
			"...DAAAAAAAAAAAAD.......",
			"....DDDDDDDDDDDD........",
			"....DLLLLLLLLLLD........",
			"....DLLLLLLLLLLD...AA...",
			"....DLSSLLLLSSLDDDAA....",
			"....DDDDDDDDDDDDAA......",
			".....DKKD..DKKD.........",
			".....DDDD..DDDD.........",
			"........................"
		]
	},
	{
		id: "sudsy",
		label: "Sudsy",
		blurb: "The reason the draft runs late.",
		palette: {
			D: "#2b1a05",
			K: "#e8a838",
			S: "#a8741c",
			W: "#ffffff",
			E: "#2b1a05",
			A: "#fff3cf"
		},
		px: [
			"......AAAAAA............",
			".....AAAAAAAA...........",
			"....DDDDDDDDDD..........",
			"....DKKKKKKKKD..........",
			"....DKWWKKWWKD..........",
			"....DKWEKKWEKD..........",
			"....DKKKKKKKKD..........",
			"....DKKSSSSKKD..........",
			"...DDLLLLLLLLDD.........",
			"...DLLLLLLLLLLD.DDDD....",
			"...DLLLLLLLLLLDDAAAD....",
			"...DLSSLLLLSSLDDAAAD....",
			"...DDDDDDDDDDDD.DDDD....",
			"....DKKD..DKKD..........",
			"....DDDD..DDDD.........."
		]
	},
	{
		id: "commish",
		label: "The Commish",
		blurb: "Makes the rules. Ignores them.",
		palette: {
			D: "#1a0d10",
			K: "#f0d5b8",
			S: "#c2a184",
			W: "#ffffff",
			E: "#1a0d10",
			A: "#e5011b"
		},
		px: [
			"....DDDDDDDDDD..........",
			"...DAAAAAAAAAAD.........",
			"..DAAAAAAAAAAAAD........",
			"...DDDDDDDDDDDD.........",
			"....DKKKKKKKKD..........",
			"....DKWEKKWEKD..........",
			"....DKKKKKKKKD..........",
			"....DKKSSSSKKD..........",
			"...DDLLLLLLLLDD.........",
			"...DLLLLLLLLLLD.........",
			"...DLLLLLLLLLLD.........",
			"...DLSSLLLLSSLD.........",
			"...DDDDDDDDDDDD.........",
			"....DKKD..DKKD..........",
			"....DDDD..DDDD.........."
		]
	},
	{
		id: "zaplet",
		label: "Zaplet",
		blurb: "Pocket-sized thunder with zero patience.",
		palette: {
			D: "#10172d",
			K: "#5b8cff",
			S: "#3151a4",
			W: "#ffffff",
			E: "#10172d",
			A: "#ffe45b"
		},
		px: [
			"......A.........A.......",
			".....AAA.......AAA......",
			"......DDDDDDDDD.........",
			".....DKKKKKKKKKD........",
			"....DKKWWKKKWWKKD.......",
			"....DKKWEKKKWEKKD.......",
			"....DKKKKAAAKKKKD.......",
			"...DDKKKKKKKKKKKDD......",
			"...DLLLLLLLLLLLLLD......",
			"...DLLSSLLLLLSSLLD......",
			"...DLLLLLLLLLLLLLD..AA..",
			"...DDLLLLLLLLLLLDD.AAA..",
			"....DDDDDDDDDDDDD...A...",
			".....DKKD...DKKD........",
			".....DDDD...DDDD........"
		]
	},
	{
		id: "tuxfool",
		label: "Tux Fool",
		blurb: "Dressed for dinner. Prepared for nothing.",
		palette: {
			D: "#151515",
			K: "#f2d0aa",
			S: "#b88d69",
			W: "#ffffff",
			E: "#151515",
			A: "#58b8ff"
		},
		px: [
			"....DDDDDDDDDD..........",
			"...DKKKKKKKKKKD.........",
			"..DKKKKKKKKKKKKD........",
			"...DDDDDDDDDDDD.........",
			"....DKWWKKWWKD..........",
			"....DKWEKKWEKD..........",
			"....DKKKAAKKKD..........",
			"...DDLLLLLLLLDD.........",
			"...DLLLLAALLLLD.........",
			"...DLLLAAAALLLD.........",
			"...DLLLLAALLLLD.........",
			"...DLSSLLLLSSLD.........",
			"...DDDDDDDDDDDD.........",
			"....DKKD..DKKD..........",
			"....DDDD..DDDD.........."
		]
	},
	{
		id: "snackstack",
		label: "Snackstack",
		blurb: "Soft steps. Emergency crackers.",
		palette: {
			D: "#20172b",
			K: "#8759b8",
			S: "#563574",
			W: "#ffffff",
			E: "#20172b",
			A: "#62d49b"
		},
		px: [
			"......DDDDDDDD..........",
			".....DKKKKKKKKKD........",
			"....DKKKKKKKKKKKD.......",
			"....DKKWWKKKKWWKD.......",
			"....DKKWEKKKKWEKD.......",
			"....DKKKKAAAAKKKD.......",
			"...DDKKKKKKKKKKKDD......",
			"..DDLLLLLLLLLLLLLDD.....",
			"..DLLLLLLLLLLLLLLLD.....",
			"..DLLLAAALLLAAALLLD.....",
			"..DLLLLLLLLLLLLLLLD.....",
			"..DDLSSLLLLLLSSLLDD.....",
			"...DDDDDDDDDDDDDD.......",
			"....DKKKD..DKKKD........",
			"....DDDDD..DDDDD........"
		]
	},
	{
		id: "saffronsage",
		label: "Saffron Sage",
		blurb: "Calm mind. Impossibly quick feet.",
		palette: {
			D: "#26160c",
			K: "#d88932",
			S: "#9b591c",
			W: "#ffffff",
			E: "#26160c",
			A: "#f3c44f"
		},
		px: [
			"......AAAAAAAA..........",
			"....AAAAAAAAAAAA........",
			"...AAAAADDDDAAAAA.......",
			"....DDDDDDDDDDDD........",
			"....DKKKKKKKKKKD........",
			"....DKWEKKKKWEKD........",
			"....DKKKKKKKKKKD........",
			"....DKKSSSSSSKKD........",
			"...DDLLLLLLLLLLDD.......",
			"...DLLLLLLLLLLLLD.......",
			"...DLLLAAALLAAALLD......",
			"...DLSSLLLLLLSSLD.......",
			"...DDDDDDDDDDDDDD.......",
			"....DKKD....DKKD........",
			"....DDDD....DDDD........"
		]
	},
	{
		id: "smokejack",
		label: "Smokejack",
		blurb: "Carries six gadgets. Understands two.",
		palette: {
			D: "#101317",
			K: "#454d57",
			S: "#282e35",
			W: "#ffffff",
			E: "#ff6b5f",
			A: "#b9c4cf"
		},
		px: [
			"........AA..............",
			".......AAAA.............",
			"....DDDDDDDDDDDD........",
			"...DKKKKKKKKKKKKD.......",
			"...DKKEEKKKKKKEEKD......",
			"...DKKKKKKKKKKKKD.......",
			"...DAAAAAAAAAAAAD.......",
			"....DDLLLLLLLLDD........",
			"....DLLLLLLLLLLD........",
			"...DDLLSSLLSSLLDD...AA..",
			"...DLLLLLLLLLLLLD..AAAA.",
			"...DDLSSLLLLSSLLDD...AA.",
			"....DDDDDDDDDDDD........",
			".....DKKD..DKKD.........",
			".....DDDD..DDDD........."
		]
	},
	{
		id: "relampago",
		label: "El Relámpago",
		blurb: "Mask on. Cape up. Crowd loud.",
		palette: {
			D: "#180d22",
			K: "#e53935",
			S: "#982326",
			W: "#ffffff",
			E: "#180d22",
			A: "#f4c542"
		},
		px: [
			".....A.........A........",
			"....AAA.......AAA.......",
			"....DDDDDDDDDDDDD.......",
			"...DKKKKKKKKKKKKKD......",
			"...DKWWKKKKKKKWWKD......",
			"...DKWEKKAAAKKWEKD......",
			"...DKKKKKAAAKKKKKD......",
			"...DDKKKKKKKKKKKDD......",
			"..DDLLLLLLLLLLLLLDD.....",
			"..DLLLAAALLLAAALLLD.....",
			"..DLLLLLLLLLLLLLLLD.....",
			"..DLSSLLLLLLLLLSSLD.....",
			"..DDDDDDDDDDDDDDDDD.....",
			"....DKKD....DKKD........",
			"....DDDD....DDDD........"
		]
	}
];
new Map(Q.map((e) => [e.id, e]));
//#endregion
//#region src/arena/pixi-stage.ts
var $ = 3, rt = class {
	app = new fe();
	scenery = new b({ label: "scenery" });
	course = new b({ label: "course" });
	actors = new b({ label: "racers" });
	effects = new b({ label: "effects" });
	overlay = new b({ label: "overlay" });
	#e = new te({ label: "legacy-feature-set" });
	#t = new Je({
		text: "",
		style: {
			fill: 16777215,
			fontFamily: "monospace",
			fontSize: 12
		}
	});
	#n = null;
	#r = et(1280, 720);
	#i = [];
	#a = /* @__PURE__ */ new Map();
	#o = null;
	#s = null;
	async mount(e) {
		this.#n = e, await this.app.init({
			resizeTo: e,
			backgroundAlpha: 0,
			antialias: !1,
			autoDensity: !0,
			resolution: Math.min(window.devicePixelRatio || 1, 2),
			preference: "webgl"
		}), this.app.canvas.className = "arena-pixi-canvas", this.app.canvas.setAttribute("aria-hidden", "true"), e.appendChild(this.app.canvas), this.scenery.addChild(this.#e), this.overlay.addChild(this.#t), this.app.stage.addChild(this.scenery, this.course, this.actors, this.effects, this.overlay), this.resize(), typeof ResizeObserver == "function" && (this.#s = new ResizeObserver(() => this.resize()), this.#s.observe(e));
	}
	async setRacers(e) {
		this.#i = e, this.#a.clear(), this.actors.removeChildren();
		for (let t of e) {
			let e = new b({ label: `racer-${t.id}` });
			e.eventMode = "none";
			let n = Qe(t.pet, t.color), r = this.#l(n), i = new b({ label: `pet-${n.species}` });
			i.addChild(...r), e.addChild(i), this.#a.set(t.id, {
				root: e,
				art: i,
				frames: r
			}), this.actors.addChild(e);
		}
	}
	render(e) {
		this.#o = e;
		let t = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? !1;
		for (let n of e.racers) {
			let r = this.#a.get(n.id);
			if (!r) continue;
			let i = n.finished && n.id === e.winnerId ? "win" : n.finished ? "idle" : $e(n.reaction, !1, e.state), a = this.#c(e.elapsedMs, n.lane, e.heat, i);
			r.root.position.set(nt(this.#r, n.progress), tt(this.#r, n.lane, this.#i.length)), r.root.scale.set(this.#r.actorScale), r.root.rotation = 0, r.root.alpha = 1, r.art.position.set(a.x, t ? 0 : a.y), r.art.scale.set(t ? 1 : a.scale), r.art.rotation = t ? 0 : a.rotation;
			let o = i === "surge" || i === "duel" ? 260 : i === "stumble" ? 900 : i === "win" || this.#r.width >= 801 ? 380 : 620, s = !t && Math.floor(e.elapsedMs / o) % 2 == 1;
			r.frames[0].visible = !s, r.frames[1].visible = s;
		}
	}
	resize() {
		this.#n && (this.app.resize(), this.#r = et(this.app.screen.width, this.app.screen.height), this.#o && this.render(this.#o));
	}
	destroy() {
		this.#s?.disconnect(), this.#s = null, this.#a.clear(), this.#i = [], this.#o = null, this.app.destroy(!0, { children: !0 }), this.#n = null;
	}
	#c(e, t, n, r) {
		let i = 1 + Math.max(0, Math.min(3, n)) * .16, a = Math.sin(e * .015 * i + t * .7);
		return r === "surge" || r === "duel" ? {
			x: 0,
			y: -2 - a,
			scale: 1.07 + a * .01,
			rotation: a * Math.PI / 90
		} : r === "stumble" ? {
			x: a < 0 ? -2 : 1,
			y: 0,
			scale: 1,
			rotation: a * Math.PI / 30
		} : r === "jump" ? {
			x: 0,
			y: -1 - Math.abs(a) * 3,
			scale: 1.06 + Math.abs(a) * .06,
			rotation: -Math.abs(a) * Math.PI / 60
		} : r === "win" ? {
			x: 0,
			y: -Math.abs(a) * 7,
			scale: 1 + Math.abs(a) * .12,
			rotation: 0
		} : r === "run" ? {
			x: 0,
			y: -Math.abs(a) * 2,
			scale: 1,
			rotation: a * Math.PI / 120
		} : {
			x: 0,
			y: -.75 - a * .75,
			scale: 1,
			rotation: 0
		};
	}
	#l(e) {
		let t = 0;
		for (let n of e.species) t = Math.imul(t, 31) + n.charCodeAt(0) >>> 0;
		let n = Q.find((t) => t.id === e.species) || Q[t % Q.length];
		return [this.#u(n.px, n.palette, e), this.#u(this.#f(n.px), n.palette, e)];
	}
	#u(e, t, n) {
		let r = this.#p(n.color), i = this.#p(n.accent), a = new te(), o = (e, t, n) => a.rect((e - 12) * $, (t - 15 / 2) * $, $, $).fill(n);
		return e.forEach((e, i) => {
			for (let a = 0; a < e.length; a++) {
				let s = e[a];
				s !== "." && s !== " " && o(a, i, s === "L" ? r : this.#p(t[s] || n.color));
			}
		}), this.#d(o, n, i), a;
	}
	#d(e, t, n) {
		let r = (t, r, i, a = n) => {
			for (let n = t; n <= r; n++) e(n, i, a);
		};
		if (t.accessory === "bandana") r(6, 17, 8), r(6, 17, 9), r(17, 19, 10), r(17, 19, 11);
		else if (t.accessory === "visor") r(7, 17, 4), r(7, 17, 5), r(17, 19, 6);
		else if (t.accessory === "crown") {
			r(8, 9, 1), r(12, 13, 1), r(16, 17, 1), r(8, 9, 2), r(12, 13, 2), r(16, 17, 2);
			for (let e = 3; e <= 5; e++) r(8, 17, e);
		} else if (t.accessory === "headphones") {
			r(8, 17, 2), r(8, 17, 3);
			for (let e = 4; e <= 8; e++) r(6, 7, e), r(18, 19, e);
		} else if (t.accessory === "cape") {
			for (let e = 7; e <= 10; e++) r(4, 6, e);
			for (let e = 11; e <= 12; e++) r(2, 6, e);
		}
		let i = 1513759;
		t.expression === "happy" ? (e(10, 6, i), e(15, 6, i), r(12, 14, 9, i)) : t.expression === "fierce" ? (r(9, 11, 6, i), r(14, 16, 6, i), r(12, 14, 9, i)) : t.expression === "sleepy" && (r(9, 11, 7, i), r(14, 16, 7, i));
	}
	#f(e) {
		return e.map((e, t) => t < 9 ? e : t % 2 ? `.${e.slice(0, 23)}` : `${e.slice(1)}.`);
	}
	#p(e) {
		let t = Number.parseInt(e.replace("#", ""), 16);
		return Number.isFinite(t) ? t : 3718648;
	}
};
//#endregion
//#region src/arena/runtime.ts
async function it(e, t) {
	if (!e) return null;
	let n = e.querySelector(".track") || e, r = Array.from(n.querySelectorAll(".runner-art")), i = new Map(r.map((e) => [e, e.style.visibility])), a = document.createElement("div");
	a.className = "arena-pixi-host", Object.assign(a.style, {
		position: "absolute",
		inset: "0",
		zIndex: "1",
		overflow: "hidden",
		pointerEvents: "none"
	}), getComputedStyle(n).position === "static" && (n.style.position = "relative"), n.appendChild(a);
	let o = new rt();
	try {
		await o.mount(a), await o.setRacers(t), o.render({
			elapsedMs: 0,
			state: "idle",
			heat: 0,
			racers: t.map((e, t) => ({
				id: e.id,
				progress: 0,
				lane: t,
				leading: !1,
				finished: !1
			}))
		});
		for (let e of r) e.style.visibility = "hidden";
		return e.classList.add("has-pixi-race"), {
			render: (e) => o.render(e),
			destroy: () => {
				o.destroy(), a.remove(), e.classList.remove("has-pixi-race");
				for (let e of r) e.style.visibility = i.get(e) || "";
			}
		};
	} catch (e) {
		console.warn("Pixi Arena unavailable; using DOM renderer", e);
		try {
			o.destroy();
		} catch {}
		return a.remove(), null;
	}
}
//#endregion
export { it as createArenaRenderer };

//# sourceMappingURL=pixi-runtime.js.map
