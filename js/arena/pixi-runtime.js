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
}, j;
function oe(e) {
	return j === void 0 && (j = (() => {
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
	})()), j;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/utils/browser/isWebGPUSupported.mjs
var M;
async function se(e = {}) {
	return M === void 0 && (M = await (async () => {
		let t = y.get().getNavigator().gpu;
		if (!t) return !1;
		try {
			return await (await t.requestAdapter(e)).requestDevice(), !0;
		} catch {
			return !1;
		}
	})()), M;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/autoDetectRenderer.mjs
var N = [
	"webgl",
	"webgpu",
	"canvas"
];
async function ce(e) {
	let t = [];
	e.preference ? Array.isArray(e.preference) ? t = e.preference.slice() : (t.push(e.preference), N.forEach((n) => {
		n !== e.preference && t.push(n);
	})) : t = N.slice();
	let n, r = {};
	for (let i = 0; i < t.length; i++) {
		let a = t[i];
		if (a === "webgpu" && await se()) {
			let { WebGPURenderer: t } = await import("./WebGPURenderer-qWv9ERNr.js").then((e) => e.t);
			n = t, r = {
				...e,
				...e.webgpu
			};
			break;
		}
		if (a === "webgl" && oe(e.failIfMajorPerformanceCaveat ?? w.defaultOptions.failIfMajorPerformanceCaveat)) {
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
var P = class {
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
P.extension = _.Application;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/app/TickerPlugin.mjs
var le = class {
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
le.extension = _.Application, m.add(P), m.add(le);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/app/Application.mjs
var ue = class e {
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
ue._plugins = [];
var de = ue;
m.handleByList(_.Application, de._plugins), m.add(T);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/AbstractText.mjs
var fe = class extends d {
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
function pe(e, t) {
	let n = e[0] ?? {};
	return (typeof n == "string" || e[1]) && (g(i, `use new ${t}({ text: "hi!", style }) instead`), n = {
		text: n,
		style: e[1]
	}), n;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/utils/canvas/getCanvasBoundingBox.mjs
var F = null, I = null;
function me(e, t) {
	F || (F = y.get().createCanvas(256, 128), I = F.getContext("2d", { willReadFrequently: !0 }), I.globalCompositeOperation = "copy", I.globalAlpha = 1), (F.width < e || F.height < t) && (F.width = a(e), F.height = a(t));
}
function he(e, t, n) {
	for (let r = 0, i = 4 * n * t; r < t; ++r, i += 4) if (e[i + 3] !== 0) return !1;
	return !0;
}
function ge(e, t, n, r, i) {
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
	if (me(i, a), !I) throw TypeError("Failed to get canvas 2D context");
	I.drawImage(n, 0, 0, i, a, 0, 0, i * r, a * r);
	let s = I.getImageData(0, 0, i, a).data, c = 0, l = 0, d = i - 1, f = a - 1;
	for (; l < a && he(s, i, l);) ++l;
	if (l === a) return u.EMPTY;
	for (; he(s, i, f);) --f;
	for (; ge(s, i, c, l, f);) ++c;
	for (; ge(s, i, d, l, f);) --d;
	return ++d, ++f, I.globalCompositeOperation = "source-over", I.strokeRect(c, l, d - c, f - l), I.globalCompositeOperation = "copy", o ??= new u(), o.set(c / r, l / r, (d - c) / r, (f - l) / r), o;
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
function be(e) {
	return !!e.tagStyles && Object.keys(e.tagStyles).length > 0;
}
function xe(e) {
	return e.includes("<");
}
function Se(e, t) {
	return e.clone().assign(t);
}
function Ce(e, t) {
	let n = [], r = t.tagStyles;
	if (!be(t) || !xe(e)) return n.push({
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
					let e = i[i.length - 1], l = Se(e, r[t]);
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
var we = /* @__PURE__ */ new Set([10, 13]), Te = /* @__PURE__ */ new Set([
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
]), Ee = /* @__PURE__ */ new Set([
	45,
	8208,
	8211,
	8212,
	173
]), De = /(\r\n|\r|\n)/, Oe = /(?:\r\n|\r|\n)/;
function L(e) {
	return typeof e == "string" && we.has(e.charCodeAt(0));
}
function R(e, t) {
	return typeof e == "string" && Te.has(e.charCodeAt(0));
}
function ke(e) {
	return typeof e == "string" && Ee.has(e.charCodeAt(0));
}
function z(e) {
	return e === "normal" || e === "pre-line";
}
function B(e) {
	return e === "normal";
}
function V(e) {
	if (typeof e != "string") return "";
	let t = e.length - 1;
	for (; t >= 0 && R(e[t]);) t--;
	return t < e.length - 1 ? e.slice(0, t + 1) : e;
}
function H(e) {
	let t = [], n = [];
	if (typeof e != "string") return t;
	for (let r = 0; r < e.length; r++) {
		let i = e[r], a = e[r + 1];
		if (R(i, a) || L(i)) {
			n.length > 0 && (t.push(n.join("")), n.length = 0), i === "\r" && a === "\n" ? (t.push("\r\n"), r++) : t.push(i);
			continue;
		}
		n.push(i), ke(i) && a && !R(a) && !L(a) && (t.push(n.join("")), n.length = 0);
	}
	return n.length > 0 && t.push(n.join("")), t;
}
function U(e, t, n, r) {
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
	let l = Ce(e, t);
	if (B(t.whiteSpace)) for (let e = 0; e < l.length; e++) {
		let t = l[e];
		l[e] = {
			text: t.text.replace(Ae, " "),
			style: t.style
		};
	}
	let u = [], d = [];
	for (let e of l) {
		let t = e.text.split(De);
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
	let { letterSpacing: o, whiteSpace: s, wordWrapWidth: c, breakWords: l } = t, u = z(s), d = c + o, f = {}, p = "", m = (e, t) => {
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
				e.text = V(e.text), e.text.length === 0 && s.pop();
			}
			h.push(s), s = [], c = 0, f = !1;
		};
		for (let t = 0; t < e.length; t++) {
			let { token: n, style: v, continuesFromPrevious: y } = e[t], b = m(n, v);
			if (u) {
				let e = R(n), t = p?.text[p.text.length - 1] ?? s[s.length - 1]?.text.slice(-1) ?? "", r = t ? R(t) : !1;
				if (e && r) continue;
			}
			let x = !y, S = x ? r(t) : b;
			if (S > d && x) {
				if (c > 0 && _(), l) {
					let e = o(t);
					for (let t = 0; t < e.length; t++) {
						let n = e[t].token, r = e[t].style, o = U(n, l, a, i);
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
				if (R(n)) {
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
				let e = R(n);
				if (c === 0 && e && !f) continue;
				!p || p.style !== v ? (g(), p = {
					text: n,
					style: v
				}) : p.text += n, c += b;
			}
		}
		if (g(), s.length > 0) {
			let e = s[s.length - 1];
			e.text = V(e.text), e.text.length === 0 && s.pop();
		}
		(s.length > 0 || h.length === n) && h.push(s);
	}
	return h;
}
function Ne(e) {
	let t = [], n = !1;
	for (let r of e) {
		let e = H(r.text), i = !0;
		for (let a of e) {
			let e = R(a) || L(a), o = i && n && !e;
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
function W(e, t, n, r, i) {
	let a = n[e];
	return typeof a != "number" && (a = i(e, t, r) + t, n[e] = a), a;
}
function Fe(e, t, n, r, i, a, o) {
	let s = n.getContext("2d", Pe);
	s.font = t._fontString;
	let c = 0, l = "", u = [], d = /* @__PURE__ */ Object.create(null), { letterSpacing: f, whiteSpace: p } = t, m = z(p), h = B(p), g = !m, _ = t.wordWrapWidth + f, v = H(e);
	for (let e = 0; e < v.length; e++) {
		let n = v[e];
		if (L(n)) {
			if (!h) {
				u.push(V(l)), g = !m, l = "", c = 0;
				continue;
			}
			n = " ";
		}
		if (m) {
			let e = R(n), t = R(l[l.length - 1]);
			if (e && t) continue;
		}
		let p = W(n, f, d, s, r);
		if (p > _) {
			if (l !== "" && (u.push(V(l)), l = "", c = 0), i(n, t.breakWords)) {
				let e = U(n, t.breakWords, o, a);
				for (let t of e) {
					let e = W(t, f, d, s, r);
					e + c > _ && (u.push(V(l)), g = !1, l = "", c = 0), l += t, c += e;
				}
			} else l.length > 0 && (u.push(V(l)), l = "", c = 0), u.push(V(n)), g = !1, l = "", c = 0;
		} else p + c > _ && (g = !1, u.push(V(l)), l = "", c = 0), (l.length > 0 || !R(n) || g) && (l += n, c += p);
	}
	let y = V(l);
	return y.length > 0 && u.push(y), u.join("\n");
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/CanvasTextMetrics.mjs
var Ie = { willReadFrequently: !0 }, G = class e {
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
		if (be(n) && xe(t)) {
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
		let l = (i ? e._wordWrap(t, n, r) : t).split(Oe), u = Array(l.length), d = 0;
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
		return Fe(t, n, r, e._measureTextAdvance, e.canBreakWords, e.canBreakChars, e.wordWrapSplit);
	}
	static isBreakingSpace(e, t) {
		return R(e, t);
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
				if (n.getContext("2d", Ie)?.measureText) return e.__canvas = n, n;
				t = y.get().createCanvas();
			} catch {
				t = y.get().createCanvas();
			}
			t.width = t.height = 10, e.__canvas = t;
		}
		return e.__canvas;
	}
	static get _context() {
		return e.__context ||= e._canvas.getContext("2d", Ie), e.__context;
	}
};
G.METRICS_STRING = "|ÉqÅ", G.BASELINE_SYMBOL = "M", G.BASELINE_MULTIPLIER = 1.4, G.HEIGHT_MULTIPLIER = 2, G.graphemeSegmenter = (() => {
	if (typeof Intl?.Segmenter == "function") {
		let e = new Intl.Segmenter();
		return (t) => {
			let n = e.segment(t), r = [], i = 0;
			for (let e of n) r[i++] = e.segment;
			return r;
		};
	}
	return (e) => [...e];
})(), G.experimentalLetterSpacing = !1, G._fonts = {}, G._measurementCache = ye(1e3);
var K = G, Le = [
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui"
];
function q(e) {
	let t = typeof e.fontSize == "number" ? `${e.fontSize}px` : e.fontSize, n = e.fontFamily;
	Array.isArray(e.fontFamily) || (n = e.fontFamily.split(","));
	for (let e = n.length - 1; e >= 0; e--) {
		let t = n[e].trim();
		!/([\"\'])[^\'\"]+\1/.test(t) && !Le.includes(t) && (t = `"${t}"`), n[e] = t;
	}
	return `${e.fontStyle} ${e.fontVariant} ${e.fontWeight} ${t} ${n.join(",")}`;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/utils/getCanvasFillStyle.mjs
var Re = 1e5;
function J(n, i, a, s = 0, c = 0, l = 0) {
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
					n = Math.max(0, Math.min(1, n)), f.addColorStop(Math.floor(n * Re) / Re, o.shared.setValue(e.color).toHex());
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
var ze = new u();
function Y(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) e.charCodeAt(n) === 32 && t++;
	return t;
}
var X = new class {
	getCanvasAndContext(e) {
		let { text: t, style: n, resolution: r = 1 } = e, i = n._getFinalPadding(), a = K.measureText(t || " ", n), o = Math.ceil(Math.ceil(Math.max(1, a.width) + i * 2) * r), s = Math.ceil(Math.ceil(Math.max(1, a.height) + i * 2) * r), c = re.getOptimalCanvasAndContext(o, s);
		return this._renderTextToCanvas(n, i, r, c, a), {
			canvasAndContext: c,
			frame: n.trim ? _e({
				canvas: c.canvas,
				width: o,
				height: s,
				resolution: 1,
				output: ze
			}) : ze.set(0, 0, o, s)
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
		let { canvas: a, context: o } = r, s = q(e), c = i.lines, l = i.lineHeight, u = i.lineWidths, d = i.maxLineWidth, f = i.fontProperties, p = a.height;
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
					let e = Y(c[n]);
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
				let t = q(e.style);
				o.font = t, n.push({
					width: K._measureText(e.text, e.style.letterSpacing, o),
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
					for (let t of f) e += Y(t.text);
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
								let e = Y(t.text);
								T += s + e * C;
								continue;
							}
						} else {
							let r = K.measureFont(c), i = t.style.lineHeight || r.fontSize;
							o.strokeStyle = J(e, o, {
								width: s,
								height: i,
								lineHeight: i,
								lines: [t.text]
							}, n * 2, T - n, v);
						}
						this._drawLetterSpacing(t.text, t.style, i, T, w + n - m, !0, C);
					}
					let l = Y(t.text);
					T += s + l * C;
				}
				T = S + n;
				for (let e = 0; e < f.length; e++) {
					let t = f[e], { width: s, font: c } = x[e];
					if (o.font = c, o.textBaseline = t.style.textBaseline, t.style._fill !== void 0) {
						if (a) {
							if (t.style.dropShadow) this._setupDropShadow(o, t.style, r, h);
							else {
								let e = Y(t.text);
								T += s + e * C;
								continue;
							}
						} else {
							let e = K.measureFont(c), r = t.style.lineHeight || e.fontSize, i = {
								width: s,
								height: r,
								lineHeight: r,
								lines: [t.text]
							};
							o.fillStyle = J(t.style._fill, o, i, n * 2, T - n, v);
						}
						this._drawLetterSpacing(t.text, t.style, i, T, w + n - m, !1, C);
					}
					let l = Y(t.text);
					T += s + l * C;
				}
				v += b;
			}
		}
	}
	_setFillAndStrokeStyles(e, t, n, r, i, a = 0, o = 0) {
		if (e.fillStyle = t._fill ? J(t._fill, e, n, r * 2, a, o) : null, t._stroke?.width) {
			let s = i + r * 2;
			e.strokeStyle = J(t._stroke, e, n, s, a, o);
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
		if (K.experimentalLetterSpacingSupported && (K.experimentalLetterSpacing ? (s.letterSpacing = `${c}px`, s.textLetterSpacing = `${c}px`, l = !0) : (s.letterSpacing = "0px", s.textLetterSpacing = "0px")), (c === 0 || l) && o === 0) {
			a ? s.strokeText(e, r, i) : s.fillText(e, r, i);
			return;
		}
		if (o !== 0 && (c === 0 || l)) {
			let t = e.split(" "), n = r, c = s.measureText(" ").width;
			for (let e = 0; e < t.length; e++) a ? s.strokeText(t[e], n, i) : s.fillText(t[e], n, i), n += s.measureText(t[e]).width + c + o;
			return;
		}
		let u = r, d = K.graphemeSegmenter(e), f = s.measureText(e).width, p = 0;
		for (let e = 0; e < d.length; ++e) {
			let t = d[e];
			a ? s.strokeText(t, u, i) : s.fillText(t, u, i);
			let n = "";
			for (let t = e + 1; t < d.length; ++t) n += d[t];
			p = s.measureText(n).width, u += f - p + c, t === " " && (u += o), f = p;
		}
	}
}(), Z = class e extends v {
	constructor(t = {}) {
		super(), this.uid = l("textStyle"), this._tick = 0, this._cachedFontString = null, Be(t), t instanceof e && (t = t._toObject());
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
		return this._cachedFontString === null && (this._cachedFontString = q(this)), this._cachedFontString;
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
Z.defaultDropShadow = {
	alpha: 1,
	angle: Math.PI / 6,
	blur: 0,
	color: "black",
	distance: 5
}, Z.defaultTextStyle = {
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
var Q = Z;
function Be(e) {
	let t = e;
	if (typeof t.dropShadow == "boolean" && t.dropShadow) {
		let n = Q.defaultDropShadow;
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
function Ve(e, t) {
	let { texture: n, bounds: r } = e, i = t._style._getFinalPadding();
	x(r, t._anchor, n);
	let a = t._anchor._x * i * 2, o = t._anchor._y * i * 2;
	r.minX -= i - a, r.minY -= i - o, r.maxX -= i - a, r.maxY -= i - o;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/BatchableText.mjs
var He = class extends ee {}, Ue = class {
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
			(n.currentKey !== e.styleKey || e._resolution !== t) && this._updateGpuText(e), e._didTextUpdate = !1, Ve(n, e);
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
		let t = new He();
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
Ue.extension = {
	type: [
		_.WebGLPipes,
		_.WebGPUPipes,
		_.CanvasPipes
	],
	name: "text"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/shared/AbstractTextSystem.mjs
var We = class {
	constructor(e, t) {
		this._activeTextures = {}, this._renderer = e, this._retainCanvasContext = t;
	}
	getTexture(e, t, n, r) {
		typeof e == "string" && (g("8.0.0", "CanvasTextSystem.getTexture: Use object TextOptions instead of separate arguments"), e = {
			text: e,
			style: n,
			resolution: t
		}), e.style instanceof Q || (e.style = new Q(e.style)), e.textureStyle instanceof c || (e.textureStyle = new c(e.textureStyle)), typeof e.text != "string" && (e.text = e.text.toString());
		let { text: i, style: a, textureStyle: o, autoGenerateMipmaps: s } = e, l = e.resolution ?? this._renderer.resolution, { frame: u, canvasAndContext: d } = X.getCanvasAndContext({
			text: i,
			style: a,
			resolution: l
		}), f = S(d.canvas, u.width, u.height, l, s);
		if (o && (f.source.style = o), a.trim && (u.pad(a.padding), f.frame.copyFrom(u), f.frame.scale(1 / l), f.updateUvs()), a.filters) {
			let e = this._applyFilters(f, a.filters);
			return this.returnTexture(f), X.returnCanvasAndContext(d), e;
		}
		return this._renderer.texture.initSource(f._source), this._retainCanvasContext || X.returnCanvasAndContext(d), f;
	}
	returnTexture(e) {
		let t = e.source, r = t.resource;
		if (this._retainCanvasContext && r?.getContext) {
			let e = r.getContext("2d");
			e && X.returnCanvasAndContext({
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
}, Ge = class extends We {
	constructor(e) {
		super(e, !0);
	}
};
Ge.extension = {
	type: [_.CanvasSystem],
	name: "canvasText"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/shared/GpuTextSystem.mjs
var Ke = class extends We {
	constructor(e) {
		super(e, !1);
	}
};
Ke.extension = {
	type: [_.WebGLSystem, _.WebGPUSystem],
	name: "canvasText"
}, m.add(Ge), m.add(Ke), m.add(Ue);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/Text.mjs
var qe = class extends fe {
	constructor(...e) {
		let t = pe(e, "Text");
		super(t, Q), this.renderPipeId = "text", t.textureStyle && (this.textureStyle = t.textureStyle instanceof c ? t.textureStyle : new c(t.textureStyle)), this.autoGenerateMipmaps = t.autoGenerateMipmaps ?? s.defaultOptions.autoGenerateMipmaps;
	}
	updateBounds() {
		let e = this._bounds, t = this._anchor, n = 0, r = 0;
		if (this._style.trim) {
			let { frame: e, canvasAndContext: t } = X.getCanvasAndContext({
				text: this.text,
				style: this._style,
				resolution: 1
			});
			X.returnCanvasAndContext(t), n = e.width, r = e.height;
		} else {
			let e = K.measureText(this._text, this._style);
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
var $ = /^#[0-9a-f]{6}$/i, Je = /* @__PURE__ */ new Set([
	"none",
	"bandana",
	"visor",
	"crown",
	"headphones",
	"cape"
]), Ye = /* @__PURE__ */ new Set([
	"focused",
	"happy",
	"fierce",
	"sleepy"
]);
function Xe(e, t = "#38bdf8") {
	let n = e || {};
	return {
		name: String(n.name || "").slice(0, 24),
		species: String(n.species || "emberrat").replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "emberrat",
		color: $.test(n.color || "") ? n.color : t,
		accent: $.test(n.accent || "") ? n.accent : "#ffffff",
		trail: [
			"none",
			"dust",
			"spark",
			"rainbow"
		].includes(n.trail || "") ? n.trail : "none",
		accessory: Je.has(n.accessory) ? n.accessory : "none",
		expression: Ye.has(n.expression) ? n.expression : "focused"
	};
}
function Ze(e, t, n) {
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
function Qe(e, t) {
	let n = Math.max(240, e), r = Math.max(240, t), i = r > n, a = r < 520 || n < 520, o = r * (i ? .12 : a ? .09 : .11), s = r * (i ? .86 : a ? .91 : .89), c = n * (i ? .06 : .045), l = n * (i ? .94 : .955), u = s - o, d = Math.max(.58, Math.min(1.35, Math.min(n / 1050, r / 690)));
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
function $e(e, t, n) {
	let r = Math.max(1, n), i = Math.max(0, Math.min(r - 1, t));
	return e.laneTop + e.laneHeight * ((i + .5) / r);
}
function et(e, t) {
	let n = Math.max(0, Math.min(1, t));
	return e.trackLeft + e.trackWidth * n;
}
//#endregion
//#region src/arena/pixi-stage.ts
var tt = 594991, nt = 1451599, rt = 9157887, it = 12118271, at = class {
	app = new de();
	scenery = new b({ label: "scenery" });
	course = new b({ label: "course" });
	actors = new b({ label: "racers" });
	effects = new b({ label: "effects" });
	overlay = new b({ label: "overlay" });
	#e = new D({ label: "sky" });
	#t = new D({ label: "track" });
	#n = new D({ label: "lane-lines" });
	#r = new D({ label: "finish-line" });
	#i = new D({ label: "speed-lines" });
	#a = new D({ label: "leaderboard-panel" });
	#o = new qe({
		text: "",
		style: {
			fill: 16777215,
			fontFamily: "monospace",
			fontSize: 12,
			lineHeight: 16
		}
	});
	#s = new qe({
		text: "",
		style: {
			fill: 16777215,
			fontFamily: "sans-serif",
			fontSize: 56,
			fontWeight: "900",
			align: "center",
			stroke: {
				color: 463142,
				width: 7
			}
		}
	});
	#c = null;
	#l = Qe(1280, 720);
	#u = [];
	#d = /* @__PURE__ */ new Map();
	#f = null;
	async mount(e) {
		this.#c = e, await this.app.init({
			resizeTo: e,
			backgroundAlpha: 0,
			antialias: !0,
			autoDensity: !0,
			resolution: Math.min(window.devicePixelRatio || 1, 2),
			preference: "webgl"
		}), this.app.canvas.className = "arena-pixi-canvas", this.app.canvas.setAttribute("aria-hidden", "true"), e.appendChild(this.app.canvas), this.scenery.addChild(this.#e), this.course.addChild(this.#t, this.#n, this.#r), this.effects.addChild(this.#i), this.overlay.addChild(this.#a, this.#o, this.#s), this.app.stage.addChild(this.scenery, this.course, this.actors, this.effects, this.overlay), this.resize();
	}
	async setRacers(e) {
		this.#u = e, this.#d.clear(), this.actors.removeChildren();
		for (let t of e) {
			let e = new b({ label: `racer-${t.id}` });
			e.eventMode = "none";
			let n = Xe(t.pet, t.color), r = new D({ label: `trail-${n.trail}` }), i = new D().ellipse(0, 13, 22, 7).fill({
				color: 0,
				alpha: .34
			}), a = this.#_(n);
			a.label = `pet-${n.species}`, e.addChild(r, i, a), this.#d.set(t.id, {
				root: e,
				sprite: a,
				trail: r,
				trailKind: n.trail,
				accent: this.#v(n.accent)
			}), this.actors.addChild(e);
		}
		this.#p();
	}
	render(e) {
		this.#f = e;
		let t = e.state === "running" ? Math.min(1, e.heat / 3) : 0;
		this.#m(e.elapsedMs, t), this.#h(e);
		for (let t of e.racers) {
			let n = this.#d.get(t.id);
			if (!n) continue;
			let r = Ze(t.reaction, t.finished, e.state), i = Math.sin(e.elapsedMs * (r === "surge" ? .035 : .022) + t.lane);
			n.root.x = et(this.#l, t.progress), n.root.y = $e(this.#l, t.lane, this.#u.length), n.root.scale.set(this.#l.actorScale * (t.leading ? 1.08 : 1)), n.root.rotation = r === "stumble" ? -.18 : r === "jump" ? i * .1 : i * .035, n.root.alpha = e.state === "idle" ? .9 : 1, n.sprite.y = r === "run" || r === "surge" ? -Math.abs(i) * (r === "surge" ? 8 : 4) : r === "jump" ? -14 : r === "win" ? -Math.abs(i) * 10 : 0, n.sprite.scale.x = r === "stumble" ? 1.14 : r === "surge" ? 1.12 : 1, n.sprite.scale.y = r === "stumble" ? .78 : r === "jump" ? 1.12 : 1, this.#g(n, e.elapsedMs, r !== "idle");
		}
		let n = e.state === "running" ? t * Math.sin(e.elapsedMs * .055) * 2.2 : 0;
		this.course.y = n, this.actors.y = -n * .35;
	}
	resize() {
		this.app.resize(), this.#l = Qe(this.app.screen.width, this.app.screen.height), this.#p(), this.#f && this.render(this.#f);
	}
	destroy() {
		this.#d.clear(), this.#u = [], this.#f = null, this.app.destroy(!0, { children: !0 }), this.#c = null;
	}
	#p() {
		let e = this.#l;
		this.#e.clear().rect(0, 0, e.width, e.height).fill(tt), this.#t.clear().rect(0, e.laneTop, e.width, e.laneHeight).fill(nt), this.#n.clear();
		let t = Math.max(1, this.#u.length);
		for (let n = 1; n < t; n++) {
			let r = e.laneTop + e.laneHeight * (n / t);
			this.#n.moveTo(0, r).lineTo(e.width, r).stroke({
				color: rt,
				alpha: .13,
				width: 1
			});
		}
		this.#r.clear();
		let n = Math.max(7, Math.min(16, e.width / 72));
		for (let t = 0; t < Math.ceil(e.laneHeight / n); t++) for (let r = 0; r < 2; r++) this.#r.rect(e.trackRight - n + r * n, e.laneTop + t * n, n, n).fill({
			color: (t + r) % 2 ? 16777215 : 1120295,
			alpha: .95
		});
	}
	#m(e, t) {
		let n = this.#l, r = e * (.28 + t * .72) % Math.max(1, n.width);
		this.#i.clear();
		let i = Math.round(10 + t * 22);
		for (let e = 0; e < i; e++) {
			let i = (e * 97.3 % n.width - r + n.width) % n.width, a = n.laneTop + e * 53 % Math.max(1, n.laneHeight), o = 22 + e % 5 * 18 + t * 90;
			this.#i.moveTo(i, a).lineTo(i - o, a).stroke({
				color: it,
				alpha: .08 + t * .22,
				width: 1 + t * 2
			});
		}
	}
	#h(e) {
		let t = this.#l, n = new Map(this.#u.map((e) => [e.id, e])), r = [...e.racers].sort((e, t) => Number(t.finished) - Number(e.finished) || t.progress - e.progress || e.lane - t.lane), i = Math.min(t.portrait ? 148 : 190, t.width * .34), a = t.compact ? 9 : 11, o = t.compact ? 12 : 15;
		this.#a.clear().roundRect(8, 8, i, 12 * o + 32, 10).fill({
			color: 397351,
			alpha: .72
		}).stroke({
			color: 9157887,
			alpha: .3,
			width: 1
		}), this.#o.style.fontSize = a, this.#o.style.lineHeight = o, this.#o.x = 17, this.#o.y = 16, this.#o.text = ["LIVE ORDER", ...r.slice(0, 12).map((e, r) => {
			let i = n.get(e.id)?.name || `Racer ${e.lane + 1}`;
			return `${String(r + 1).padStart(2, " ")}  ${i.slice(0, t.portrait ? 12 : 17)}`;
		})].join("\n");
		let s = "";
		if ((e.countdownMs || 0) > 0) s = String(Math.max(1, Math.ceil(e.countdownMs / 1e3)));
		else if (e.state === "paused") s = "PAUSED";
		else if (e.state === "idle") s = "RACE OPEN";
		else if (e.state === "finished") {
			let t = n.get(e.winnerId ?? r[0]?.id ?? "");
			s = t ? `${t.name.toUpperCase()} WINS!` : "FINISH!";
		}
		this.#s.text = s, this.#s.style.fontSize = t.portrait ? 34 : t.compact ? 40 : 56, this.#s.anchor.set(.5), this.#s.x = t.width * .5, this.#s.y = t.height * (t.portrait ? .07 : .08);
	}
	#g(e, t, n) {
		if (e.trail.clear(), !n || e.trailKind === "none") return;
		let r = .65 + Math.sin(t * .02) * .2;
		if (e.trailKind === "dust") for (let t = 0; t < 3; t++) e.trail.circle(-22 - t * 10, 8 + t % 2 * 5, 4 + t).fill({
			color: 13149291,
			alpha: r * (.55 - t * .1)
		});
		else if (e.trailKind === "spark") for (let t = 0; t < 4; t++) e.trail.star(-20 - t * 11, t % 2 * 8, 4, 5, 2).fill({
			color: e.accent,
			alpha: r * (.8 - t * .12)
		});
		else e.trailKind === "rainbow" && [
			16731501,
			16765286,
			6547134,
			5090295,
			11638780
		].forEach((t, n) => e.trail.moveTo(-16, -8 + n * 4).lineTo(-70, -8 + n * 4).stroke({
			color: t,
			alpha: r * .75,
			width: 3
		}));
	}
	#_(e) {
		let t = this.#v(e.color), n = this.#v(e.accent), r = 0;
		for (let t of e.species) r = Math.imul(r, 31) + t.charCodeAt(0) >>> 0;
		let i = r % 4, a = new D({ label: `pet-body-${e.species}` });
		return i === 0 ? a.rect(-23, -35, 10, 15).rect(13, -35, 10, 15) : i === 1 ? a.poly([
			-25,
			-18,
			-17,
			-40,
			-7,
			-18
		]).poly([
			7,
			-18,
			17,
			-40,
			25,
			-18
		]) : i === 2 ? a.circle(-20, -22, 10).circle(20, -22, 10) : a.rect(-27, -26, 12, 10).rect(15, -26, 12, 10), a.fill(t).roundRect(-24, -24, 48, 38, 6).fill(t).rect(-18, 10, 12, 17).rect(6, 10, 12, 17).fill(t), e.expression === "sleepy" ? a.moveTo(-14, -10).lineTo(-5, -10).moveTo(5, -10).lineTo(14, -10).stroke({
			color: n,
			width: 3
		}) : e.expression === "happy" ? a.circle(-10, -10, 3).circle(10, -10, 3).fill(n).moveTo(-7, 1).quadraticCurveTo(0, 8, 7, 1).stroke({
			color: n,
			width: 3
		}) : a.rect(-14, -13, 7, 7).rect(7, -13, 7, 7).fill(n).rect(-6, 1, 12, 3).fill(n), e.accessory === "crown" ? a.poly([
			-17,
			-24,
			-17,
			-38,
			-7,
			-29,
			0,
			-42,
			8,
			-29,
			18,
			-38,
			18,
			-24
		]).fill(n) : e.accessory === "visor" ? a.rect(-19, -16, 38, 10).fill({
			color: n,
			alpha: .9
		}) : e.accessory === "bandana" ? a.rect(-24, 3, 48, 7).poly([
			13,
			10,
			24,
			22,
			7,
			15
		]).fill(n) : e.accessory === "cape" ? a.poly([
			-20,
			0,
			-36,
			28,
			0,
			25,
			10,
			2
		]).fill({
			color: n,
			alpha: .9
		}) : e.accessory === "headphones" && a.moveTo(-25, -8).arc(0, -8, 25, Math.PI, 0).stroke({
			color: n,
			width: 5
		}).rect(-29, -10, 7, 17).rect(22, -10, 7, 17).fill(n), a;
	}
	#v(e) {
		let t = Number.parseInt(e.replace("#", ""), 16);
		return Number.isFinite(t) ? t : 3718648;
	}
};
//#endregion
//#region src/arena/runtime.ts
async function ot(e, t) {
	if (!e) return null;
	let n = Array.from(e.children), r = new Map(n.map((e) => [e, e.style.visibility])), i = document.createElement("div");
	i.className = "arena-pixi-host", Object.assign(i.style, {
		position: "absolute",
		inset: "0",
		zIndex: "8",
		overflow: "hidden",
		pointerEvents: "none"
	}), getComputedStyle(e).position === "static" && (e.style.position = "relative"), e.appendChild(i);
	let a = new at();
	try {
		await a.mount(i), await a.setRacers(t);
		for (let e of n) e.style.visibility = "hidden";
		return e.classList.add("has-pixi-race"), {
			render: (e) => a.render(e),
			destroy: () => {
				a.destroy(), i.remove(), e.classList.remove("has-pixi-race");
				for (let e of n) e.style.visibility = r.get(e) || "";
			}
		};
	} catch (e) {
		console.warn("Pixi Arena unavailable; using DOM renderer", e);
		try {
			a.destroy();
		} catch {}
		return i.remove(), null;
	}
}
//#endregion
export { ot as createArenaRenderer };

//# sourceMappingURL=pixi-runtime.js.map
