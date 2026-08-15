import { $ as e, B as t, C as n, I as r, J as i, K as a, L as o, U as s, W as c, X as l, Z as u, b as d, g as f, h as p, it as m, nt as h, q as g, rt as _, tt as v, v as y, x as b, z as x } from "./Geometry-CW_aidqb.js";
import { t as S } from "./getPo2TextureFromSource-Df-ffBe0.js";
import { t as C } from "./canvasUtils-BhZPiFjM.js";
import { D as w, E as T, f as E, u as ee } from "./RenderTargetSystem-CL31NvbB.js";
import { a as te, i as ne, n as D, o as O, r as k, s as A } from "./CanvasRenderer-BB6FIAvI.js";
import { t as re } from "./CanvasPool-BTs3zFci.js";
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/environment-browser/browserExt.mjs
var ie = {
	extension: {
		type: _.Environment,
		name: "browser",
		priority: -1
	},
	test: () => !0,
	load: async () => {
		await import("./browserAll-BLsQxPm-.js");
	}
}, ae = {
	extension: {
		type: _.Environment,
		name: "webworker",
		priority: 0
	},
	test: () => typeof self < "u" && self.WorkerGlobalScope !== void 0,
	load: async () => {
		await import("./webworkerAll-N0IZNyOt.js");
	}
}, oe;
function se(e) {
	return oe === void 0 && (oe = (() => {
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
	})()), oe;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/utils/browser/isWebGPUSupported.mjs
var j;
async function ce(e = {}) {
	return j === void 0 && (j = await (async () => {
		let t = y.get().getNavigator().gpu;
		if (!t) return !1;
		try {
			return await (await t.requestAdapter(e)).requestDevice(), !0;
		} catch {
			return !1;
		}
	})()), j;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/autoDetectRenderer.mjs
var le = [
	"webgl",
	"webgpu",
	"canvas"
];
async function ue(e) {
	let t = [];
	e.preference ? Array.isArray(e.preference) ? t = e.preference.slice() : (t.push(e.preference), le.forEach((n) => {
		n !== e.preference && t.push(n);
	})) : t = le.slice();
	let n, r = {};
	for (let i = 0; i < t.length; i++) {
		let a = t[i];
		if (a === "webgpu" && await ce()) {
			let { WebGPURenderer: t } = await import("./WebGPURenderer-qWv9ERNr.js").then((e) => e.t);
			n = t, r = {
				...e,
				...e.webgpu
			};
			break;
		}
		if (a === "webgl" && se(e.failIfMajorPerformanceCaveat ?? w.defaultOptions.failIfMajorPerformanceCaveat)) {
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
var de = class {
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
de.extension = _.Application;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/app/TickerPlugin.mjs
var fe = class {
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
fe.extension = _.Application, m.add(de), m.add(fe);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/app/Application.mjs
var pe = class e {
	constructor(...e) {
		this.stage = new b(), e[0] !== void 0 && g(i, "Application constructor options are deprecated, please use Application.init() instead.");
	}
	async init(t) {
		t = { ...t }, this.stage ||= new b(), this.renderer = await ue(t), e._plugins.forEach((e) => {
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
pe._plugins = [];
var me = pe;
m.handleByList(_.Application, me._plugins), m.add(T);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/AbstractText.mjs
var he = class extends d {
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
function ge(e, t) {
	let n = e[0] ?? {};
	return (typeof n == "string" || e[1]) && (g(i, `use new ${t}({ text: "hi!", style }) instead`), n = {
		text: n,
		style: e[1]
	}), n;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/utils/canvas/getCanvasBoundingBox.mjs
var M = null, N = null;
function _e(e, t) {
	M || (M = y.get().createCanvas(256, 128), N = M.getContext("2d", { willReadFrequently: !0 }), N.globalCompositeOperation = "copy", N.globalAlpha = 1), (M.width < e || M.height < t) && (M.width = a(e), M.height = a(t));
}
function ve(e, t, n) {
	for (let r = 0, i = 4 * n * t; r < t; ++r, i += 4) if (e[i + 3] !== 0) return !1;
	return !0;
}
function ye(e, t, n, r, i) {
	let a = 4 * t;
	for (let t = r, o = r * a + 4 * n; t <= i; ++t, o += a) if (e[o + 3] !== 0) return !1;
	return !0;
}
function be(...e) {
	let t = e[0];
	t.canvas || (t = {
		canvas: e[0],
		resolution: e[1]
	});
	let { canvas: n } = t, r = Math.min(t.resolution ?? 1, 1), i = t.width ?? n.width, a = t.height ?? n.height, o = t.output;
	if (_e(i, a), !N) throw TypeError("Failed to get canvas 2D context");
	N.drawImage(n, 0, 0, i, a, 0, 0, i * r, a * r);
	let s = N.getImageData(0, 0, i, a).data, c = 0, l = 0, d = i - 1, f = a - 1;
	for (; l < a && ve(s, i, l);) ++l;
	if (l === a) return u.EMPTY;
	for (; ve(s, i, f);) --f;
	for (; ye(s, i, c, l, f);) ++c;
	for (; ye(s, i, d, l, f);) --d;
	return ++d, ++f, N.globalCompositeOperation = "source-over", N.strokeRect(c, l, d - c, f - l), N.globalCompositeOperation = "copy", o ??= new u(), o.set(c / r, l / r, (d - c) / r, (f - l) / r), o;
}
//#endregion
//#region node_modules/.pnpm/tiny-lru@11.4.7/node_modules/tiny-lru/dist/tiny-lru.js
var xe = class {
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
function Se(e = 1e3, t = 0, n = !1) {
	if (isNaN(e) || e < 0) throw TypeError("Invalid max value");
	if (isNaN(t) || t < 0) throw TypeError("Invalid ttl value");
	if (typeof n != "boolean") throw TypeError("Invalid resetTtl value");
	return new xe(e, t, n);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/utils/parseTaggedText.mjs
function Ce(e) {
	return !!e.tagStyles && Object.keys(e.tagStyles).length > 0;
}
function we(e) {
	return e.includes("<");
}
function Te(e, t) {
	return e.clone().assign(t);
}
function Ee(e, t) {
	let n = [], r = t.tagStyles;
	if (!Ce(t) || !we(e)) return n.push({
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
					let e = i[i.length - 1], l = Te(e, r[t]);
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
var De = /* @__PURE__ */ new Set([10, 13]), Oe = /* @__PURE__ */ new Set([
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
]), ke = /* @__PURE__ */ new Set([
	45,
	8208,
	8211,
	8212,
	173
]), Ae = /(\r\n|\r|\n)/, je = /(?:\r\n|\r|\n)/;
function P(e) {
	return typeof e == "string" && De.has(e.charCodeAt(0));
}
function F(e, t) {
	return typeof e == "string" && Oe.has(e.charCodeAt(0));
}
function Me(e) {
	return typeof e == "string" && ke.has(e.charCodeAt(0));
}
function Ne(e) {
	return e === "normal" || e === "pre-line";
}
function Pe(e) {
	return e === "normal";
}
function I(e) {
	if (typeof e != "string") return "";
	let t = e.length - 1;
	for (; t >= 0 && F(e[t]);) t--;
	return t < e.length - 1 ? e.slice(0, t + 1) : e;
}
function Fe(e) {
	let t = [], n = [];
	if (typeof e != "string") return t;
	for (let r = 0; r < e.length; r++) {
		let i = e[r], a = e[r + 1];
		if (F(i, a) || P(i)) {
			n.length > 0 && (t.push(n.join("")), n.length = 0), i === "\r" && a === "\n" ? (t.push("\r\n"), r++) : t.push(i);
			continue;
		}
		n.push(i), Me(i) && a && !F(a) && !P(a) && (t.push(n.join("")), n.length = 0);
	}
	return n.length > 0 && t.push(n.join("")), t;
}
function Ie(e, t, n, r) {
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
var Le = /\r\n|\r|\n/g;
function Re(e, t, n, r, i, a, o, s, c) {
	let l = Ee(e, t);
	if (Pe(t.whiteSpace)) for (let e = 0; e < l.length; e++) {
		let t = l[e];
		l[e] = {
			text: t.text.replace(Le, " "),
			style: t.style
		};
	}
	let u = [], d = [];
	for (let e of l) {
		let t = e.text.split(Ae);
		for (let n = 0; n < t.length; n++) {
			let r = t[n];
			r === "\r\n" || r === "\r" || r === "\n" ? (u.push(d), d = []) : r.length > 0 && d.push({
				text: r,
				style: e.style
			});
		}
	}
	(d.length > 0 || u.length === 0) && u.push(d);
	let f = n ? ze(u, t, r, a, s, c) : u, p = [], m = [], h = [], g = [], _ = [], v = 0, y = t._fontString, b = o(y);
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
function ze(e, t, n, r, i, a) {
	let { letterSpacing: o, whiteSpace: s, wordWrapWidth: c, breakWords: l } = t, u = Ne(s), d = c + o, f = {}, p = "", m = (e, t) => {
		let i = `${e}|${t.styleKey}`, a = f[i];
		if (a === void 0) {
			let o = t._fontString;
			o !== p && (n.font = o, p = o), a = r(e, t.letterSpacing, n) + t.letterSpacing, f[i] = a;
		}
		return a;
	}, h = [];
	for (let t of e) {
		let e = Be(t), n = h.length, r = (t) => {
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
				e.text = I(e.text), e.text.length === 0 && s.pop();
			}
			h.push(s), s = [], c = 0, f = !1;
		};
		for (let t = 0; t < e.length; t++) {
			let { token: n, style: v, continuesFromPrevious: y } = e[t], b = m(n, v);
			if (u) {
				let e = F(n), t = p?.text[p.text.length - 1] ?? s[s.length - 1]?.text.slice(-1) ?? "", r = t ? F(t) : !1;
				if (e && r) continue;
			}
			let x = !y, S = x ? r(t) : b;
			if (S > d && x) {
				if (c > 0 && _(), l) {
					let e = o(t);
					for (let t = 0; t < e.length; t++) {
						let n = e[t].token, r = e[t].style, o = Ie(n, l, a, i);
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
				if (F(n)) {
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
				let e = F(n);
				if (c === 0 && e && !f) continue;
				!p || p.style !== v ? (g(), p = {
					text: n,
					style: v
				}) : p.text += n, c += b;
			}
		}
		if (g(), s.length > 0) {
			let e = s[s.length - 1];
			e.text = I(e.text), e.text.length === 0 && s.pop();
		}
		(s.length > 0 || h.length === n) && h.push(s);
	}
	return h;
}
function Be(e) {
	let t = [], n = !1;
	for (let r of e) {
		let e = Fe(r.text), i = !0;
		for (let a of e) {
			let e = F(a) || P(a), o = i && n && !e;
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
var Ve = { willReadFrequently: !0 };
function He(e, t, n, r, i) {
	let a = n[e];
	return typeof a != "number" && (a = i(e, t, r) + t, n[e] = a), a;
}
function Ue(e, t, n, r, i, a, o) {
	let s = n.getContext("2d", Ve);
	s.font = t._fontString;
	let c = 0, l = "", u = [], d = /* @__PURE__ */ Object.create(null), { letterSpacing: f, whiteSpace: p } = t, m = Ne(p), h = Pe(p), g = !m, _ = t.wordWrapWidth + f, v = Fe(e);
	for (let e = 0; e < v.length; e++) {
		let n = v[e];
		if (P(n)) {
			if (!h) {
				u.push(I(l)), g = !m, l = "", c = 0;
				continue;
			}
			n = " ";
		}
		if (m) {
			let e = F(n), t = F(l[l.length - 1]);
			if (e && t) continue;
		}
		let p = He(n, f, d, s, r);
		if (p > _) {
			if (l !== "" && (u.push(I(l)), l = "", c = 0), i(n, t.breakWords)) {
				let e = Ie(n, t.breakWords, o, a);
				for (let t of e) {
					let e = He(t, f, d, s, r);
					e + c > _ && (u.push(I(l)), g = !1, l = "", c = 0), l += t, c += e;
				}
			} else l.length > 0 && (u.push(I(l)), l = "", c = 0), u.push(I(n)), g = !1, l = "", c = 0;
		} else p + c > _ && (g = !1, u.push(I(l)), l = "", c = 0), (l.length > 0 || !F(n) || g) && (l += n, c += p);
	}
	let y = I(l);
	return y.length > 0 && u.push(y), u.join("\n");
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/CanvasTextMetrics.mjs
var We = { willReadFrequently: !0 }, L = class e {
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
		if (Ce(n) && we(t)) {
			let r = Re(t, n, i, e._context, e._measureText, e._measureTextAdvance, e.measureFont, e.canBreakChars, e.wordWrapSplit), o = new e(t, n, r.width, r.height, r.lines, r.lineWidths, r.lineHeight, r.maxLineWidth, r.fontProperties, {
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
		let l = (i ? e._wordWrap(t, n, r) : t).split(je), u = Array(l.length), d = 0;
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
		return Ue(t, n, r, e._measureTextAdvance, e.canBreakWords, e.canBreakChars, e.wordWrapSplit);
	}
	static isBreakingSpace(e, t) {
		return F(e, t);
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
				if (n.getContext("2d", We)?.measureText) return e.__canvas = n, n;
				t = y.get().createCanvas();
			} catch {
				t = y.get().createCanvas();
			}
			t.width = t.height = 10, e.__canvas = t;
		}
		return e.__canvas;
	}
	static get _context() {
		return e.__context ||= e._canvas.getContext("2d", We), e.__context;
	}
};
L.METRICS_STRING = "|ÉqÅ", L.BASELINE_SYMBOL = "M", L.BASELINE_MULTIPLIER = 1.4, L.HEIGHT_MULTIPLIER = 2, L.graphemeSegmenter = (() => {
	if (typeof Intl?.Segmenter == "function") {
		let e = new Intl.Segmenter();
		return (t) => {
			let n = e.segment(t), r = [], i = 0;
			for (let e of n) r[i++] = e.segment;
			return r;
		};
	}
	return (e) => [...e];
})(), L.experimentalLetterSpacing = !1, L._fonts = {}, L._measurementCache = Se(1e3);
var R = L, Ge = [
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui"
];
function z(e) {
	let t = typeof e.fontSize == "number" ? `${e.fontSize}px` : e.fontSize, n = e.fontFamily;
	Array.isArray(e.fontFamily) || (n = e.fontFamily.split(","));
	for (let e = n.length - 1; e >= 0; e--) {
		let t = n[e].trim();
		!/([\"\'])[^\'\"]+\1/.test(t) && !Ge.includes(t) && (t = `"${t}"`), n[e] = t;
	}
	return `${e.fontStyle} ${e.fontVariant} ${e.fontWeight} ${t} ${n.join(",")}`;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/utils/getCanvasFillStyle.mjs
var Ke = 1e5;
function B(n, i, a, s = 0, c = 0, l = 0) {
	if (n.texture === t.WHITE && !n.fill) return o.shared.setValue(n.color).setAlpha(n.alpha ?? 1).toHexa();
	if (!n.fill) {
		let t = i.createPattern(n.texture.source.resource, "repeat"), r = n.matrix.copyTo(e.shared);
		return r.scale(n.texture.source.pixelWidth, n.texture.source.pixelHeight), t.setTransform(r), t;
	}
	if (n.fill instanceof O) {
		let e = n.fill, t = i.createPattern(e.texture.source.resource, "repeat");
		return C.applyPatternTransform(t, e.transform, !1), t;
	}
	if (n.fill instanceof A) {
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
					n = Math.max(0, Math.min(1, n)), f.addColorStop(Math.floor(n * Ke) / Ke, o.shared.setValue(e.color).toHex());
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
var qe = new u();
function V(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) e.charCodeAt(n) === 32 && t++;
	return t;
}
var H = new class {
	getCanvasAndContext(e) {
		let { text: t, style: n, resolution: r = 1 } = e, i = n._getFinalPadding(), a = R.measureText(t || " ", n), o = Math.ceil(Math.ceil(Math.max(1, a.width) + i * 2) * r), s = Math.ceil(Math.ceil(Math.max(1, a.height) + i * 2) * r), c = re.getOptimalCanvasAndContext(o, s);
		return this._renderTextToCanvas(n, i, r, c, a), {
			canvasAndContext: c,
			frame: n.trim ? be({
				canvas: c.canvas,
				width: o,
				height: s,
				resolution: 1,
				output: qe
			}) : qe.set(0, 0, o, s)
		};
	}
	returnCanvasAndContext(e) {
		re.returnCanvasAndContext(e);
	}
	_renderTextToCanvas(e, t, n, r, i) {
		if (i.runsByLine && i.runsByLine.length > 0) {
			this._renderTaggedTextToCanvas(i, e, t, n, r);
			return;
		}
		let { canvas: a, context: o } = r, s = z(e), c = i.lines, l = i.lineHeight, u = i.lineWidths, d = i.maxLineWidth, f = i.fontProperties, p = a.height;
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
					let e = V(c[n]);
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
				let t = z(e.style);
				o.font = t, n.push({
					width: R._measureText(e.text, e.style.letterSpacing, o),
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
					for (let t of f) e += V(t.text);
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
								let e = V(t.text);
								T += s + e * C;
								continue;
							}
						} else {
							let r = R.measureFont(c), i = t.style.lineHeight || r.fontSize;
							o.strokeStyle = B(e, o, {
								width: s,
								height: i,
								lineHeight: i,
								lines: [t.text]
							}, n * 2, T - n, v);
						}
						this._drawLetterSpacing(t.text, t.style, i, T, w + n - m, !0, C);
					}
					let l = V(t.text);
					T += s + l * C;
				}
				T = S + n;
				for (let e = 0; e < f.length; e++) {
					let t = f[e], { width: s, font: c } = x[e];
					if (o.font = c, o.textBaseline = t.style.textBaseline, t.style._fill !== void 0) {
						if (a) {
							if (t.style.dropShadow) this._setupDropShadow(o, t.style, r, h);
							else {
								let e = V(t.text);
								T += s + e * C;
								continue;
							}
						} else {
							let e = R.measureFont(c), r = t.style.lineHeight || e.fontSize, i = {
								width: s,
								height: r,
								lineHeight: r,
								lines: [t.text]
							};
							o.fillStyle = B(t.style._fill, o, i, n * 2, T - n, v);
						}
						this._drawLetterSpacing(t.text, t.style, i, T, w + n - m, !1, C);
					}
					let l = V(t.text);
					T += s + l * C;
				}
				v += b;
			}
		}
	}
	_setFillAndStrokeStyles(e, t, n, r, i, a = 0, o = 0) {
		if (e.fillStyle = t._fill ? B(t._fill, e, n, r * 2, a, o) : null, t._stroke?.width) {
			let s = i + r * 2;
			e.strokeStyle = B(t._stroke, e, n, s, a, o);
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
		if (R.experimentalLetterSpacingSupported && (R.experimentalLetterSpacing ? (s.letterSpacing = `${c}px`, s.textLetterSpacing = `${c}px`, l = !0) : (s.letterSpacing = "0px", s.textLetterSpacing = "0px")), (c === 0 || l) && o === 0) {
			a ? s.strokeText(e, r, i) : s.fillText(e, r, i);
			return;
		}
		if (o !== 0 && (c === 0 || l)) {
			let t = e.split(" "), n = r, c = s.measureText(" ").width;
			for (let e = 0; e < t.length; e++) a ? s.strokeText(t[e], n, i) : s.fillText(t[e], n, i), n += s.measureText(t[e]).width + c + o;
			return;
		}
		let u = r, d = R.graphemeSegmenter(e), f = s.measureText(e).width, p = 0;
		for (let e = 0; e < d.length; ++e) {
			let t = d[e];
			a ? s.strokeText(t, u, i) : s.fillText(t, u, i);
			let n = "";
			for (let t = e + 1; t < d.length; ++t) n += d[t];
			p = s.measureText(n).width, u += f - p + c, t === " " && (u += o), f = p;
		}
	}
}(), U = class e extends v {
	constructor(t = {}) {
		super(), this.uid = l("textStyle"), this._tick = 0, this._cachedFontString = null, Je(t), t instanceof e && (t = t._toObject());
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
			...k.defaultFillStyle,
			...e
		}, () => {
			this._fill = ne({ ...this._originalFill }, k.defaultFillStyle);
		})), this._fill = ne(e === 0 ? "black" : e, k.defaultFillStyle), this.update());
	}
	get stroke() {
		return this._originalStroke;
	}
	set stroke(e) {
		e !== this._originalStroke && (this._originalStroke = e, this._isFillStyle(e) && (this._originalStroke = this._createProxy({
			...k.defaultStrokeStyle,
			...e
		}, () => {
			this._stroke = te({ ...this._originalStroke }, k.defaultStrokeStyle);
		})), this._stroke = te(e, k.defaultStrokeStyle), this.update());
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
		return this._cachedFontString === null && (this._cachedFontString = z(this)), this._cachedFontString;
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
		return (e ?? null) !== null && !(o.isColorLike(e) || e instanceof A || e instanceof O);
	}
};
U.defaultDropShadow = {
	alpha: 1,
	angle: Math.PI / 6,
	blur: 0,
	color: "black",
	distance: 5
}, U.defaultTextStyle = {
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
var W = U;
function Je(e) {
	let t = e;
	if (typeof t.dropShadow == "boolean" && t.dropShadow) {
		let n = W.defaultDropShadow;
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
		else if (n instanceof A || n instanceof O) r.fill = n;
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
		let n = new A({
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
function Ye(e, t) {
	let { texture: n, bounds: r } = e, i = t._style._getFinalPadding();
	x(r, t._anchor, n);
	let a = t._anchor._x * i * 2, o = t._anchor._y * i * 2;
	r.minX -= i - a, r.minY -= i - o, r.maxX -= i - a, r.maxY -= i - o;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/BatchableText.mjs
var Xe = class extends ee {}, Ze = class {
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
			(n.currentKey !== e.styleKey || e._resolution !== t) && this._updateGpuText(e), e._didTextUpdate = !1, Ye(n, e);
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
		let t = new Xe();
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
Ze.extension = {
	type: [
		_.WebGLPipes,
		_.WebGPUPipes,
		_.CanvasPipes
	],
	name: "text"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/shared/AbstractTextSystem.mjs
var Qe = class {
	constructor(e, t) {
		this._activeTextures = {}, this._renderer = e, this._retainCanvasContext = t;
	}
	getTexture(e, t, n, r) {
		typeof e == "string" && (g("8.0.0", "CanvasTextSystem.getTexture: Use object TextOptions instead of separate arguments"), e = {
			text: e,
			style: n,
			resolution: t
		}), e.style instanceof W || (e.style = new W(e.style)), e.textureStyle instanceof c || (e.textureStyle = new c(e.textureStyle)), typeof e.text != "string" && (e.text = e.text.toString());
		let { text: i, style: a, textureStyle: o, autoGenerateMipmaps: s } = e, l = e.resolution ?? this._renderer.resolution, { frame: u, canvasAndContext: d } = H.getCanvasAndContext({
			text: i,
			style: a,
			resolution: l
		}), f = S(d.canvas, u.width, u.height, l, s);
		if (o && (f.source.style = o), a.trim && (u.pad(a.padding), f.frame.copyFrom(u), f.frame.scale(1 / l), f.updateUvs()), a.filters) {
			let e = this._applyFilters(f, a.filters);
			return this.returnTexture(f), H.returnCanvasAndContext(d), e;
		}
		return this._renderer.texture.initSource(f._source), this._retainCanvasContext || H.returnCanvasAndContext(d), f;
	}
	returnTexture(e) {
		let t = e.source, r = t.resource;
		if (this._retainCanvasContext && r?.getContext) {
			let e = r.getContext("2d");
			e && H.returnCanvasAndContext({
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
}, $e = class extends Qe {
	constructor(e) {
		super(e, !0);
	}
};
$e.extension = {
	type: [_.CanvasSystem],
	name: "canvasText"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/shared/GpuTextSystem.mjs
var et = class extends Qe {
	constructor(e) {
		super(e, !1);
	}
};
et.extension = {
	type: [_.WebGLSystem, _.WebGPUSystem],
	name: "canvasText"
}, m.add($e), m.add(et), m.add(Ze);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/Text.mjs
var tt = class extends he {
	constructor(...e) {
		let t = ge(e, "Text");
		super(t, W), this.renderPipeId = "text", t.textureStyle && (this.textureStyle = t.textureStyle instanceof c ? t.textureStyle : new c(t.textureStyle)), this.autoGenerateMipmaps = t.autoGenerateMipmaps ?? s.defaultOptions.autoGenerateMipmaps;
	}
	updateBounds() {
		let e = this._bounds, t = this._anchor, n = 0, r = 0;
		if (this._style.trim) {
			let { frame: e, canvasAndContext: t } = H.getCanvasAndContext({
				text: this.text,
				style: this._style,
				resolution: 1
			});
			H.returnCanvasAndContext(t), n = e.width, r = e.height;
		} else {
			let e = R.measureText(this._text, this._style);
			n = e.width, r = e.height;
		}
		e.minX = -t._x * n, e.maxX = e.minX + n, e.minY = -t._y * r, e.maxY = e.minY + r;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/index.mjs
m.add(ie, ae);
//#endregion
//#region src/arena/pet-texture.ts
var nt = /^#[0-9a-f]{6}$/i, rt = /* @__PURE__ */ new Set([
	"none",
	"bandana",
	"visor",
	"crown",
	"headphones",
	"cape"
]), it = /* @__PURE__ */ new Set([
	"focused",
	"happy",
	"fierce",
	"sleepy"
]);
function at(e, t = "#38bdf8") {
	let n = e || {};
	return {
		name: String(n.name || "").slice(0, 24),
		species: String(n.species || "emberrat").replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "emberrat",
		color: nt.test(n.color || "") ? n.color : t,
		accent: nt.test(n.accent || "") ? n.accent : "#ffffff",
		trail: [
			"none",
			"dust",
			"spark",
			"rainbow"
		].includes(n.trail || "") ? n.trail : "none",
		accessory: rt.has(n.accessory) ? n.accessory : "none",
		expression: it.has(n.expression) ? n.expression : "focused"
	};
}
function ot(e, t, n) {
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
function st(e, t) {
	let n = Math.max(240, e), r = Math.max(240, t), i = r > n, a = r < 520 || n < 520, o = r * .1, s = r * .9, c = n * .03, l = n * .91, u = s - o, d = (n <= 640 ? 68 : 88) / 72;
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
function ct(e, t, n) {
	let r = Math.max(1, n), i = Math.max(0, Math.min(r - 1, t));
	return e.laneTop + e.laneHeight * ((i + .5) / r);
}
function lt(e, t) {
	let n = Math.max(0, Math.min(1, t));
	return e.trackLeft + e.trackWidth * n;
}
//#endregion
//#region src/arena/pixel-poses.ts
function G(e, t) {
	return t === 0 ? e : t > 0 ? `${".".repeat(t)}${e.slice(0, -t)}` : `${e.slice(-t)}${".".repeat(-t)}`;
}
function ut(e, t) {
	return t === 0 ? [...e] : e.map((n, r) => r >= Math.max(9, e.length - 6) ? t === 1 ? G(n, r % 2 == 0 ? 1 : -1) : t === 2 ? G(n, +(r % 3 == 0)) : G(n, r % 2 == 0 ? -1 : 1) : t === 1 || t === 3 ? G(n, 1) : n);
}
function K(e, t) {
	let n = Math.max(120, t);
	return Math.floor(Math.max(0, e) % n / (n / 4));
}
//#endregion
//#region src/arena/winner-sequence.ts
var dt = (e) => Math.max(0, Math.min(1, e)), ft = (e) => e <= 0 || e >= 1 ? 0 : Math.sin(e * Math.PI);
function pt(e) {
	let t = Math.max(0, e);
	return {
		freeze: +(t < 115),
		converge: ft((t - 80) / 520),
		launch: ft((t - 190) / 620),
		celebrate: t < 720 ? 0 : Math.abs(Math.sin((t - 720) * .014)) * dt((t - 720) / 280),
		loserReaction: ft((t - 120) / 760)
	};
}
//#endregion
//#region src/arena/animation.ts
var mt = Math.PI * 2, q = (e) => Math.max(0, Math.min(1, e)), ht = (e) => 1 - (1 - q(e)) ** 3, J = (e) => Math.sin(q(e) * Math.PI), Y = (e = 380) => ({
	x: 0,
	y: 0,
	scaleX: 1,
	scaleY: 1,
	rotation: 0,
	strideMs: e,
	afterimage: 0,
	impact: 0,
	dust: 0,
	skid: 0,
	energy: 0,
	frame: 0
});
function gt(e) {
	let t = Math.max(0, Math.min(3, e.heat)), n = Math.max(0, e.elapsedMs - (e.motionStartedMs ?? 0)), r = e.elapsedMs * (.012 + t * .0015) + e.lane * .73 + e.variant * 1.9, i = Math.sin(r);
	if (e.reducedMotion) return Y(620);
	if (e.motion === "idle") return {
		...Y(),
		y: -.75 - Math.sin(e.elapsedMs * .015 + e.lane * .7) * .75
	};
	if (e.motion === "run") {
		let n = q(e.speed ?? t / 3), r = Math.max(-1, Math.min(1, e.acceleration ?? 0)), i = Math.max(235, 410 - t * 48), a = e.elapsedMs / i * mt + e.lane * .61, o = Math.abs(Math.sin(a)), s = Math.max(0, Math.cos(a));
		return {
			...Y(i),
			x: Math.sin(a * .5) * .45 + r * 1.2,
			y: -.8 - o * (1.6 + t * .35) + s * .55,
			scaleX: 1 + Math.sin(a) * .018 + s * .025,
			scaleY: 1 - Math.sin(a) * .015 - s * .045,
			rotation: -n * .045 + r * -.03 + Math.sin(a) * .016,
			frame: K(e.elapsedMs + e.lane * 31, i),
			dust: .14 + t * .1,
			energy: Math.max(0, r) * .28
		};
	}
	if (e.motion === "surge") {
		let e = q(n / 920), r = e < .12 ? e / .12 : 1, a = e < .12 ? 0 : J((e - .12) / .48), o = ht((e - .6) / .4);
		return {
			...Y(190),
			x: -2.2 * (1 - r) + a * 3.5 * (1 - o),
			y: e < .12 ? 1.4 * r : -2.2 - Math.abs(i) * 1.5,
			scaleX: 1 + a * .15 * (1 - o),
			scaleY: 1 - a * .08 * (1 - o),
			rotation: -.08 * a * (1 - o),
			afterimage: a * (.45 + t * .1),
			dust: .65 + a * .35,
			energy: a,
			frame: K(n, 190)
		};
	}
	if (e.motion === "stumble") {
		let t = q(n / 1120), r = J(t / .16), i = t >= .16 && t < .58 ? J((t - .16) / .42) : 0, a = t >= .58 ? ht((t - .58) / .42) : 0, o = e.variant >= .34 && e.variant < .67, s = e.variant >= .67, c = s ? i : 0;
		return {
			...Y(480),
			x: -r * 2.5 + (o ? i * 3.8 : -i * 3.2) + a * 1.2,
			y: r * 1.2 + i * (s ? 6.2 : 2.4) - a * 1.1,
			scaleX: 1 + i * .1,
			scaleY: 1 - i * .15,
			rotation: r * .16 + i * (o ? -.32 : .24 + c * .58) - a * .18,
			impact: J((t - .12) / .22),
			dust: Math.max(r, i) * .9,
			skid: i,
			frame: t < .16 ? 1 : t < .58 ? s ? 3 : 2 : 0
		};
	}
	if (e.motion === "jump") {
		let e = q(n / 840), r = e < .16 ? J(e / .16) : 0, i = e >= .16 && e < .76 ? (e - .16) / .6 : 0, a = e >= .76 ? J((e - .76) / .24) : 0;
		return {
			...Y(285),
			x: i ? ht(i) * 2.3 : 0,
			y: r * 1.7 - Math.sin(i * Math.PI) * (6.5 + t * .8) + a * 1.7,
			scaleX: 1 + r * .08 - i * .04 + a * .12,
			scaleY: 1 - r * .12 + i * .08 - a * .16,
			rotation: i ? -.07 + i * .12 : 0,
			impact: a,
			dust: Math.max(r * .5, a),
			frame: r ? 2 : i ? 1 : a ? 3 : 0
		};
	}
	if (e.motion === "duel") {
		let t = q(n / 1050), r = Math.max(0, Math.sin(t * Math.PI * 5));
		return {
			...Y(205),
			x: r * (1.8 + e.variant),
			y: -1.5 - Math.abs(i) * 1.8,
			scaleX: 1 + r * .09,
			scaleY: 1 - r * .045,
			rotation: -r * .05,
			afterimage: r * .45,
			impact: J((t - .38) / .2) * .75,
			dust: .35 + r * .45,
			energy: r,
			frame: K(n, 205)
		};
	}
	if (e.motion === "near") {
		let t = q(n / 680), r = J(t / .55), i = J((t - .5) / .5);
		return {
			...Y(330),
			x: -r * 2.2 + i * 1.2,
			y: -r * (3 + e.variant * 2) + i,
			scaleX: 1 - r * .06 + i * .08,
			scaleY: 1 + r * .1 - i * .08,
			rotation: -r * .13 + i * .08,
			impact: i * .65,
			dust: i * .55,
			frame: r > i ? 1 : i > 0 ? 3 : 0
		};
	}
	if (e.motion === "lose") {
		let t = pt(n).loserReaction;
		return {
			...Y(520),
			x: -t * 2,
			y: t * 1.8,
			scaleX: 1 + t * .04,
			scaleY: 1 - t * .1,
			rotation: t * (e.variant > .5 ? .09 : -.09),
			frame: t > .4 ? 2 : 0,
			dust: t * .22
		};
	}
	let a = pt(n);
	return {
		...Y(260),
		y: -a.launch * 8 - a.celebrate * 5,
		scaleX: 1 + a.launch * .18 + a.celebrate * .08,
		scaleY: 1 - a.launch * .08 + a.celebrate * .08,
		rotation: Math.sin(n * .012) * a.launch * .08,
		afterimage: a.launch * .48,
		impact: Math.max(a.freeze, a.converge * .55),
		dust: a.launch * .8,
		energy: a.converge,
		frame: a.freeze ? 2 : K(n, 360)
	};
}
function _t(e, t) {
	let n = 2166136261 ^ t;
	for (let t of String(e)) n = Math.imul(n ^ t.charCodeAt(0), 16777619);
	return (n >>> 0) / 4294967295;
}
//#endregion
//#region src/arena/effects.ts
function X(e) {
	return e = Math.imul(e ^ e >>> 16, 73244475), e = Math.imul(e ^ e >>> 16, 73244475), (e ^ e >>> 16) >>> 0;
}
function vt(e, t, n) {
	let r = X(e * 131 + t * 977 + n * 7919);
	return {
		x: (r & 65535) / 65535,
		y: (r >>> 16 & 65535) / 65535,
		length: .35 + (X(r + 1) & 65535) / 65535 * .65,
		alpha: .3 + (X(r + 2) & 65535) / 65535 * .7
	};
}
function yt(e, t, n) {
	if (n || e <= 0) return 0;
	let r = t ? .58 : 1;
	return Math.round((4 + Math.min(3, e) * 4) * r);
}
//#endregion
//#region src/arena/anime-effects.ts
function bt(e, t, n, r) {
	if (e.clear(), t.state !== "running" || r) return;
	let i = yt(t.heat, n.compact, !1), a = Math.floor(t.elapsedMs / (t.heat >= 2 ? 72 : 105));
	for (let r = 0; r < i; r++) {
		let i = vt(a, t.heat, r), o = i.x * n.width, s = i.y * n.height, c = .55 + Math.sin((t.elapsedMs + r * 83) * .006) * .28, l = (24 + n.width * .09 * i.length) * (.7 + t.heat * .22);
		e.moveTo(o, s).lineTo(o - l, s).stroke({
			color: r % 4 == 0 ? 16772506 : 16777215,
			width: i.length > .72 ? 2.2 : 1.1,
			alpha: i.alpha * c * .2
		});
	}
}
function xt(e, t, n, r, i, a) {
	if (!(a <= .02)) for (let o = 0; o < 12; o++) {
		let s = o / 12 * Math.PI * 2, c = Math.max(t, n) * (.38 + o % 3 * .035), l = 45 + a * 35;
		e.moveTo(r + Math.cos(s) * c, i + Math.sin(s) * c).lineTo(r + Math.cos(s) * l, i + Math.sin(s) * l).stroke({
			color: o % 2 ? 16767050 : 16777215,
			width: 2,
			alpha: a * .34
		});
	}
}
//#endregion
//#region src/arena/racer-effects.ts
function St(e) {
	let { graphics: t, pose: n, elapsedMs: r, variant: i, color: a } = e;
	if (t.clear(), !(!e.active || e.reducedMotion)) {
		if (n.afterimage > .06) for (let e = 0; e < 4; e++) {
			let r = -14 + e * 9, i = 16 + n.afterimage * (22 + e * 4);
			t.moveTo(-18, r).lineTo(-18 - i, r + (e - 1.5) * .8).stroke({
				color: a,
				width: 4.5 - e * .65,
				alpha: n.afterimage * (.28 - e * .035)
			});
		}
		if (n.skid > .05 && (t.moveTo(-8, 19).lineTo(-18 - n.skid * 34, 21).stroke({
			color: 16115656,
			width: 2.2,
			alpha: n.skid * .72
		}), t.moveTo(-3, 22).lineTo(-12 - n.skid * 24, 24).stroke({
			color: 10191455,
			width: 1.4,
			alpha: n.skid * .62
		})), n.dust > .1) {
			let e = Math.floor(r / 75);
			for (let r = 0; r < 4; r++) {
				let a = vt(e, Math.floor(i * 17), r), o = 1 + a.length * 2;
				t.circle(-24 - a.x * 15, 17 + a.y * 7, o).fill({
					color: 14141348,
					alpha: n.dust * a.alpha * .42
				});
			}
		}
		if (n.impact > .06) {
			let e = 17 + n.impact * 20;
			t.circle(0, 0, e).stroke({
				color: a,
				width: 2.2,
				alpha: n.impact * .56
			}), t.circle(0, 0, e * .62).stroke({
				color: 16777215,
				width: 1.2,
				alpha: n.impact * .38
			});
			for (let e = 0; e < 8; e++) {
				let r = e / 8 * Math.PI * 2 + i, o = 12 + e % 2 * 4, s = 25 + n.impact * (9 + e % 3 * 3);
				t.moveTo(Math.cos(r) * o, Math.sin(r) * o).lineTo(Math.cos(r) * s, Math.sin(r) * s).stroke({
					color: e % 2 ? a : 16777215,
					width: 1.5,
					alpha: n.impact * .64
				});
			}
		}
	}
}
//#endregion
//#region js/arena/dfl-sprites.js
var Z = [
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
new Map(Z.map((e) => [e.id, e]));
//#endregion
//#region src/arena/pixi-stage.ts
var Q = 3, Ct = class {
	app = new me();
	scenery = new b({ label: "scenery" });
	course = new b({ label: "course" });
	actors = new b({ label: "racers" });
	effects = new b({ label: "effects" });
	overlay = new b({ label: "overlay" });
	#e = new D({ label: "legacy-feature-set" });
	#t = new tt({
		text: "",
		style: {
			fill: 16777215,
			fontFamily: "monospace",
			fontSize: 12
		}
	});
	#n = new D({ label: "speed-lines" });
	#r = null;
	#i = st(1280, 720);
	#a = [];
	#o = /* @__PURE__ */ new Map();
	#s = null;
	#c = null;
	async mount(e) {
		this.#r = e, await this.app.init({
			resizeTo: e,
			backgroundAlpha: 0,
			antialias: !1,
			autoDensity: !0,
			resolution: Math.min(window.devicePixelRatio || 1, 2),
			preference: "webgl"
		}), this.app.canvas.className = "arena-pixi-canvas", this.app.canvas.setAttribute("aria-hidden", "true"), e.appendChild(this.app.canvas), this.scenery.addChild(this.#e), this.overlay.addChild(this.#t), this.app.stage.addChild(this.scenery, this.course, this.actors, this.effects, this.overlay), this.effects.addChild(this.#n), this.resize(), typeof ResizeObserver == "function" && (this.#c = new ResizeObserver(() => this.resize()), this.#c.observe(e));
	}
	async setRacers(e) {
		this.#a = e, this.app.canvas.dataset.racerCount = String(e.length), this.#o.clear(), this.actors.removeChildren();
		for (let t of e) {
			let n = new b({ label: `racer-${t.id}` });
			n.eventMode = "none";
			let r = at(t.pet, t.color), i = this.#l(r), a = new b({ label: `pet-${r.species}` });
			a.addChild(...i);
			let o = new D({ label: `effects-${t.id}` });
			n.addChild(o, a), this.#o.set(t.id, {
				root: n,
				art: a,
				frames: i,
				fx: o,
				color: this.#f(r.accent),
				variant: _t(t.id, e.indexOf(t)),
				motion: "idle",
				motionStartedMs: 0,
				finishedAtMs: null
			}), this.actors.addChild(n);
		}
	}
	render(e) {
		this.#s = e;
		let t = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? !1;
		bt(this.#n, e, this.#i, t);
		let n = 0, r = null;
		for (let i of e.racers) {
			let a = this.#o.get(i.id);
			if (!a) continue;
			let o = i.finished && i.id === e.winnerId, s = o ? "win" : e.state === "finished" && i.finished ? "lose" : i.finished ? "idle" : ot(i.reaction, !1, e.state);
			o && a.finishedAtMs == null && (a.finishedAtMs = e.elapsedMs), i.finished || (a.finishedAtMs = null), a.motion === s ? i.reactionStartedMs != null && (a.motionStartedMs = i.reactionStartedMs) : (a.motion = s, a.motionStartedMs = i.reactionStartedMs ?? a.finishedAtMs ?? e.elapsedMs);
			let c = gt({
				motion: s,
				elapsedMs: e.elapsedMs,
				motionStartedMs: a.motionStartedMs,
				lane: i.lane,
				heat: e.heat,
				variant: a.variant,
				speed: i.speed ?? 0,
				acceleration: i.acceleration ?? 0,
				reducedMotion: t
			});
			a.root.position.set(lt(this.#i, i.progress), ct(this.#i, i.lane, this.#a.length)), a.root.scale.set(this.#i.actorScale), a.root.rotation = 0, a.root.alpha = 1, a.art.position.set(c.x, c.y), a.art.scale.set(c.scaleX, c.scaleY), a.art.rotation = c.rotation;
			let l = t ? 0 : c.frame;
			a.frames.forEach((e, t) => {
				e.visible = t === l;
			}), t && (a.frames[0].visible = !0), St({
				graphics: a.fx,
				pose: c,
				elapsedMs: e.elapsedMs,
				variant: a.variant,
				color: a.color,
				active: e.state === "running" || e.state === "finished",
				reducedMotion: t
			}), o && c.energy > 0 && (r = {
				x: a.root.position.x,
				y: a.root.position.y,
				intensity: c.energy
			}), n = Math.max(n, c.impact);
		}
		r && xt(this.#n, this.#i.width, this.#i.height, r.x, r.y, r.intensity);
		let i = e.state === "running" && !t && e.heat >= 2;
		this.actors.position.set(i ? Math.sin(e.elapsedMs * .09) * n * 1.15 : 0, i ? Math.cos(e.elapsedMs * .11) * n * .7 : 0);
	}
	resize() {
		this.#r && (this.app.resize(), this.#i = st(this.app.screen.width, this.app.screen.height), this.app.canvas.dataset.actorWidth = String(Math.round(this.#i.actorScale * 72)), this.#s && this.render(this.#s));
	}
	destroy() {
		this.#c?.disconnect(), this.#c = null, this.#o.clear(), this.#a = [], this.#s = null, this.app.destroy(!0, { children: !0 }), this.#r = null;
	}
	#l(e) {
		let t = 0;
		for (let n of e.species) t = Math.imul(t, 31) + n.charCodeAt(0) >>> 0;
		let n = Z.find((t) => t.id === e.species) || Z[t % Z.length];
		return [
			this.#u(n.px, n.palette, e),
			this.#u(ut(n.px, 1), n.palette, e),
			this.#u(ut(n.px, 2), n.palette, e),
			this.#u(ut(n.px, 3), n.palette, e)
		];
	}
	#u(e, t, n) {
		let r = this.#f(n.color), i = this.#f(n.accent), a = new D(), o = (e, t, n) => a.rect((e - 12) * Q, (t - 15 / 2) * Q, Q, Q).fill(n);
		return e.forEach((e, i) => {
			for (let a = 0; a < e.length; a++) {
				let s = e[a];
				s !== "." && s !== " " && o(a, i, s === "L" ? r : this.#f(t[s] || n.color));
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
		let t = Number.parseInt(e.replace("#", ""), 16);
		return Number.isFinite(t) ? t : 3718648;
	}
};
//#endregion
//#region src/arena/background-motion.ts
function wt(e, t, n = !1) {
	if (e !== "running") return {
		blurX: 0,
		blurY: 0,
		intensity: 0
	};
	let r = Math.max(0, Math.min(1, t)), i = n ? .45 : 1;
	return {
		blurX: (.35 + r * 3.2) * i,
		blurY: .08,
		intensity: r * i
	};
}
//#endregion
//#region src/arena/runtime.ts
var $ = /* @__PURE__ */ new WeakMap();
async function Tt(e, t) {
	if (!e) return null;
	$.get(e)?.destroy();
	let n = e.querySelector(".track") || e, r = Array.from(n.querySelectorAll(".runner-art")), i = new Map(r.map((e) => [e, {
		value: e.style.getPropertyValue("visibility"),
		priority: e.style.getPropertyPriority("visibility"),
		ariaHidden: e.getAttribute("aria-hidden")
	}])), a = document.createElement("div");
	a.className = "arena-pixi-host", Object.assign(a.style, {
		position: "absolute",
		inset: "0",
		zIndex: "1",
		overflow: "hidden",
		pointerEvents: "none"
	}), getComputedStyle(n).position === "static" && (n.style.position = "relative"), n.appendChild(a);
	let o = new Ct();
	try {
		await o.mount(a);
		for (let e of r) e.style.setProperty("visibility", "hidden", "important"), e.setAttribute("aria-hidden", "true");
		e.classList.add("has-pixi-race"), await o.setRacers(t), o.render({
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
		let n = !1, s = {
			render: (e) => {
				n || o.render(e);
			},
			destroy: () => {
				if (!n) {
					n = !0, o.destroy(), a.remove(), e.classList.remove("has-pixi-race");
					for (let e of r) {
						let t = i.get(e);
						e.style.setProperty("visibility", t?.value || "", t?.priority || ""), t?.ariaHidden == null ? e.removeAttribute("aria-hidden") : e.setAttribute("aria-hidden", t.ariaHidden);
					}
					$.get(e) === s && $.delete(e);
				}
			}
		};
		return $.set(e, s), s;
	} catch (t) {
		console.warn("Pixi Arena unavailable; using DOM renderer", t);
		try {
			o.destroy();
		} catch {}
		a.remove(), e.classList.remove("has-pixi-race");
		for (let e of r) {
			let t = i.get(e);
			e.style.setProperty("visibility", t?.value || "", t?.priority || ""), t?.ariaHidden == null ? e.removeAttribute("aria-hidden") : e.setAttribute("aria-hidden", t.ariaHidden);
		}
		return null;
	}
}
//#endregion
export { wt as backgroundMotion, Tt as createArenaRenderer };

//# sourceMappingURL=pixi-runtime.js.map