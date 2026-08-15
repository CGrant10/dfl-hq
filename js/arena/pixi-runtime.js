import { B as e, D as t, M as n, N as r, O as i, P as a, R as o, T as s, V as c, a as l, f as u, g as d, h as f, i as p, j as m, k as h, l as g, m as _, n as v, o as y, p as b, r as x, s as S, t as C, u as w, v as T, w as E, x as D, y as O, z as k } from "./Geometry-BuU6bpP9.js";
import { a as ee, b as te, c as A, f as ne, i as re, n as j, o as M, r as ie, s as ae, u as oe, y as se } from "./Filter-N7Ki-nhd.js";
import { a as N, c as ce, i as P, n as le, o as ue, r as de, s as F, t as fe } from "./getPo2TextureFromSource-CZ557Jpw.js";
import { n as pe, r as I, t as L } from "./canvasUtils-Cdp1yAfY.js";
import { n as R, t as z } from "./Cache-B-iCL9EE.js";
import { a as me, c as he, d as ge, f as _e, i as ve, l as ye, m as B, n as be, o as xe, p as Se, r as Ce, s as we, t as Te, u as Ee } from "./RenderTargetSystem-CrhszbVu.js";
import { a as De, c as Oe, i as ke, l as Ae, n as je, o as Me, r as Ne, s as Pe, t as V, u as Fe } from "./GraphicsContext-BHsh_V8F.js";
import { t as Ie } from "./getTextureBatchBindGroup-C7xV-oD7.js";
import { a as Le, c as Re, d as ze, f as Be, i as Ve, l as He, m as Ue, o as We, p as Ge, r as Ke, s as qe, t as H, u as Je } from "./GCManagedHash-E8AM71m2.js";
import { t as Ye } from "./CanvasPool-BzNdDEgL.js";
import { a as Xe, c as Ze, d as Qe, f as $e, i as et, l as tt, n as nt, o as rt, p as it, r as at, s as ot, t as st, u as ct } from "./BufferResource-Cmip23Jt.js";
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/environment-browser/browserExt.mjs
var lt = {
	extension: {
		type: k.Environment,
		name: "browser",
		priority: -1
	},
	test: () => !0,
	load: async () => {
		await import("./browserAll-1dLtaakP.js");
	}
}, ut = {
	extension: {
		type: k.Environment,
		name: "webworker",
		priority: 0
	},
	test: () => typeof self < "u" && self.WorkerGlobalScope !== void 0,
	load: async () => {
		await import("./webworkerAll-BPJnmyQj.js");
	}
}, dt;
function ft(e) {
	return dt === void 0 && (dt = (() => {
		let t = {
			stencil: !0,
			failIfMajorPerformanceCaveat: e ?? Se.defaultOptions.failIfMajorPerformanceCaveat
		};
		try {
			if (!b.get().getWebGLRenderingContext()) return !1;
			let e = b.get().createCanvas().getContext("webgl", t), n = !!e?.getContextAttributes()?.stencil;
			if (e) {
				let t = e.getExtension("WEBGL_lose_context");
				t && t.loseContext();
			}
			return e = null, n;
		} catch {
			return !1;
		}
	})()), dt;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/utils/browser/isWebGPUSupported.mjs
var pt;
async function mt(e = {}) {
	return pt === void 0 && (pt = await (async () => {
		let t = b.get().getNavigator().gpu;
		if (!t) return !1;
		try {
			return await (await t.requestAdapter(e)).requestDevice(), !0;
		} catch {
			return !1;
		}
	})()), pt;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/autoDetectRenderer.mjs
var ht = [
	"webgl",
	"webgpu",
	"canvas"
];
async function gt(e) {
	let t = [];
	e.preference ? Array.isArray(e.preference) ? t = e.preference.slice() : (t.push(e.preference), ht.forEach((n) => {
		n !== e.preference && t.push(n);
	})) : t = ht.slice();
	let n, r = {};
	for (let i = 0; i < t.length; i++) {
		let a = t[i];
		if (a === "webgpu" && await mt()) {
			let { WebGPURenderer: t } = await Promise.resolve().then(() => ns);
			n = t, r = {
				...e,
				...e.webgpu
			};
			break;
		}
		if (a === "webgl" && ft(e.failIfMajorPerformanceCaveat ?? Se.defaultOptions.failIfMajorPerformanceCaveat)) {
			let { WebGLRenderer: t } = await Promise.resolve().then(() => lo);
			n = t, r = {
				...e,
				...e.webgl
			};
			break;
		}
		if (a === "canvas") {
			let { CanvasRenderer: t } = await Promise.resolve().then(() => Ei);
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
var _t = class {
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
_t.extension = k.Application;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/app/TickerPlugin.mjs
var vt = class {
	static init(e) {
		e = Object.assign({
			autoStart: !0,
			sharedTicker: !1
		}, e), Object.defineProperty(this, "ticker", {
			configurable: !0,
			set(e) {
				this._ticker && this._ticker.remove(this.render, this), this._ticker = e, e && e.add(this.render, this, re.LOW);
			},
			get() {
				return this._ticker;
			}
		}), this.stop = () => {
			this._ticker.stop();
		}, this.start = () => {
			this._ticker.start();
		}, this._ticker = null, this.ticker = e.sharedTicker ? ie.shared : new ie(), e.autoStart && this.start();
	}
	static destroy() {
		if (this._ticker) {
			let e = this._ticker;
			this.ticker = null, e.destroy();
		}
	}
};
vt.extension = k.Application, e.add(_t), e.add(vt);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/app/Application.mjs
var yt = class e {
	constructor(...e) {
		this.stage = new A(), e[0] !== void 0 && i(h, "Application constructor options are deprecated, please use Application.init() instead.");
	}
	async init(t) {
		t = { ...t }, this.stage ||= new A(), this.renderer = await gt(t), e._plugins.forEach((e) => {
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
		return i(h, "Application.view is deprecated, please use Application.canvas instead."), this.renderer.canvas;
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
yt._plugins = [];
var bt = yt;
e.handleByList(k.Application, bt._plugins), e.add(_e);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text-bitmap/asset/bitmapFontTextParser.mjs
var xt = {
	test(e) {
		return typeof e == "string" && e.startsWith("info face=");
	},
	parse(e) {
		let t = e.match(/^[a-z]+\s+.+$/gm), n = {
			info: [],
			common: [],
			page: [],
			char: [],
			chars: [],
			kerning: [],
			kernings: [],
			distanceField: []
		};
		for (let e in t) {
			let r = t[e].match(/^[a-z]+/gm)[0], i = t[e].match(/[a-zA-Z]+=([^\s"']+|"([^"]*)")/gm), a = {};
			for (let e in i) {
				let t = i[e].split("="), n = t[0], r = t[1].replace(/"/gm, ""), o = parseFloat(r);
				a[n] = isNaN(o) ? r : o;
			}
			n[r].push(a);
		}
		let r = {
			chars: {},
			pages: [],
			lineHeight: 0,
			fontSize: 0,
			fontFamily: "",
			distanceField: null,
			baseLineOffset: 0
		}, [i] = n.info, [a] = n.common, [o] = n.distanceField ?? [];
		o && (r.distanceField = {
			range: parseInt(o.distanceRange, 10),
			type: o.fieldType
		}), r.fontSize = parseInt(i.size, 10), r.fontFamily = i.face, r.lineHeight = parseInt(a.lineHeight, 10);
		let s = n.page;
		for (let e = 0; e < s.length; e++) r.pages.push({
			id: parseInt(s[e].id, 10) || 0,
			file: s[e].file
		});
		let c = {};
		r.baseLineOffset = r.lineHeight - parseInt(a.base, 10);
		let l = n.char;
		for (let e = 0; e < l.length; e++) {
			let t = l[e], n = parseInt(t.id, 10), i = t.letter ?? t.char ?? String.fromCharCode(n);
			i === "space" && (i = " "), c[n] = i, r.chars[i] = {
				id: n,
				page: parseInt(t.page, 10) || 0,
				x: parseInt(t.x, 10),
				y: parseInt(t.y, 10),
				width: parseInt(t.width, 10),
				height: parseInt(t.height, 10),
				xOffset: parseInt(t.xoffset, 10),
				yOffset: parseInt(t.yoffset, 10),
				xAdvance: parseInt(t.xadvance, 10),
				kerning: {}
			};
		}
		let u = n.kerning || [];
		for (let e = 0; e < u.length; e++) {
			let t = parseInt(u[e].first, 10), n = parseInt(u[e].second, 10), i = parseInt(u[e].amount, 10);
			r.chars[c[n]] && (r.chars[c[n]].kerning[c[t]] = i);
		}
		return r;
	}
}, St = {
	test(e) {
		let t = e;
		return typeof t != "string" && "getElementsByTagName" in t && t.getElementsByTagName("page").length && t.getElementsByTagName("info")[0].getAttribute("face") !== null;
	},
	parse(e) {
		let t = {
			chars: {},
			pages: [],
			lineHeight: 0,
			fontSize: 0,
			fontFamily: "",
			distanceField: null,
			baseLineOffset: 0
		}, n = e.getElementsByTagName("info")[0], r = e.getElementsByTagName("common")[0], i = e.getElementsByTagName("distanceField")[0];
		i && (t.distanceField = {
			type: i.getAttribute("fieldType"),
			range: parseInt(i.getAttribute("distanceRange"), 10)
		});
		let a = e.getElementsByTagName("page"), o = e.getElementsByTagName("char"), s = e.getElementsByTagName("kerning");
		t.fontSize = parseInt(n.getAttribute("size"), 10), t.fontFamily = n.getAttribute("face"), t.lineHeight = parseInt(r.getAttribute("lineHeight"), 10);
		for (let e = 0; e < a.length; e++) t.pages.push({
			id: parseInt(a[e].getAttribute("id"), 10) || 0,
			file: a[e].getAttribute("file")
		});
		let c = {};
		t.baseLineOffset = t.lineHeight - parseInt(r.getAttribute("base"), 10);
		for (let e = 0; e < o.length; e++) {
			let n = o[e], r = parseInt(n.getAttribute("id"), 10), i = n.getAttribute("letter") ?? n.getAttribute("char") ?? String.fromCharCode(r);
			i === "space" && (i = " "), c[r] = i, t.chars[i] = {
				id: r,
				page: parseInt(n.getAttribute("page"), 10) || 0,
				x: parseInt(n.getAttribute("x"), 10),
				y: parseInt(n.getAttribute("y"), 10),
				width: parseInt(n.getAttribute("width"), 10),
				height: parseInt(n.getAttribute("height"), 10),
				xOffset: parseInt(n.getAttribute("xoffset"), 10),
				yOffset: parseInt(n.getAttribute("yoffset"), 10),
				xAdvance: parseInt(n.getAttribute("xadvance"), 10),
				kerning: {}
			};
		}
		for (let e = 0; e < s.length; e++) {
			let n = parseInt(s[e].getAttribute("first"), 10), r = parseInt(s[e].getAttribute("second"), 10), i = parseInt(s[e].getAttribute("amount"), 10);
			t.chars[c[r]] && (t.chars[c[r]].kerning[c[n]] = i);
		}
		return t;
	}
}, Ct = {
	test(e) {
		return typeof e == "string" && e.match(/<font(\s|>)/) ? St.test(b.get().parseXML(e)) : !1;
	},
	parse(e) {
		return St.parse(b.get().parseXML(e));
	}
}, wt = [".xml", ".fnt"], Tt = {
	extension: {
		type: k.CacheParser,
		name: "cacheBitmapFont"
	},
	test: (e) => !!e?.pages && !!e?.chars && typeof e?.fontFamily == "string" && e.fontFamily !== "",
	getCacheableAssets(e, t) {
		let n = {};
		return e.forEach((e) => {
			n[e] = t, n[`${e}-bitmap`] = t;
		}), n[`${t.fontFamily}-bitmap`] = t, n;
	}
}, Et = {
	extension: {
		type: k.LoadParser,
		priority: ue.Normal
	},
	name: "loadBitmapFont",
	id: "bitmap-font",
	test(e) {
		return wt.includes(N.extname(e).toLowerCase());
	},
	async testParse(e) {
		return xt.test(e) || Ct.test(e);
	},
	async parse(e, t, n) {
		let r = xt.test(e) ? xt.parse(e) : Ct.parse(e), { src: i } = t, { pages: a } = r, o = [], s = r.distanceField ? {
			scaleMode: "linear",
			alphaMode: "premultiply-alpha-on-upload",
			autoGenerateMipmaps: !1,
			resolution: 1
		} : {};
		for (let e = 0; e < a.length; ++e) {
			let t = a[e].file, n = N.join(N.dirname(i), t);
			n = le(n, i), o.push({
				src: n,
				data: s
			});
		}
		let [c, { BitmapFont: l }] = await Promise.all([n.load(o), Promise.resolve().then(() => us)]);
		return new l({
			data: r,
			textures: o.map((e) => c[e.src])
		}, i);
	},
	async load(e, t) {
		return await (await b.get().fetch(e)).text();
	},
	async unload(e, t, n) {
		await Promise.all(e.pages.map((e) => n.unload(e.texture.source._sourceOrigin))), e.destroy();
	}
}, Dt = class {
	constructor(e, t = !1) {
		this._loader = e, this._assetList = [], this._isLoading = !1, this._maxConcurrent = 1, this.verbose = t;
	}
	add(e) {
		e.forEach((e) => {
			this._assetList.push(e);
		}), this.verbose && console.log("[BackgroundLoader] assets: ", this._assetList), this._isActive && !this._isLoading && this._next();
	}
	async _next() {
		if (this._assetList.length && this._isActive) {
			this._isLoading = !0;
			let e = [], t = Math.min(this._assetList.length, this._maxConcurrent);
			for (let n = 0; n < t; n++) e.push(this._assetList.pop());
			await this._loader.load(e), this._isLoading = !1, this._next();
		}
	}
	get active() {
		return this._isActive;
	}
	set active(e) {
		this._isActive !== e && (this._isActive = e, e && !this._isLoading && this._next());
	}
}, Ot = {
	extension: {
		type: k.CacheParser,
		name: "cacheTextureArray"
	},
	test: (e) => Array.isArray(e) && e.every((e) => e instanceof D),
	getCacheableAssets: (e, t) => {
		let n = {};
		return e.forEach((e) => {
			t.forEach((t, r) => {
				n[e + (r === 0 ? "" : r + 1)] = t;
			});
		}), n;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/assets/detections/utils/testImageFormat.mjs
async function kt(e) {
	if ("Image" in globalThis) return new Promise((t) => {
		let n = new Image();
		n.onload = () => {
			t(!0);
		}, n.onerror = () => {
			t(!1);
		}, n.src = e;
	});
	if ("createImageBitmap" in globalThis && "fetch" in globalThis) {
		try {
			let t = await (await fetch(e)).blob();
			await createImageBitmap(t);
		} catch {
			return !1;
		}
		return !0;
	}
	return !1;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/assets/detections/parsers/detectAvif.mjs
var At = {
	extension: {
		type: k.DetectionParser,
		priority: 1
	},
	test: async () => kt("data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A="),
	add: async (e) => [...e, "avif"],
	remove: async (e) => e.filter((e) => e !== "avif")
}, jt = [
	"png",
	"jpg",
	"jpeg"
], Mt = {
	extension: {
		type: k.DetectionParser,
		priority: -1
	},
	test: () => Promise.resolve(!0),
	add: async (e) => [...e, ...jt],
	remove: async (e) => e.filter((e) => !jt.includes(e))
}, Nt = "WorkerGlobalScope" in globalThis && globalThis instanceof globalThis.WorkerGlobalScope;
function Pt(e) {
	return !Nt && document.createElement("video").canPlayType(e) !== "";
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/assets/detections/parsers/detectMp4.mjs
var Ft = {
	extension: {
		type: k.DetectionParser,
		priority: 0
	},
	test: async () => Pt("video/mp4"),
	add: async (e) => [
		...e,
		"mp4",
		"m4v"
	],
	remove: async (e) => e.filter((e) => e !== "mp4" && e !== "m4v")
}, It = {
	extension: {
		type: k.DetectionParser,
		priority: 0
	},
	test: async () => Pt("video/ogg"),
	add: async (e) => [...e, "ogv"],
	remove: async (e) => e.filter((e) => e !== "ogv")
}, Lt = {
	extension: {
		type: k.DetectionParser,
		priority: 0
	},
	test: async () => Pt("video/webm"),
	add: async (e) => [...e, "webm"],
	remove: async (e) => e.filter((e) => e !== "webm")
}, Rt = {
	extension: {
		type: k.DetectionParser,
		priority: 0
	},
	test: async () => kt("data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA="),
	add: async (e) => [...e, "webp"],
	remove: async (e) => e.filter((e) => e !== "webp")
}, zt = class e {
	constructor() {
		this.loadOptions = { ...e.defaultOptions }, this._parsers = [], this._parsersValidated = !1, this.parsers = new Proxy(this._parsers, { set: (e, t, n) => (this._parsersValidated = !1, e[t] = n, !0) }), this.promiseCache = {};
	}
	reset() {
		this._parsersValidated = !1, this.promiseCache = {};
	}
	_getLoadPromiseAndParser(e, t) {
		let n = {
			promise: null,
			parser: null
		};
		return n.promise = (async () => {
			let r = null, i = null;
			if ((t.parser || t.loadParser) && (i = this._parserHash[t.parser || t.loadParser], t.loadParser && T(`[Assets] "loadParser" is deprecated, use "parser" instead for ${e}`), i || T(`[Assets] specified load parser "${t.parser || t.loadParser}" not found while loading ${e}`)), !i) {
				for (let n = 0; n < this.parsers.length; n++) {
					let r = this.parsers[n];
					if (r.load && r.test?.(e, t, this)) {
						i = r;
						break;
					}
				}
				if (!i) return T(`[Assets] ${e} could not be loaded as we don't know how to parse it, ensure the correct parser has been added`), null;
			}
			r = await i.load(e, t, this), n.parser = i;
			for (let e = 0; e < this.parsers.length; e++) {
				let i = this.parsers[e];
				i.parse && i.parse && await i.testParse?.(r, t, this) && (r = await i.parse(r, t, this) || r, n.parser = i);
			}
			return r;
		})(), n;
	}
	async load(t, n) {
		this._parsersValidated || this._validateParsers();
		let { onProgress: r, onError: i, strategy: a, retryCount: o, retryDelay: s } = typeof n == "function" ? {
			...e.defaultOptions,
			...this.loadOptions,
			onProgress: n
		} : {
			...e.defaultOptions,
			...this.loadOptions,
			...n || {}
		}, c = 0, l = {}, u = P(t), d = R(t, (e) => ({
			alias: [e],
			src: e,
			data: {}
		})), f = d.reduce((e, t) => e + (t.progressSize || 1), 0), p = d.map(async (e) => {
			let t = N.toAbsolute(e.src);
			l[e.src] || (await this._loadAssetWithRetry(t, e, {
				onProgress: r,
				onError: i,
				strategy: a,
				retryCount: o,
				retryDelay: s
			}, l), c += e.progressSize || 1, r && r(c / f));
		});
		return await Promise.all(p), u ? l[d[0].src] : l;
	}
	async unload(e) {
		let t = R(e, (e) => ({
			alias: [e],
			src: e
		})).map(async (e) => {
			let t = N.toAbsolute(e.src), n = this.promiseCache[t];
			if (n) {
				let r = await n.promise;
				delete this.promiseCache[t], await n.parser?.unload?.(r, e, this);
			}
		});
		await Promise.all(t);
	}
	_validateParsers() {
		this._parsersValidated = !0, this._parserHash = this._parsers.filter((e) => e.name || e.id).reduce((e, t) => (!t.name && !t.id ? T("[Assets] parser should have an id") : (e[t.name] || e[t.id]) && T(`[Assets] parser id conflict "${t.id}"`), e[t.name] = t, t.id && (e[t.id] = t), e), {});
	}
	async _loadAssetWithRetry(e, t, n, r) {
		let i = 0, { onError: a, strategy: o, retryCount: s, retryDelay: c } = n, l = (e) => new Promise((t) => setTimeout(t, e));
		for (;;) try {
			this.promiseCache[e] || (this.promiseCache[e] = this._getLoadPromiseAndParser(e, t)), r[t.src] = await this.promiseCache[e].promise;
			return;
		} catch (n) {
			if (delete this.promiseCache[e], delete r[t.src], i++, o === "retry" && !(o !== "retry" || i > s)) {
				a && a(n, t), await l(c);
				continue;
			}
			if (o === "skip") {
				a && a(n, t);
				return;
			}
			a && a(n, t);
			let u = /* @__PURE__ */ Error(`[Loader.load] Failed to load ${e}.
${n}`);
			throw n instanceof Error && n.stack && (u.stack = n.stack), u;
		}
	}
};
zt.defaultOptions = {
	onProgress: void 0,
	onError: void 0,
	strategy: "throw",
	retryCount: 3,
	retryDelay: 250
};
var Bt = zt;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/assets/utils/checkDataUrl.mjs
function Vt(e, t) {
	if (Array.isArray(t)) {
		for (let n of t) if (e.startsWith(`data:${n}`)) return !0;
		return !1;
	}
	return e.startsWith(`data:${t}`);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/assets/utils/checkExtension.mjs
function Ht(e, t) {
	let n = e.split("?")[0], r = N.extname(n).toLowerCase();
	return Array.isArray(t) ? t.includes(r) : r === t;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/assets/loader/parsers/loadJson.mjs
var Ut = ".json", Wt = "application/json", Gt = {
	extension: {
		type: k.LoadParser,
		priority: ue.Low
	},
	name: "loadJson",
	id: "json",
	test(e) {
		return Vt(e, Wt) || Ht(e, Ut);
	},
	async load(e) {
		return await (await b.get().fetch(e)).json();
	}
}, Kt = ".txt", qt = "text/plain", Jt = {
	name: "loadTxt",
	id: "text",
	extension: {
		type: k.LoadParser,
		priority: ue.Low,
		name: "loadTxt"
	},
	test(e) {
		return Vt(e, qt) || Ht(e, Kt);
	},
	async load(e) {
		return await (await b.get().fetch(e)).text();
	}
}, Yt = [
	"normal",
	"bold",
	"100",
	"200",
	"300",
	"400",
	"500",
	"600",
	"700",
	"800",
	"900"
], Xt = [
	".ttf",
	".otf",
	".woff",
	".woff2"
], Zt = [
	"font/ttf",
	"font/otf",
	"font/woff",
	"font/woff2"
], Qt = /^(--|-?[A-Z_])[0-9A-Z_-]*$/i;
function $t(e) {
	let t = N.extname(e), n = N.basename(e, t).replace(/(-|_)/g, " ").toLowerCase().split(" ").map((e) => e.charAt(0).toUpperCase() + e.slice(1)), r = n.length > 0;
	for (let e of n) if (!e.match(Qt)) {
		r = !1;
		break;
	}
	let i = n.join(" ");
	return r || (i = `"${i.replace(/[\\"]/g, "\\$&")}"`), i;
}
var en = /^[0-9A-Za-z%:/?#\[\]@!\$&'()\*\+,;=\-._~]*$/;
function tn(e) {
	return en.test(e) ? e : encodeURI(e);
}
var nn = {
	extension: {
		type: k.LoadParser,
		priority: ue.Low
	},
	name: "loadWebFont",
	id: "web-font",
	test(e) {
		return Vt(e, Zt) || Ht(e, Xt);
	},
	async load(e, t) {
		let n = b.get().getFontFaceSet();
		if (n) {
			let r = [], i = t.data?.family ?? $t(e), a = t.data?.weights?.filter((e) => Yt.includes(e)) ?? ["normal"], o = t.data ?? {};
			for (let t = 0; t < a.length; t++) {
				let s = a[t], c = new FontFace(i, `url('${tn(e)}')`, {
					...o,
					weight: s
				});
				await c.load(), n.add(c), r.push(c);
			}
			return z.has(`${i}-and-url`) ? z.get(`${i}-and-url`).entries.push({
				url: e,
				faces: r
			}) : z.set(`${i}-and-url`, { entries: [{
				url: e,
				faces: r
			}] }), r.length === 1 ? r[0] : r;
		}
		return T("[loadWebFont] FontFace API is not supported. Skipping loading font"), null;
	},
	unload(e) {
		let t = Array.isArray(e) ? e : [e], n = t[0].family, r = z.get(`${n}-and-url`), i = r.entries.find((e) => e.faces.some((e) => t.indexOf(e) !== -1));
		i.faces = i.faces.filter((e) => t.indexOf(e) === -1), i.faces.length === 0 && (r.entries = r.entries.filter((e) => e !== i)), t.forEach((e) => {
			b.get().getFontFaceSet().delete(e);
		}), r.entries.length === 0 && z.remove(`${n}-and-url`);
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/utils/network/getResolutionOfUrl.mjs
function rn(e, t = 1) {
	let n = de.RETINA_PREFIX?.exec(e);
	return n ? parseFloat(n[1]) : t;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/assets/loader/parsers/textures/utils/createTexture.mjs
function an(e, t, n) {
	e.label = n, e._sourceOrigin = n;
	let r = new D({
		source: e,
		label: n
	}), i = () => {
		delete t.promiseCache[n], z.has(n) && z.remove(n);
	};
	return r.source.once("destroy", () => {
		t.promiseCache[n] && (T("[Assets] A TextureSource managed by Assets was destroyed instead of unloaded! Use Assets.unload() instead of destroying the TextureSource."), i());
	}), r.once("destroy", () => {
		e.destroyed || (T("[Assets] A Texture managed by Assets was destroyed instead of unloaded! Use Assets.unload() instead of destroying the Texture."), i());
	}), r;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/assets/loader/parsers/textures/loadSVG.mjs
var on = ".svg", sn = "image/svg+xml", cn = {
	extension: {
		type: k.LoadParser,
		priority: ue.Low,
		name: "loadSVG"
	},
	name: "loadSVG",
	id: "svg",
	config: {
		crossOrigin: "anonymous",
		parseAsGraphicsContext: !1
	},
	test(e) {
		return Vt(e, sn) || Ht(e, on);
	},
	async load(e, t, n) {
		return t.data?.parseAsGraphicsContext ?? this.config.parseAsGraphicsContext ? un(e) : ln(e, t, n, this.config.crossOrigin);
	},
	unload(e) {
		e.destroy(!0);
	}
};
async function ln(e, t, n, r) {
	let i = await b.get().fetch(e), a = b.get().createImage();
	a.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(await i.text())}`, a.crossOrigin = r, await a.decode();
	let o = t.data?.width ?? a.width, s = t.data?.height ?? a.height, c = t.data?.resolution || rn(e), l = Math.ceil(o * c), u = Math.ceil(s * c), d = b.get().createCanvas(l, u), f = d.getContext("2d");
	f.imageSmoothingEnabled = !0, f.imageSmoothingQuality = "high", f.drawImage(a, 0, 0, o * c, s * c);
	let { parseAsGraphicsContext: p, ...m } = t.data ?? {};
	return an(new I({
		resource: d,
		alphaMode: "premultiply-alpha-on-upload",
		resolution: c,
		...m
	}), n, e);
}
async function un(e) {
	let t = await (await b.get().fetch(e)).text(), n = new V();
	return n.svg(t), n;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/_virtual/checkImageBitmap.worker.mjs
var dn = "(function () {\n    'use strict';\n\n    const WHITE_PNG = \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=\";\n    async function checkImageBitmap() {\n      try {\n        if (typeof createImageBitmap !== \"function\") return false;\n        const response = await fetch(WHITE_PNG);\n        const imageBlob = await response.blob();\n        const imageBitmap = await createImageBitmap(imageBlob);\n        return imageBitmap.width === 1 && imageBitmap.height === 1;\n      } catch (_e) {\n        return false;\n      }\n    }\n    void checkImageBitmap().then((result) => {\n      self.postMessage(result);\n    });\n\n})();\n", fn = null, pn = class {
	constructor() {
		fn ||= URL.createObjectURL(new Blob([dn], { type: "application/javascript" })), this.worker = new Worker(fn);
	}
};
pn.revokeObjectURL = function() {
	fn &&= (URL.revokeObjectURL(fn), null);
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/_virtual/loadImageBitmap.worker.mjs
var mn = "(function () {\n    'use strict';\n\n    async function loadImageBitmap(url, alphaMode) {\n      const response = await fetch(url);\n      if (!response.ok) {\n        throw new Error(`[WorkerManager.loadImageBitmap] Failed to fetch ${url}: ${response.status} ${response.statusText}`);\n      }\n      const imageBlob = await response.blob();\n      return alphaMode === \"premultiplied-alpha\" ? createImageBitmap(imageBlob, { premultiplyAlpha: \"none\" }) : createImageBitmap(imageBlob);\n    }\n    self.onmessage = async (event) => {\n      try {\n        const imageBitmap = await loadImageBitmap(event.data.data[0], event.data.data[1]);\n        self.postMessage({\n          data: imageBitmap,\n          uuid: event.data.uuid,\n          id: event.data.id\n        }, [imageBitmap]);\n      } catch (e) {\n        self.postMessage({\n          error: e,\n          uuid: event.data.uuid,\n          id: event.data.id\n        });\n      }\n    };\n\n})();\n", hn = null, gn = class {
	constructor() {
		hn ||= URL.createObjectURL(new Blob([mn], { type: "application/javascript" })), this.worker = new Worker(hn);
	}
};
gn.revokeObjectURL = function() {
	hn &&= (URL.revokeObjectURL(hn), null);
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/assets/loader/workers/WorkerManager.mjs
var _n = 0, vn, yn = new class {
	constructor() {
		this._initialized = !1, this._createdWorkers = 0, this._workerPool = [], this._queue = [], this._resolveHash = {};
	}
	isImageBitmapSupported() {
		return this._isImageBitmapSupported === void 0 && (this._isImageBitmapSupported = new Promise((e) => {
			let { worker: t } = new pn();
			t.addEventListener("message", (n) => {
				t.terminate(), pn.revokeObjectURL(), e(n.data);
			});
		})), this._isImageBitmapSupported;
	}
	loadImageBitmap(e, t) {
		return this._run("loadImageBitmap", [e, t?.data?.alphaMode]);
	}
	async _initWorkers() {
		this._initialized ||= !0;
	}
	_getWorker() {
		vn === void 0 && (vn = navigator.hardwareConcurrency || 4);
		let e = this._workerPool.pop();
		return !e && this._createdWorkers < vn && (this._createdWorkers++, e = new gn().worker, e.addEventListener("message", (e) => {
			this._complete(e.data), this._returnWorker(e.target), this._next();
		})), e;
	}
	_returnWorker(e) {
		this._workerPool.push(e);
	}
	_complete(e) {
		this._resolveHash[e.uuid] && (e.error === void 0 ? this._resolveHash[e.uuid].resolve(e.data) : this._resolveHash[e.uuid].reject(e.error), delete this._resolveHash[e.uuid]);
	}
	async _run(e, t) {
		await this._initWorkers();
		let n = new Promise((n, r) => {
			this._queue.push({
				id: e,
				arguments: t,
				resolve: n,
				reject: r
			});
		});
		return this._next(), n;
	}
	_next() {
		if (!this._queue.length) return;
		let e = this._getWorker();
		if (!e) return;
		let t = this._queue.pop(), n = t.id;
		this._resolveHash[_n] = {
			resolve: t.resolve,
			reject: t.reject
		}, e.postMessage({
			data: t.arguments,
			uuid: _n++,
			id: n
		});
	}
	reset() {
		this._workerPool.forEach((e) => e.terminate()), this._workerPool.length = 0, Object.values(this._resolveHash).forEach(({ reject: e }) => {
			e?.(/* @__PURE__ */ Error("WorkerManager has been reset before completion"));
		}), this._resolveHash = {}, this._queue.length = 0, this._initialized = !1, this._createdWorkers = 0;
	}
}(), bn = [
	".jpeg",
	".jpg",
	".png",
	".webp",
	".avif"
], xn = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/avif"
];
async function Sn(e, t) {
	let n = await b.get().fetch(e);
	if (!n.ok) throw Error(`[loadImageBitmap] Failed to fetch ${e}: ${n.status} ${n.statusText}`);
	let r = await n.blob();
	return t?.data?.alphaMode === "premultiplied-alpha" ? createImageBitmap(r, { premultiplyAlpha: "none" }) : createImageBitmap(r);
}
var Cn = {
	name: "loadTextures",
	id: "texture",
	extension: {
		type: k.LoadParser,
		priority: ue.High,
		name: "loadTextures"
	},
	config: {
		preferWorkers: !0,
		preferCreateImageBitmap: !0,
		crossOrigin: "anonymous"
	},
	test(e) {
		return Vt(e, xn) || Ht(e, bn);
	},
	async load(e, t, n) {
		let r = null;
		return r = globalThis.createImageBitmap && this.config.preferCreateImageBitmap ? this.config.preferWorkers && await yn.isImageBitmapSupported() ? await yn.loadImageBitmap(e, t) : await Sn(e, t) : await new Promise((t, n) => {
			r = b.get().createImage(), r.crossOrigin = this.config.crossOrigin, r.src = e, r.complete ? t(r) : (r.onload = () => {
				t(r);
			}, r.onerror = n);
		}), an(new I({
			resource: r,
			alphaMode: "premultiply-alpha-on-upload",
			resolution: t.data?.resolution || rn(e),
			...t.data
		}), n, e);
	},
	unload(e) {
		e.destroy(!0);
	}
}, wn = [
	".mp4",
	".m4v",
	".webm",
	".ogg",
	".ogv",
	".h264",
	".avi",
	".mov"
], Tn, En;
function Dn(e, t, n) {
	n === void 0 && !t.startsWith("data:") ? e.crossOrigin = kn(t) : n !== !1 && (e.crossOrigin = typeof n == "string" ? n : "anonymous");
}
function On(e) {
	return new Promise((t, n) => {
		e.addEventListener("canplaythrough", r), e.addEventListener("error", i), e.load();
		function r() {
			a(), t();
		}
		function i(e) {
			a(), n(e);
		}
		function a() {
			e.removeEventListener("canplaythrough", r), e.removeEventListener("error", i);
		}
	});
}
function kn(e, t = globalThis.location) {
	if (e.startsWith("data:")) return "";
	t ||= globalThis.location;
	let n = new URL(e, document.baseURI);
	return n.hostname !== t.hostname || n.port !== t.port || n.protocol !== t.protocol ? "anonymous" : "";
}
function An() {
	let e = [], t = [];
	for (let n of wn) {
		let r = F.MIME_TYPES[n.substring(1)] || `video/${n.substring(1)}`;
		Pt(r) && (e.push(n), t.includes(r) || t.push(r));
	}
	return {
		validVideoExtensions: e,
		validVideoMime: t
	};
}
var jn = {
	name: "loadVideo",
	id: "video",
	extension: {
		type: k.LoadParser,
		name: "loadVideo"
	},
	test(e) {
		if (!Tn || !En) {
			let { validVideoExtensions: e, validVideoMime: t } = An();
			Tn = e, En = t;
		}
		let t = Vt(e, En), n = Ht(e, Tn);
		return t || n;
	},
	async load(e, t, n) {
		let r = {
			...F.defaultOptions,
			resolution: t.data?.resolution || rn(e),
			alphaMode: t.data?.alphaMode || await ce(),
			...t.data
		}, i = document.createElement("video"), a = {
			preload: r.autoLoad === !1 ? void 0 : "auto",
			"webkit-playsinline": r.playsinline === !1 ? void 0 : "",
			playsinline: r.playsinline === !1 ? void 0 : "",
			muted: r.muted === !0 ? "" : void 0,
			loop: r.loop === !0 ? "" : void 0,
			autoplay: r.autoPlay === !1 ? void 0 : ""
		};
		Object.keys(a).forEach((e) => {
			let t = a[e];
			t !== void 0 && i.setAttribute(e, t);
		}), r.muted === !0 && (i.muted = !0), Dn(i, e, r.crossorigin);
		let o = document.createElement("source"), s;
		if (r.mime) s = r.mime;
		else if (e.startsWith("data:")) s = e.slice(5, e.indexOf(";"));
		else if (!e.startsWith("blob:")) {
			let t = e.split("?")[0].slice(e.lastIndexOf(".") + 1).toLowerCase();
			s = F.MIME_TYPES[t] || `video/${t}`;
		}
		return o.src = e, s && (o.type = s), new Promise((a, s) => {
			r.preload && !r.autoPlay && i.load(), i.addEventListener("canplay", c), i.addEventListener("error", l), o.addEventListener("error", l), i.appendChild(o);
			async function c() {
				let o = new F({
					...r,
					resource: i
				});
				u(), t.data.preload && await On(i), a(an(o, n, e));
			}
			function l(e) {
				u(), s(e);
			}
			function u() {
				i.removeEventListener("canplay", c), i.removeEventListener("error", l), o.removeEventListener("error", l);
			}
		});
	},
	unload(e) {
		e.destroy(!0);
	}
}, Mn = {
	extension: {
		type: k.ResolveParser,
		name: "resolveTexture"
	},
	test: Cn.test,
	parse: (e) => ({
		resolution: parseFloat(de.RETINA_PREFIX.exec(e)?.[1] ?? "1"),
		format: e.split(".").pop(),
		src: e
	})
}, Nn = {
	extension: {
		type: k.ResolveParser,
		priority: -2,
		name: "resolveJson"
	},
	test: (e) => de.RETINA_PREFIX.test(e) && e.endsWith(".json"),
	parse: Mn.parse
}, Pn = new class {
	constructor() {
		this._detections = [], this._initialized = !1, this.resolver = new de(), this.loader = new Bt(), this.cache = z, this._backgroundLoader = new Dt(this.loader), this._backgroundLoader.active = !0, this.reset();
	}
	async init(e = {}) {
		if (this._initialized) {
			T("[Assets]AssetManager already initialized, did you load before calling this Assets.init()?");
			return;
		}
		if (this._initialized = !0, e.defaultSearchParams && this.resolver.setDefaultSearchParams(e.defaultSearchParams), e.basePath && (this.resolver.basePath = e.basePath), e.bundleIdentifier && this.resolver.setBundleIdentifier(e.bundleIdentifier), e.manifest) {
			let t = e.manifest;
			typeof t == "string" && (t = await this.load(t)), this.resolver.addManifest(t);
		}
		let t = e.texturePreference?.resolution ?? 1, n = typeof t == "number" ? [t] : t, r = await this._detectFormats({
			preferredFormats: e.texturePreference?.format,
			skipDetections: e.skipDetections,
			detections: this._detections
		});
		this.resolver.prefer({ params: {
			format: r,
			resolution: n
		} }), e.preferences && this.setPreferences(e.preferences), e.loadOptions && (this.loader.loadOptions = {
			...this.loader.loadOptions,
			...e.loadOptions
		});
	}
	add(e) {
		this.resolver.add(e);
	}
	async load(e, t) {
		this._initialized || await this.init();
		let n = P(e), r = R(e).map((e) => {
			if (typeof e != "string") {
				let t = this.resolver.getAlias(e);
				return t.some((e) => !this.resolver.hasKey(e)) && this.add(e), Array.isArray(t) ? t[0] : t;
			}
			return this.resolver.hasKey(e) || this.add({
				alias: e,
				src: e
			}), e;
		}), i = this.resolver.resolve(r), a = await this._mapLoadToResolve(i, t);
		return n ? a[r[0]] : a;
	}
	addBundle(e, t) {
		this.resolver.addBundle(e, t);
	}
	async loadBundle(e, t) {
		this._initialized || await this.init();
		let n = !1;
		typeof e == "string" && (n = !0, e = [e]);
		let r = this.resolver.resolveBundle(e), i = {}, a = Object.keys(r), o = 0, s = [], c = () => {
			t?.(s.reduce((e, t) => e + t, 0) / o);
		}, l = a.map((e, t) => {
			let n = r[e], a = Object.values(n), l = [...new Set(a.flat())].reduce((e, t) => e + (t.progressSize || 1), 0);
			return s.push(0), o += l, this._mapLoadToResolve(n, (e) => {
				s[t] = e * l, c();
			}).then((t) => {
				i[e] = t;
			});
		});
		return await Promise.all(l), n ? i[e[0]] : i;
	}
	async backgroundLoad(e) {
		this._initialized || await this.init(), typeof e == "string" && (e = [e]);
		let t = this.resolver.resolve(e);
		this._backgroundLoader.add(Object.values(t));
	}
	async backgroundLoadBundle(e) {
		this._initialized || await this.init(), typeof e == "string" && (e = [e]);
		let t = this.resolver.resolveBundle(e);
		Object.values(t).forEach((e) => {
			this._backgroundLoader.add(Object.values(e));
		});
	}
	reset() {
		this.resolver.reset(), this.loader.reset(), this.cache.reset(), this._initialized = !1;
	}
	get(e) {
		if (typeof e == "string") return z.get(e);
		let t = {};
		for (let n = 0; n < e.length; n++) t[n] = z.get(e[n]);
		return t;
	}
	async _mapLoadToResolve(e, t) {
		let n = [...new Set(Object.values(e))];
		this._backgroundLoader.active = !1;
		let r = await this.loader.load(n, t);
		this._backgroundLoader.active = !0;
		let i = {};
		return n.forEach((e) => {
			let t = r[e.src], n = [e.src];
			e.alias && n.push(...e.alias), n.forEach((e) => {
				i[e] = t;
			}), z.set(n, t);
		}), i;
	}
	async unload(e) {
		this._initialized || await this.init();
		let t = R(e).map((e) => typeof e == "string" ? e : e.src), n = this.resolver.resolve(t);
		await this._unloadFromResolved(n);
	}
	async unloadBundle(e) {
		this._initialized || await this.init(), e = R(e);
		let t = this.resolver.resolveBundle(e), n = Object.keys(t).map((e) => this._unloadFromResolved(t[e]));
		await Promise.all(n);
	}
	async _unloadFromResolved(e) {
		let t = Object.values(e);
		t.forEach((e) => {
			z.remove(e.src);
		}), await this.loader.unload(t);
	}
	async _detectFormats(e) {
		let t = [];
		e.preferredFormats && (t = Array.isArray(e.preferredFormats) ? e.preferredFormats : [e.preferredFormats]);
		for (let n of e.detections) e.skipDetections || await n.test() ? t = await n.add(t) : e.skipDetections || (t = await n.remove(t));
		return t = t.filter((e, n) => t.indexOf(e) === n), t;
	}
	get detections() {
		return this._detections;
	}
	setPreferences(e) {
		this.loader.parsers.forEach((t) => {
			t.config && Object.keys(t.config).filter((t) => t in e).forEach((n) => {
				t.config[n] = e[n];
			});
		});
	}
}();
e.handleByList(k.LoadParser, Pn.loader.parsers).handleByList(k.ResolveParser, Pn.resolver.parsers).handleByList(k.CacheParser, Pn.cache.parsers).handleByList(k.DetectionParser, Pn.detections), e.add(Ot, Mt, At, Rt, Ft, It, Lt, Gt, Jt, nn, cn, Cn, jn, Et, Tt, Mn, Nn);
var Fn = {
	loader: k.LoadParser,
	resolver: k.ResolveParser,
	cache: k.CacheParser,
	detection: k.DetectionParser
};
e.handle(k.Asset, (t) => {
	let n = t.ref;
	Object.entries(Fn).filter(([e]) => !!n[e]).forEach(([t, r]) => e.add(Object.assign(n[t], { extension: n[t].extension ?? r })));
}, (t) => {
	let n = t.ref;
	Object.keys(Fn).filter((e) => !!n[e]).forEach((t) => e.remove(n[t]));
});
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/graphics/canvas/CanvasGraphicsContextSystem.mjs
var In = class {
	constructor() {
		this.isBatchable = !1;
	}
	reset() {
		this.isBatchable = !1, this.context = null, this.graphicsData &&= (this.graphicsData.destroy(), null);
	}
	destroy() {
		this.reset();
	}
}, Ln = class {
	constructor() {
		this.instructions = new _();
	}
	init() {
		this.instructions.reset();
	}
	destroy() {
		this.instructions.destroy(), this.instructions = null;
	}
}, Rn = class e {
	constructor(e) {
		this._renderer = e, this._managedContexts = new H({
			renderer: e,
			type: "resource",
			name: "graphicsContext"
		});
	}
	init(t) {
		e.defaultOptions.bezierSmoothness = t?.bezierSmoothness ?? e.defaultOptions.bezierSmoothness;
	}
	getContextRenderData(e) {
		return this.getGpuContext(e).graphicsData || this._initContextRenderData(e);
	}
	updateGpuContext(e) {
		let t = e._gpuData, n = !!t[this._renderer.uid], r = t[this._renderer.uid] || this._initContext(e);
		return (e.dirty || !n) && (n && r.reset(), r.isBatchable = !1, e.dirty = !1), r;
	}
	getGpuContext(e) {
		return e._gpuData[this._renderer.uid] || this._initContext(e);
	}
	_initContextRenderData(e) {
		let t = new Ln(), n = this.getGpuContext(e);
		return n.graphicsData = t, t.init(), t;
	}
	_initContext(e) {
		let t = new In();
		return t.context = e, e._gpuData[this._renderer.uid] = t, this._managedContexts.add(e), t;
	}
	destroy() {
		this._managedContexts.destroy(), this._renderer = null;
	}
};
Rn.extension = {
	type: [k.CanvasSystem],
	name: "graphicsContext"
}, Rn.defaultOptions = { bezierSmoothness: .5 };
var zn = Rn, Bn = class {
	constructor(e, t) {
		this.state = j.for2d(), this.renderer = e, this._adaptor = t, this.renderer.runners.contextChange.add(this), this._managedGraphics = new H({
			renderer: e,
			type: "renderable",
			priority: -1,
			name: "graphics"
		});
	}
	contextChange() {
		this._adaptor.contextChange(this.renderer);
	}
	validateRenderable(e) {
		return !1;
	}
	addRenderable(e, t) {
		this._managedGraphics.add(e), this.renderer.renderPipes.batch.break(t), t.add(e);
	}
	updateRenderable(e) {}
	execute(e) {
		e.isRenderable && this._adaptor.execute(this, e);
	}
	destroy() {
		this._managedGraphics.destroy(), this.renderer = null, this._adaptor.destroy(), this._adaptor = null;
	}
};
Bn.extension = {
	type: [k.CanvasPipes],
	name: "graphics"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/graphics/shared/GraphicsPipe.mjs
var Vn = class {
	constructor() {
		this.batches = [], this.batched = !1;
	}
	destroy() {
		this.batches.forEach((e) => {
			d.return(e);
		}), this.batches.length = 0;
	}
}, Hn = class {
	constructor(e, t) {
		this.state = j.for2d(), this.renderer = e, this._adaptor = t, this.renderer.runners.contextChange.add(this), this._managedGraphics = new H({
			renderer: e,
			type: "renderable",
			priority: -1,
			name: "graphics"
		});
	}
	contextChange() {
		this._adaptor.contextChange(this.renderer);
	}
	validateRenderable(e) {
		let t = e.context, n = !!e._gpuData, r = this.renderer.graphicsContext.updateGpuContext(t);
		return !!(r.isBatchable || n !== r.isBatchable);
	}
	addRenderable(e, t) {
		let n = this.renderer.graphicsContext.updateGpuContext(e.context);
		e.didViewUpdate && this._rebuild(e), n.isBatchable ? this._addToBatcher(e, t) : (this.renderer.renderPipes.batch.break(t), t.add(e));
	}
	updateRenderable(e) {
		let t = this._getGpuDataForRenderable(e).batches;
		for (let e = 0; e < t.length; e++) {
			let n = t[e];
			n._batcher.updateElement(n);
		}
	}
	execute(e) {
		if (!e.isRenderable) return;
		let t = this.renderer, n = e.context;
		if (!t.graphicsContext.getGpuContext(n).batches.length) return;
		let r = n.customShader || this._adaptor.shader;
		this.state.blendMode = e.groupBlendMode;
		let i = r.resources.localUniforms.uniforms;
		i.uTransformMatrix = e.groupTransform, i.uRound = t._roundPixels | e._roundPixels, ge(e.groupColorAlpha, i.uColor, 0), this._adaptor.execute(this, e);
	}
	_rebuild(e) {
		let t = this._getGpuDataForRenderable(e), n = this.renderer.graphicsContext.updateGpuContext(e.context);
		t.destroy(), n.isBatchable && this._updateBatchesForRenderable(e, t);
	}
	_addToBatcher(e, t) {
		let n = this.renderer.renderPipes.batch, r = this._getGpuDataForRenderable(e).batches;
		for (let e = 0; e < r.length; e++) {
			let i = r[e];
			n.addToBatch(i, t);
		}
	}
	_getGpuDataForRenderable(e) {
		return e._gpuData[this.renderer.uid] || this._initGpuDataForRenderable(e);
	}
	_initGpuDataForRenderable(e) {
		let t = new Vn();
		return e._gpuData[this.renderer.uid] = t, this._managedGraphics.add(e), t;
	}
	_updateBatchesForRenderable(e, t) {
		let n = e.context, r = this.renderer.graphicsContext.getGpuContext(n), i = this.renderer._roundPixels | e._roundPixels;
		t.batches = r.batches.map((t) => {
			let n = d.get(Fe);
			return t.copyTo(n), n.renderable = e, n.roundPixels = i, n;
		});
	}
	destroy() {
		this._managedGraphics.destroy(), this.renderer = null, this._adaptor.destroy(), this._adaptor = null, this.state = null;
	}
};
Hn.extension = {
	type: [k.WebGLPipes, k.WebGPUPipes],
	name: "graphics"
}, e.add(Bn), e.add(Hn), e.add(zn), e.add(De);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/graphics/shared/Graphics.mjs
var U = class e extends ae {
	constructor(e) {
		e instanceof V && (e = { context: e });
		let { context: t, roundPixels: n, ...r } = e || {};
		super({
			label: "Graphics",
			...r
		}), this.renderPipeId = "graphics", t ? this.context = t : (this.context = this._ownedContext = new V(), this.context.autoGarbageCollect = this.autoGarbageCollect), this.didViewUpdate = !0, this.allowChildren = !1, this.roundPixels = n ?? !1;
	}
	set context(e) {
		e !== this._context && (this._context && (this._context.off("update", this.onViewUpdate, this), this._context.off("unload", this.unload, this)), this._context = e, this._context.on("update", this.onViewUpdate, this), this._context.on("unload", this.unload, this), this.onViewUpdate());
	}
	get context() {
		return this._context;
	}
	get bounds() {
		return this._context.bounds;
	}
	updateBounds() {}
	containsPoint(e) {
		return this._context.containsPoint(e);
	}
	destroy(e) {
		this._ownedContext && !e ? this._ownedContext.destroy(e) : (e === !0 || e?.context === !0) && this._context.destroy(e), this._ownedContext = null, this._context = null, super.destroy(e);
	}
	_onTouch(e) {
		this._gcLastUsed = e, this._context._gcLastUsed = e;
	}
	_callContextMethod(e, t) {
		return this.context[e](...t), this;
	}
	setFillStyle(...e) {
		return this._callContextMethod("setFillStyle", e);
	}
	setStrokeStyle(...e) {
		return this._callContextMethod("setStrokeStyle", e);
	}
	fill(...e) {
		return this._callContextMethod("fill", e);
	}
	stroke(...e) {
		return this._callContextMethod("stroke", e);
	}
	texture(...e) {
		return this._callContextMethod("texture", e);
	}
	beginPath() {
		return this._callContextMethod("beginPath", []);
	}
	cut() {
		return this._callContextMethod("cut", []);
	}
	arc(...e) {
		return this._callContextMethod("arc", e);
	}
	arcTo(...e) {
		return this._callContextMethod("arcTo", e);
	}
	arcToSvg(...e) {
		return this._callContextMethod("arcToSvg", e);
	}
	bezierCurveTo(...e) {
		return this._callContextMethod("bezierCurveTo", e);
	}
	closePath() {
		return this._callContextMethod("closePath", []);
	}
	ellipse(...e) {
		return this._callContextMethod("ellipse", e);
	}
	circle(...e) {
		return this._callContextMethod("circle", e);
	}
	path(...e) {
		return this._callContextMethod("path", e);
	}
	lineTo(...e) {
		return this._callContextMethod("lineTo", e);
	}
	moveTo(...e) {
		return this._callContextMethod("moveTo", e);
	}
	quadraticCurveTo(...e) {
		return this._callContextMethod("quadraticCurveTo", e);
	}
	rect(...e) {
		return this._callContextMethod("rect", e);
	}
	roundRect(...e) {
		return this._callContextMethod("roundRect", e);
	}
	poly(...e) {
		return this._callContextMethod("poly", e);
	}
	regularPoly(...e) {
		return this._callContextMethod("regularPoly", e);
	}
	roundPoly(...e) {
		return this._callContextMethod("roundPoly", e);
	}
	roundShape(...e) {
		return this._callContextMethod("roundShape", e);
	}
	filletRect(...e) {
		return this._callContextMethod("filletRect", e);
	}
	chamferRect(...e) {
		return this._callContextMethod("chamferRect", e);
	}
	star(...e) {
		return this._callContextMethod("star", e);
	}
	svg(...e) {
		return this._callContextMethod("svg", e);
	}
	restore(...e) {
		return this._callContextMethod("restore", e);
	}
	save() {
		return this._callContextMethod("save", []);
	}
	getTransform() {
		return this.context.getTransform();
	}
	resetTransform() {
		return this._callContextMethod("resetTransform", []);
	}
	rotateTransform(...e) {
		return this._callContextMethod("rotate", e);
	}
	scaleTransform(...e) {
		return this._callContextMethod("scale", e);
	}
	setTransform(...e) {
		return this._callContextMethod("setTransform", e);
	}
	transform(...e) {
		return this._callContextMethod("transform", e);
	}
	translateTransform(...e) {
		return this._callContextMethod("translate", e);
	}
	clear() {
		return this._callContextMethod("clear", []);
	}
	get fillStyle() {
		return this._context.fillStyle;
	}
	set fillStyle(e) {
		this._context.fillStyle = e;
	}
	get strokeStyle() {
		return this._context.strokeStyle;
	}
	set strokeStyle(e) {
		this._context.strokeStyle = e;
	}
	clone(t = !1) {
		return t ? new e(this._context.clone()) : (this._ownedContext = null, new e(this._context));
	}
	lineStyle(e, t, n) {
		i(h, "Graphics#lineStyle is no longer needed. Use Graphics#setStrokeStyle to set the stroke style.");
		let r = {};
		return e && (r.width = e), t && (r.color = t), n && (r.alpha = n), this.context.strokeStyle = r, this;
	}
	beginFill(e, t) {
		i(h, "Graphics#beginFill is no longer needed. Use Graphics#fill to fill the shape with the desired style.");
		let n = {};
		return e !== void 0 && (n.color = e), t !== void 0 && (n.alpha = t), this.context.fillStyle = n, this;
	}
	endFill() {
		i(h, "Graphics#endFill is no longer needed. Use Graphics#fill to fill the shape with the desired style."), this.context.fill();
		let e = this.context.strokeStyle;
		return (e.width !== V.defaultStrokeStyle.width || e.color !== V.defaultStrokeStyle.color || e.alpha !== V.defaultStrokeStyle.alpha) && this.context.stroke(), this;
	}
	drawCircle(...e) {
		return i(h, "Graphics#drawCircle has been renamed to Graphics#circle"), this._callContextMethod("circle", e);
	}
	drawEllipse(...e) {
		return i(h, "Graphics#drawEllipse has been renamed to Graphics#ellipse"), this._callContextMethod("ellipse", e);
	}
	drawPolygon(...e) {
		return i(h, "Graphics#drawPolygon has been renamed to Graphics#poly"), this._callContextMethod("poly", e);
	}
	drawRect(...e) {
		return i(h, "Graphics#drawRect has been renamed to Graphics#rect"), this._callContextMethod("rect", e);
	}
	drawRoundedRect(...e) {
		return i(h, "Graphics#drawRoundedRect has been renamed to Graphics#roundRect"), this._callContextMethod("roundRect", e);
	}
	drawStar(...e) {
		return i(h, "Graphics#drawStar has been renamed to Graphics#star"), this._callContextMethod("star", e);
	}
}, Un = class extends ae {
	constructor(e, t) {
		let { text: n, resolution: r, style: i, anchor: a, width: o, height: s, roundPixels: c, ...l } = e;
		super({ ...l }), this.batched = !0, this._resolution = null, this._autoResolution = !0, this._didTextUpdate = !0, this._styleClass = t, this.text = n ?? "", this.style = i, this.resolution = r ?? null, this.allowChildren = !1, this._anchor = new te({ _onUpdate: () => {
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
function Wn(e, t) {
	let n = e[0] ?? {};
	return (typeof n == "string" || e[1]) && (i(h, `use new ${t}({ text: "hi!", style }) instead`), n = {
		text: n,
		style: e[1]
	}), n;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/utils/canvas/getCanvasBoundingBox.mjs
var W = null, G = null;
function Gn(e, n) {
	W || (W = b.get().createCanvas(256, 128), G = W.getContext("2d", { willReadFrequently: !0 }), G.globalCompositeOperation = "copy", G.globalAlpha = 1), (W.width < e || W.height < n) && (W.width = t(e), W.height = t(n));
}
function Kn(e, t, n) {
	for (let r = 0, i = 4 * n * t; r < t; ++r, i += 4) if (e[i + 3] !== 0) return !1;
	return !0;
}
function qn(e, t, n, r, i) {
	let a = 4 * t;
	for (let t = r, o = r * a + 4 * n; t <= i; ++t, o += a) if (e[o + 3] !== 0) return !1;
	return !0;
}
function Jn(...e) {
	let t = e[0];
	t.canvas || (t = {
		canvas: e[0],
		resolution: e[1]
	});
	let { canvas: r } = t, i = Math.min(t.resolution ?? 1, 1), a = t.width ?? r.width, o = t.height ?? r.height, s = t.output;
	if (Gn(a, o), !G) throw TypeError("Failed to get canvas 2D context");
	G.drawImage(r, 0, 0, a, o, 0, 0, a * i, o * i);
	let c = G.getImageData(0, 0, a, o).data, l = 0, u = 0, d = a - 1, f = o - 1;
	for (; u < o && Kn(c, a, u);) ++u;
	if (u === o) return n.EMPTY;
	for (; Kn(c, a, f);) --f;
	for (; qn(c, a, l, u, f);) ++l;
	for (; qn(c, a, d, u, f);) --d;
	return ++d, ++f, G.globalCompositeOperation = "source-over", G.strokeRect(l, u, d - l, f - u), G.globalCompositeOperation = "copy", s ??= new n(), s.set(l / i, u / i, (d - l) / i, (f - u) / i), s;
}
//#endregion
//#region node_modules/.pnpm/tiny-lru@11.4.7/node_modules/tiny-lru/dist/tiny-lru.js
var Yn = class {
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
function Xn(e = 1e3, t = 0, n = !1) {
	if (isNaN(e) || e < 0) throw TypeError("Invalid max value");
	if (isNaN(t) || t < 0) throw TypeError("Invalid ttl value");
	if (typeof n != "boolean") throw TypeError("Invalid resetTtl value");
	return new Yn(e, t, n);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/utils/parseTaggedText.mjs
function Zn(e) {
	return !!e.tagStyles && Object.keys(e.tagStyles).length > 0;
}
function Qn(e) {
	return e.includes("<");
}
function $n(e, t) {
	return e.clone().assign(t);
}
function er(e, t) {
	let n = [], r = t.tagStyles;
	if (!Zn(t) || !Qn(e)) return n.push({
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
					let e = i[i.length - 1], l = $n(e, r[t]);
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
var tr = /* @__PURE__ */ new Set([10, 13]), nr = /* @__PURE__ */ new Set([
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
]), rr = /* @__PURE__ */ new Set([9, 32]), ir = /* @__PURE__ */ new Set([
	45,
	8208,
	8211,
	8212,
	173
]), ar = /(\r\n|\r|\n)/, or = /(?:\r\n|\r|\n)/;
function sr(e) {
	return typeof e == "string" && tr.has(e.charCodeAt(0));
}
function K(e, t) {
	return typeof e == "string" && nr.has(e.charCodeAt(0));
}
function cr(e) {
	return typeof e == "string" && rr.has(e.charCodeAt(0));
}
function lr(e) {
	return typeof e == "string" && ir.has(e.charCodeAt(0));
}
function ur(e) {
	return e === "normal" || e === "pre-line";
}
function dr(e) {
	return e === "normal";
}
function q(e) {
	if (typeof e != "string") return "";
	let t = e.length - 1;
	for (; t >= 0 && K(e[t]);) t--;
	return t < e.length - 1 ? e.slice(0, t + 1) : e;
}
function fr(e) {
	let t = [], n = [];
	if (typeof e != "string") return t;
	for (let r = 0; r < e.length; r++) {
		let i = e[r], a = e[r + 1];
		if (K(i, a) || sr(i)) {
			n.length > 0 && (t.push(n.join("")), n.length = 0), i === "\r" && a === "\n" ? (t.push("\r\n"), r++) : t.push(i);
			continue;
		}
		n.push(i), lr(i) && a && !K(a) && !sr(a) && (t.push(n.join("")), n.length = 0);
	}
	return n.length > 0 && t.push(n.join("")), t;
}
function pr(e, t, n, r) {
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
var mr = /\r\n|\r|\n/g;
function hr(e, t, n, r, i, a, o, s, c) {
	let l = er(e, t);
	if (dr(t.whiteSpace)) for (let e = 0; e < l.length; e++) {
		let t = l[e];
		l[e] = {
			text: t.text.replace(mr, " "),
			style: t.style
		};
	}
	let u = [], d = [];
	for (let e of l) {
		let t = e.text.split(ar);
		for (let n = 0; n < t.length; n++) {
			let r = t[n];
			r === "\r\n" || r === "\r" || r === "\n" ? (u.push(d), d = []) : r.length > 0 && d.push({
				text: r,
				style: e.style
			});
		}
	}
	(d.length > 0 || u.length === 0) && u.push(d);
	let f = n ? gr(u, t, r, a, s, c) : u, p = [], m = [], h = [], g = [], _ = [], v = 0, y = t._fontString, b = o(y);
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
function gr(e, t, n, r, i, a) {
	let { letterSpacing: o, whiteSpace: s, wordWrapWidth: c, breakWords: l } = t, u = ur(s), d = c + o, f = {}, p = "", m = (e, t) => {
		let i = `${e}|${t.styleKey}`, a = f[i];
		if (a === void 0) {
			let o = t._fontString;
			o !== p && (n.font = o, p = o), a = r(e, t.letterSpacing, n) + t.letterSpacing, f[i] = a;
		}
		return a;
	}, h = [];
	for (let t of e) {
		let e = _r(t), n = h.length, r = (t) => {
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
				e.text = q(e.text), e.text.length === 0 && s.pop();
			}
			h.push(s), s = [], c = 0, f = !1;
		};
		for (let t = 0; t < e.length; t++) {
			let { token: n, style: v, continuesFromPrevious: y } = e[t], b = m(n, v);
			if (u) {
				let e = K(n), t = p?.text[p.text.length - 1] ?? s[s.length - 1]?.text.slice(-1) ?? "", r = t ? K(t) : !1;
				if (e && r) continue;
			}
			let x = !y, S = x ? r(t) : b;
			if (S > d && x) {
				if (c > 0 && _(), l) {
					let e = o(t);
					for (let t = 0; t < e.length; t++) {
						let n = e[t].token, r = e[t].style, o = pr(n, l, a, i);
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
				if (K(n)) {
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
				let e = K(n);
				if (c === 0 && e && !f) continue;
				!p || p.style !== v ? (g(), p = {
					text: n,
					style: v
				}) : p.text += n, c += b;
			}
		}
		if (g(), s.length > 0) {
			let e = s[s.length - 1];
			e.text = q(e.text), e.text.length === 0 && s.pop();
		}
		(s.length > 0 || h.length === n) && h.push(s);
	}
	return h;
}
function _r(e) {
	let t = [], n = !1;
	for (let r of e) {
		let e = fr(r.text), i = !0;
		for (let a of e) {
			let e = K(a) || sr(a), o = i && n && !e;
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
var vr = { willReadFrequently: !0 };
function yr(e, t, n, r, i) {
	let a = n[e];
	return typeof a != "number" && (a = i(e, t, r) + t, n[e] = a), a;
}
function br(e, t, n, r, i, a, o) {
	let s = n.getContext("2d", vr);
	s.font = t._fontString;
	let c = 0, l = "", u = [], d = /* @__PURE__ */ Object.create(null), { letterSpacing: f, whiteSpace: p } = t, m = ur(p), h = dr(p), g = !m, _ = t.wordWrapWidth + f, v = fr(e);
	for (let e = 0; e < v.length; e++) {
		let n = v[e];
		if (sr(n)) {
			if (!h) {
				u.push(q(l)), g = !m, l = "", c = 0;
				continue;
			}
			n = " ";
		}
		if (m) {
			let e = K(n), t = K(l[l.length - 1]);
			if (e && t) continue;
		}
		let p = yr(n, f, d, s, r);
		if (p > _) {
			if (l !== "" && (u.push(q(l)), l = "", c = 0), i(n, t.breakWords)) {
				let e = pr(n, t.breakWords, o, a);
				for (let t of e) {
					let e = yr(t, f, d, s, r);
					e + c > _ && (u.push(q(l)), g = !1, l = "", c = 0), l += t, c += e;
				}
			} else l.length > 0 && (u.push(q(l)), l = "", c = 0), u.push(q(n)), g = !1, l = "", c = 0;
		} else p + c > _ && (g = !1, u.push(q(l)), l = "", c = 0), (l.length > 0 || !K(n) || g) && (l += n, c += p);
	}
	let y = q(l);
	return y.length > 0 && u.push(y), u.join("\n");
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/CanvasTextMetrics.mjs
var xr = { willReadFrequently: !0 }, J = class e {
	static get experimentalLetterSpacingSupported() {
		let t = e._experimentalLetterSpacingSupported;
		if (t === void 0) {
			let n = b.get().getCanvasRenderingContext2D().prototype;
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
		if (Zn(n) && Qn(t)) {
			let r = hr(t, n, i, e._context, e._measureText, e._measureTextAdvance, e.measureFont, e.canBreakChars, e.wordWrapSplit), o = new e(t, n, r.width, r.height, r.lines, r.lineWidths, r.lineHeight, r.maxLineWidth, r.fontProperties, {
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
		let l = (i ? e._wordWrap(t, n, r) : t).split(or), u = Array(l.length), d = 0;
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
		return br(t, n, r, e._measureTextAdvance, e.canBreakWords, e.canBreakChars, e.wordWrapSplit);
	}
	static isBreakingSpace(e, t) {
		return K(e, t);
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
				if (n.getContext("2d", xr)?.measureText) return e.__canvas = n, n;
				t = b.get().createCanvas();
			} catch {
				t = b.get().createCanvas();
			}
			t.width = t.height = 10, e.__canvas = t;
		}
		return e.__canvas;
	}
	static get _context() {
		return e.__context ||= e._canvas.getContext("2d", xr), e.__context;
	}
};
J.METRICS_STRING = "|ÉqÅ", J.BASELINE_SYMBOL = "M", J.BASELINE_MULTIPLIER = 1.4, J.HEIGHT_MULTIPLIER = 2, J.graphemeSegmenter = (() => {
	if (typeof Intl?.Segmenter == "function") {
		let e = new Intl.Segmenter();
		return (t) => {
			let n = e.segment(t), r = [], i = 0;
			for (let e of n) r[i++] = e.segment;
			return r;
		};
	}
	return (e) => [...e];
})(), J.experimentalLetterSpacing = !1, J._fonts = {}, J._measurementCache = Xn(1e3);
var Y = J, Sr = [
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui"
];
function Cr(e) {
	let t = typeof e.fontSize == "number" ? `${e.fontSize}px` : e.fontSize, n = e.fontFamily;
	Array.isArray(e.fontFamily) || (n = e.fontFamily.split(","));
	for (let e = n.length - 1; e >= 0; e--) {
		let t = n[e].trim();
		!/([\"\'])[^\'\"]+\1/.test(t) && !Sr.includes(t) && (t = `"${t}"`), n[e] = t;
	}
	return `${e.fontStyle} ${e.fontVariant} ${e.fontWeight} ${t} ${n.join(",")}`;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/utils/getCanvasFillStyle.mjs
var wr = 1e5;
function Tr(e, t, n, r = 0, i = 0, o = 0) {
	if (e.texture === D.WHITE && !e.fill) return O.shared.setValue(e.color).setAlpha(e.alpha ?? 1).toHexa();
	if (!e.fill) {
		let n = t.createPattern(e.texture.source.resource, "repeat"), r = e.matrix.copyTo(a.shared);
		return r.scale(e.texture.source.pixelWidth, e.texture.source.pixelHeight), n.setTransform(r), n;
	}
	if (e.fill instanceof ke) {
		let n = e.fill, r = t.createPattern(n.texture.source.resource, "repeat");
		return L.applyPatternTransform(r, n.transform, !1), r;
	}
	if (e.fill instanceof Oe) {
		let a = e.fill, s = a.type === "linear", c = a.textureSpace === "local", l = 1, u = 1;
		c && n && (l = n.width + r, u = n.height + r);
		let d, f = !1;
		if (s) {
			let { start: e, end: n } = a;
			d = t.createLinearGradient(e.x * l + i, e.y * u + o, n.x * l + i, n.y * u + o), f = Math.abs(n.x - e.x) < Math.abs((n.y - e.y) * .1);
		} else {
			let { center: e, innerRadius: n, outerCenter: r, outerRadius: s } = a;
			d = t.createRadialGradient(e.x * l + i, e.y * u + o, n * l, r.x * l + i, r.y * u + o, s * l);
		}
		if (f && c && n) {
			let e = n.lineHeight / u;
			for (let t = 0; t < n.lines.length; t++) {
				let i = (t * n.lineHeight + r / 2) / u;
				a.colorStops.forEach((t) => {
					let n = i + t.offset * e;
					n = Math.max(0, Math.min(1, n)), d.addColorStop(Math.floor(n * wr) / wr, O.shared.setValue(t.color).toHex());
				});
			}
		} else a.colorStops.forEach((e) => {
			d.addColorStop(e.offset, O.shared.setValue(e.color).toHex());
		});
		return d;
	}
	return T("FillStyle not recognised", e), "red";
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/CanvasTextGenerator.mjs
var Er = new n();
function Dr(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) e.charCodeAt(n) === 32 && t++;
	return t;
}
var Or = new class {
	getCanvasAndContext(e) {
		let { text: t, style: n, resolution: r = 1 } = e, i = n._getFinalPadding(), a = Y.measureText(t || " ", n), o = Math.ceil(Math.ceil(Math.max(1, a.width) + i * 2) * r), s = Math.ceil(Math.ceil(Math.max(1, a.height) + i * 2) * r), c = Ye.getOptimalCanvasAndContext(o, s);
		return this._renderTextToCanvas(n, i, r, c, a), {
			canvasAndContext: c,
			frame: n.trim ? Jn({
				canvas: c.canvas,
				width: o,
				height: s,
				resolution: 1,
				output: Er
			}) : Er.set(0, 0, o, s)
		};
	}
	returnCanvasAndContext(e) {
		Ye.returnCanvasAndContext(e);
	}
	_renderTextToCanvas(e, t, n, r, i) {
		if (i.runsByLine && i.runsByLine.length > 0) {
			this._renderTaggedTextToCanvas(i, e, t, n, r);
			return;
		}
		let { canvas: a, context: o } = r, s = Cr(e), c = i.lines, l = i.lineHeight, u = i.lineWidths, d = i.maxLineWidth, f = i.fontProperties, p = a.height;
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
					let e = Dr(c[n]);
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
				let t = Cr(e.style);
				o.font = t, n.push({
					width: Y._measureText(e.text, e.style.letterSpacing, o),
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
					for (let t of f) e += Dr(t.text);
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
								let e = Dr(t.text);
								T += s + e * C;
								continue;
							}
						} else {
							let r = Y.measureFont(c), i = t.style.lineHeight || r.fontSize;
							o.strokeStyle = Tr(e, o, {
								width: s,
								height: i,
								lineHeight: i,
								lines: [t.text]
							}, n * 2, T - n, v);
						}
						this._drawLetterSpacing(t.text, t.style, i, T, w + n - m, !0, C);
					}
					let l = Dr(t.text);
					T += s + l * C;
				}
				T = S + n;
				for (let e = 0; e < f.length; e++) {
					let t = f[e], { width: s, font: c } = x[e];
					if (o.font = c, o.textBaseline = t.style.textBaseline, t.style._fill !== void 0) {
						if (a) {
							if (t.style.dropShadow) this._setupDropShadow(o, t.style, r, h);
							else {
								let e = Dr(t.text);
								T += s + e * C;
								continue;
							}
						} else {
							let e = Y.measureFont(c), r = t.style.lineHeight || e.fontSize, i = {
								width: s,
								height: r,
								lineHeight: r,
								lines: [t.text]
							};
							o.fillStyle = Tr(t.style._fill, o, i, n * 2, T - n, v);
						}
						this._drawLetterSpacing(t.text, t.style, i, T, w + n - m, !1, C);
					}
					let l = Dr(t.text);
					T += s + l * C;
				}
				v += b;
			}
		}
	}
	_setFillAndStrokeStyles(e, t, n, r, i, a = 0, o = 0) {
		if (e.fillStyle = t._fill ? Tr(t._fill, e, n, r * 2, a, o) : null, t._stroke?.width) {
			let s = i + r * 2;
			e.strokeStyle = Tr(t._stroke, e, n, s, a, o);
		}
	}
	_setupDropShadow(e, t, n, r) {
		e.fillStyle = "black", e.strokeStyle = "black";
		let i = t.dropShadow, a = i.color, o = i.alpha;
		e.shadowColor = O.shared.setValue(a).setAlpha(o).toRgbaString();
		let s = i.blur * n, c = i.distance * n;
		e.shadowBlur = s, e.shadowOffsetX = Math.cos(i.angle) * c, e.shadowOffsetY = Math.sin(i.angle) * c + r;
	}
	_getAlignmentOffset(e, t, n) {
		return n === "right" ? t - e : n === "center" ? (t - e) / 2 : 0;
	}
	_drawLetterSpacing(e, t, n, r, i, a = !1, o = 0) {
		let { context: s } = n, c = t.letterSpacing, l = !1;
		if (Y.experimentalLetterSpacingSupported && (Y.experimentalLetterSpacing ? (s.letterSpacing = `${c}px`, s.textLetterSpacing = `${c}px`, l = !0) : (s.letterSpacing = "0px", s.textLetterSpacing = "0px")), (c === 0 || l) && o === 0) {
			a ? s.strokeText(e, r, i) : s.fillText(e, r, i);
			return;
		}
		if (o !== 0 && (c === 0 || l)) {
			let t = e.split(" "), n = r, c = s.measureText(" ").width;
			for (let e = 0; e < t.length; e++) a ? s.strokeText(t[e], n, i) : s.fillText(t[e], n, i), n += s.measureText(t[e]).width + c + o;
			return;
		}
		let u = r, d = Y.graphemeSegmenter(e), f = s.measureText(e).width, p = 0;
		for (let e = 0; e < d.length; ++e) {
			let t = d[e];
			a ? s.strokeText(t, u, i) : s.fillText(t, u, i);
			let n = "";
			for (let t = e + 1; t < d.length; ++t) n += d[t];
			p = s.measureText(n).width, u += f - p + c, t === " " && (u += o), f = p;
		}
	}
}(), kr = class e extends o {
	constructor(t = {}) {
		super(), this.uid = m("textStyle"), this._tick = 0, this._cachedFontString = null, jr(t), t instanceof e && (t = t._toObject());
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
			...V.defaultFillStyle,
			...e
		}, () => {
			this._fill = je({ ...this._originalFill }, V.defaultFillStyle);
		})), this._fill = je(e === 0 ? "black" : e, V.defaultFillStyle), this.update());
	}
	get stroke() {
		return this._originalStroke;
	}
	set stroke(e) {
		e !== this._originalStroke && (this._originalStroke = e, this._isFillStyle(e) && (this._originalStroke = this._createProxy({
			...V.defaultStrokeStyle,
			...e
		}, () => {
			this._stroke = Ne({ ...this._originalStroke }, V.defaultStrokeStyle);
		})), this._stroke = Ne(e, V.defaultStrokeStyle), this.update());
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
		return this._cachedFontString === null && (this._cachedFontString = Cr(this)), this._cachedFontString;
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
		return (e ?? null) !== null && !(O.isColorLike(e) || e instanceof Oe || e instanceof ke);
	}
};
kr.defaultDropShadow = {
	alpha: 1,
	angle: Math.PI / 6,
	blur: 0,
	color: "black",
	distance: 5
}, kr.defaultTextStyle = {
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
var Ar = kr;
function jr(e) {
	let t = e;
	if (typeof t.dropShadow == "boolean" && t.dropShadow) {
		let n = Ar.defaultDropShadow;
		e.dropShadow = {
			alpha: t.dropShadowAlpha ?? n.alpha,
			angle: t.dropShadowAngle ?? n.angle,
			blur: t.dropShadowBlur ?? n.blur,
			color: t.dropShadowColor ?? n.color,
			distance: t.dropShadowDistance ?? n.distance
		};
	}
	if (t.strokeThickness !== void 0) {
		i(h, "strokeThickness is now a part of stroke");
		let n = t.stroke, r = {};
		if (O.isColorLike(n)) r.color = n;
		else if (n instanceof Oe || n instanceof ke) r.fill = n;
		else if (Object.hasOwnProperty.call(n, "color") || Object.hasOwnProperty.call(n, "fill")) r = n;
		else throw Error("Invalid stroke value.");
		e.stroke = {
			...r,
			width: t.strokeThickness
		};
	}
	if (Array.isArray(t.fillGradientStops)) {
		if (i(h, "gradient fill is now a fill pattern: `new FillGradient(...)`"), !Array.isArray(t.fill) || t.fill.length === 0) throw Error("Invalid fill value. Expected an array of colors for gradient fill.");
		t.fill.length !== t.fillGradientStops.length && T("The number of fill colors must match the number of fill gradient stops.");
		let n = new Oe({
			start: {
				x: 0,
				y: 0
			},
			end: {
				x: 0,
				y: 1
			},
			textureSpace: "local"
		}), r = t.fillGradientStops.slice(), a = t.fill.map((e) => O.shared.setValue(e).toNumber());
		r.forEach((e, t) => {
			n.addColorStop(e, a[t]);
		}), e.fill = { fill: n };
	}
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/utils/updateTextBounds.mjs
function Mr(e, t) {
	let { texture: n, bounds: r } = e, i = t._style._getFinalPadding();
	se(r, t._anchor, n);
	let a = t._anchor._x * i * 2, o = t._anchor._y * i * 2;
	r.minX -= i - a, r.minY -= i - o, r.maxX -= i - a, r.maxY -= i - o;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/canvas/BatchableText.mjs
var Nr = class extends Ee {}, Pr = class {
	constructor(e) {
		this._renderer = e, e.runners.resolutionChange.add(this), this._managedTexts = new H({
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
			(n.currentKey !== e.styleKey || e._resolution !== t) && this._updateGpuText(e), e._didTextUpdate = !1, Mr(n, e);
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
		let t = new Nr();
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
Pr.extension = {
	type: [
		k.WebGLPipes,
		k.WebGPUPipes,
		k.CanvasPipes
	],
	name: "text"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/shared/AbstractTextSystem.mjs
var Fr = class {
	constructor(e, t) {
		this._activeTextures = {}, this._renderer = e, this._retainCanvasContext = t;
	}
	getTexture(e, t, n, r) {
		typeof e == "string" && (i("8.0.0", "CanvasTextSystem.getTexture: Use object TextOptions instead of separate arguments"), e = {
			text: e,
			style: n,
			resolution: t
		}), e.style instanceof Ar || (e.style = new Ar(e.style)), e.textureStyle instanceof s || (e.textureStyle = new s(e.textureStyle)), typeof e.text != "string" && (e.text = e.text.toString());
		let { text: a, style: o, textureStyle: c, autoGenerateMipmaps: l } = e, u = e.resolution ?? this._renderer.resolution, { frame: d, canvasAndContext: f } = Or.getCanvasAndContext({
			text: a,
			style: o,
			resolution: u
		}), p = fe(f.canvas, d.width, d.height, u, l);
		if (c && (p.source.style = c), o.trim && (d.pad(o.padding), p.frame.copyFrom(d), p.frame.scale(1 / u), p.updateUvs()), o.filters) {
			let e = this._applyFilters(p, o.filters);
			return this.returnTexture(p), Or.returnCanvasAndContext(f), e;
		}
		return this._renderer.texture.initSource(p._source), this._retainCanvasContext || Or.returnCanvasAndContext(f), p;
	}
	returnTexture(e) {
		let t = e.source, n = t.resource;
		if (this._retainCanvasContext && n?.getContext) {
			let e = n.getContext("2d");
			e && Or.returnCanvasAndContext({
				canvas: n,
				context: e
			});
		}
		t.resource = null, t.uploadMethodId = "unknown", t.alphaMode = "no-premultiply-alpha", oe.returnTexture(e, !0);
	}
	renderTextToCanvas() {
		i("8.10.0", "CanvasTextSystem.renderTextToCanvas: no longer supported, use CanvasTextSystem.getTexture instead");
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
}, Ir = class extends Fr {
	constructor(e) {
		super(e, !0);
	}
};
Ir.extension = {
	type: [k.CanvasSystem],
	name: "canvasText"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/shared/GpuTextSystem.mjs
var Lr = class extends Fr {
	constructor(e) {
		super(e, !1);
	}
};
Lr.extension = {
	type: [k.WebGLSystem, k.WebGPUSystem],
	name: "canvasText"
}, e.add(Ir), e.add(Lr), e.add(Pr);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text/Text.mjs
var Rr = class extends Un {
	constructor(...e) {
		let t = Wn(e, "Text");
		super(t, Ar), this.renderPipeId = "text", t.textureStyle && (this.textureStyle = t.textureStyle instanceof s ? t.textureStyle : new s(t.textureStyle)), this.autoGenerateMipmaps = t.autoGenerateMipmaps ?? E.defaultOptions.autoGenerateMipmaps;
	}
	updateBounds() {
		let e = this._bounds, t = this._anchor, n = 0, r = 0;
		if (this._style.trim) {
			let { frame: e, canvasAndContext: t } = Or.getCanvasAndContext({
				text: this.text,
				style: this._style,
				resolution: 1
			});
			Or.returnCanvasAndContext(t), n = e.width, r = e.height;
		} else {
			let e = Y.measureText(this._text, this._style);
			n = e.width, r = e.height;
		}
		e.minX = -t._x * n, e.maxX = e.minX + n, e.minY = -t._y * r, e.maxY = e.minY + r;
	}
}, zr = class extends o {
	constructor() {
		super(...arguments), this.chars = /* @__PURE__ */ Object.create(null), this.lineHeight = 0, this.fontFamily = "", this.fontMetrics = {
			fontSize: 0,
			ascent: 0,
			descent: 0
		}, this.baseLineOffset = 0, this.distanceField = {
			type: "none",
			range: 0
		}, this.pages = [], this.applyFillAsTint = !0, this.baseMeasurementFontSize = 100, this.baseRenderedFontSize = 100;
	}
	get font() {
		return i(h, "BitmapFont.font is deprecated, please use BitmapFont.fontFamily instead."), this.fontFamily;
	}
	get pageTextures() {
		return i(h, "BitmapFont.pageTextures is deprecated, please use BitmapFont.pages instead."), this.pages;
	}
	get size() {
		return i(h, "BitmapFont.size is deprecated, please use BitmapFont.fontMetrics.fontSize instead."), this.fontMetrics.fontSize;
	}
	get distanceFieldRange() {
		return i(h, "BitmapFont.distanceFieldRange is deprecated, please use BitmapFont.distanceField.range instead."), this.distanceField.range;
	}
	get distanceFieldType() {
		return i(h, "BitmapFont.distanceFieldType is deprecated, please use BitmapFont.distanceField.type instead."), this.distanceField.type;
	}
	destroy(e = !1) {
		this.emit("destroy", this), this.removeAllListeners();
		for (let e in this.chars) this.chars[e].texture?.destroy();
		this.chars = null, e && (this.pages.forEach((e) => e.texture.destroy(!0)), this.pages = null);
	}
}, Br = class e extends zr {
	constructor(t) {
		super(), this.resolution = 1, this.pages = [], this._padding = 0, this._measureCache = /* @__PURE__ */ Object.create(null), this._currentChars = [], this._currentX = 0, this._currentY = 0, this._currentMaxCharHeight = 0, this._currentPageIndex = -1, this._skipKerning = !1;
		let n = {
			...e.defaultOptions,
			...t
		};
		this._textureSize = n.textureSize, this._mipmap = n.mipmap;
		let r = n.style.clone();
		n.overrideFill && (r._fill.color = 16777215, r._fill.alpha = 1, r._fill.texture = D.WHITE, r._fill.fill = null), this.applyFillAsTint = n.overrideFill;
		let i = r.fontSize;
		r.fontSize = this.baseMeasurementFontSize;
		let a = Cr(r);
		n.overrideSize ? (r._stroke && (r._stroke.width *= this.baseRenderedFontSize / i), r.dropShadow && (r.dropShadow.blur *= this.baseRenderedFontSize / i, r.dropShadow.distance *= this.baseRenderedFontSize / i)) : r.fontSize = this.baseRenderedFontSize = i, this._style = r, this._skipKerning = n.skipKerning ?? !1, this.resolution = n.resolution ?? 1, this._padding = n.padding ?? 4, n.textureStyle && (this._textureStyle = n.textureStyle instanceof s ? n.textureStyle : new s(n.textureStyle)), this.fontMetrics = Y.measureFont(a), this.lineHeight = r.lineHeight || this.fontMetrics.fontSize || r.fontSize;
	}
	ensureCharacters(e) {
		let t = Y.graphemeSegmenter(e).filter((e) => !this._currentChars.includes(e)).filter((e, t, n) => n.indexOf(e) === t);
		if (!t.length) return;
		this._currentChars = [...this._currentChars, ...t];
		let r;
		r = this._currentPageIndex === -1 ? this._nextPage() : this.pages[this._currentPageIndex];
		let { canvas: i, context: a } = r.canvasAndContext, o = r.texture.source, s = this._style, c = this._currentX, l = this._currentY, u = this._currentMaxCharHeight, d = this.baseRenderedFontSize / this.baseMeasurementFontSize, f = (s.dropShadow?.distance ?? 0) + (s._stroke?.width ?? 0), p = this._padding + f, m = !1, h = i.width / this.resolution, g = i.height / this.resolution;
		for (let e = 0; e < t.length; e++) {
			let r = t[e], f = Y.measureText(r, s, i, !1);
			f.lineHeight = f.height;
			let _ = f.width * d, v = Math.ceil((s.fontStyle === "italic" ? 2 : 1) * _), y = f.height * d, b = v + p * 2, x = y + p * 2;
			if (m = !1, r !== "\n" && r !== "\r" && r !== "	" && r !== " " && (m = !0, u = Math.ceil(Math.max(x, u))), c + b > h && (l += u, u = x, c = 0, l + u > g)) {
				o.update();
				let e = this._nextPage();
				i = e.canvasAndContext.canvas, a = e.canvasAndContext.context, o = e.texture.source, c = 0, l = 0, u = 0;
			}
			let S = a.measureText(r).width / d;
			if (this.chars[r] = {
				id: r.codePointAt(0),
				xOffset: -(p / d),
				yOffset: -(p / d),
				xAdvance: S,
				kerning: {}
			}, m) {
				this._drawGlyph(a, f, c + p, l + p, d, s);
				let e = o.width * d, t = o.height * d, i = new n(c / e * o.width, l / t * o.height, b / e * o.width, x / t * o.height);
				this.chars[r].texture = new D({
					source: o,
					frame: i
				}), c += Math.ceil(b);
			}
		}
		o.update(), this._currentX = c, this._currentY = l, this._currentMaxCharHeight = u, this._skipKerning || this._applyKerning(t, a, d);
	}
	get pageTextures() {
		return i(h, "BitmapFont.pageTextures is deprecated, please use BitmapFont.pages instead."), this.pages;
	}
	_applyKerning(e, t, n) {
		let r = this._measureCache;
		for (let i = 0; i < e.length; i++) {
			let a = e[i];
			for (let e = 0; e < this._currentChars.length; e++) {
				let i = this._currentChars[e], o = r[a];
				o ||= r[a] = t.measureText(a).width;
				let s = r[i];
				s ||= r[i] = t.measureText(i).width;
				let c = t.measureText(a + i).width, l = c - (o + s);
				l && this.chars[a] && (this.chars[a].kerning[i] = l / n), c = t.measureText(a + i).width, l = c - (o + s), l && this.chars[i] && (this.chars[i].kerning[a] = l / n);
			}
		}
	}
	_nextPage() {
		this._currentPageIndex++;
		let e = this.resolution, t = Ye.getOptimalCanvasAndContext(this._textureSize, this._textureSize, e);
		this._setupContext(t.context, this._style, e);
		let n = e * (this.baseRenderedFontSize / this.baseMeasurementFontSize), r = new D({ source: new I({
			resource: t.canvas,
			resolution: n,
			alphaMode: "premultiply-alpha-on-upload",
			autoGenerateMipmaps: this._mipmap
		}) });
		this._textureStyle && (r.source.style = this._textureStyle);
		let i = {
			canvasAndContext: t,
			texture: r
		};
		return this.pages[this._currentPageIndex] = i, i;
	}
	_setupContext(e, t, n) {
		t.fontSize = this.baseRenderedFontSize, e.scale(n, n), e.font = Cr(t), t.fontSize = this.baseMeasurementFontSize, e.textBaseline = t.textBaseline;
		let r = t._stroke, i = r?.width ?? 0;
		if (r && (e.lineWidth = i, e.lineJoin = r.join, e.miterLimit = r.miterLimit, e.strokeStyle = Tr(r, e)), t._fill && (e.fillStyle = Tr(t._fill, e)), t.dropShadow) {
			let r = t.dropShadow, i = O.shared.setValue(r.color).toArray(), a = r.blur * n, o = r.distance * n;
			e.shadowColor = `rgba(${i[0] * 255},${i[1] * 255},${i[2] * 255},${r.alpha})`, e.shadowBlur = a, e.shadowOffsetX = Math.cos(r.angle) * o, e.shadowOffsetY = Math.sin(r.angle) * o;
		} else e.shadowColor = "black", e.shadowBlur = 0, e.shadowOffsetX = 0, e.shadowOffsetY = 0;
	}
	_drawGlyph(e, t, n, r, i, a) {
		let o = t.text, s = t.fontProperties, c = (a._stroke?.width ?? 0) * i, l = n + c / 2, u = r - c / 2, d = s.descent * i, f = t.lineHeight * i, p = !1;
		a.stroke && c && (p = !0, e.strokeText(o, l, u + f - d));
		let { shadowBlur: m, shadowOffsetX: h, shadowOffsetY: g } = e;
		a._fill && (p && (e.shadowBlur = 0, e.shadowOffsetX = 0, e.shadowOffsetY = 0), e.fillText(o, l, u + f - d)), p && (e.shadowBlur = m, e.shadowOffsetX = h, e.shadowOffsetY = g);
	}
	destroy() {
		super.destroy();
		for (let e = 0; e < this.pages.length; e++) {
			let { canvasAndContext: t, texture: n } = this.pages[e];
			Ye.returnCanvasAndContext(t), n.destroy(!0);
		}
		this.pages = null;
	}
};
Br.defaultOptions = {
	textureSize: 512,
	style: new Ar(),
	mipmap: !0
};
var Vr = Br;
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text-bitmap/utils/getBitmapTextLayout.mjs
function Hr(e, t, n, r) {
	let i = {
		width: 0,
		height: 0,
		offsetY: 0,
		scale: t.fontSize / n.baseMeasurementFontSize,
		lines: [{
			width: 0,
			charPositions: [],
			spaceWidth: 0,
			spacesIndex: [],
			chars: []
		}]
	};
	i.offsetY = n.baseLineOffset;
	let a = i.lines[0], o = null, s = !0, c = {
		spaceWord: !1,
		width: 0,
		start: 0,
		index: 0,
		positions: [],
		chars: []
	}, l = n.baseMeasurementFontSize / t.fontSize, u = t.letterSpacing * l, d = t.wordWrapWidth * l, f = t.lineHeight ? t.lineHeight * l : n.lineHeight, p = t.wordWrap && t.breakWords, m = ur(t.whiteSpace), h = dr(t.whiteSpace);
	if (m || h) {
		let t = [], n = m;
		for (let r = 0; r < e.length; r++) {
			let i = e[r];
			if (i === "\r" || i === "\n") {
				if (h) i === "\r" && e[r + 1] === "\n" && r++, i = " ";
				else {
					m && (n = !0), t.push(i);
					continue;
				}
			}
			if (K(i)) {
				if (m && cr(i)) {
					if (n) continue;
					n = !0, t.push(" ");
				} else n = !1, t.push(i);
			} else n = !1, t.push(i);
		}
		e = t;
	}
	let g = (e) => {
		let t = a.width;
		for (let n = 0; n < c.index; n++) {
			let r = e.positions[n];
			a.chars.push(e.chars[n]), a.charPositions.push(r + t);
		}
		a.width += e.width, (c.index > 0 || !m) && (s = !1), c.width = 0, c.index = 0, c.chars.length = 0;
	}, _ = () => {
		let e = a.chars.length - 1;
		if (r) {
			let t = a.chars[e];
			for (; cr(t);) a.width -= n.chars[t].xAdvance, a.spacesIndex.pop(), t = a.chars[--e];
		}
		i.width = Math.max(i.width, a.width), a = {
			width: 0,
			charPositions: [],
			chars: [],
			spaceWidth: 0,
			spacesIndex: []
		}, s = !0, i.lines.push(a), i.height += f;
	}, v = (e) => e - u > d;
	for (let r = 0; r < e.length + 1; r++) {
		let i, l = r === e.length;
		l || (i = e[r]);
		let d = n.chars[i];
		if (/(?:\s)/.test(i) || i === "\r" || i === "\n" || l) {
			if (!s && t.wordWrap && v(a.width + c.width) ? (_(), g(c), !l && d && a.charPositions.push(0)) : (c.start = a.width, g(c), !l && d && a.charPositions.push(0)), i === "\r" || i === "\n") _();
			else if (!l && d) {
				let e = d.xAdvance + (d.kerning?.[o] || 0) + u;
				a.width += e, a.spaceWidth = e, a.spacesIndex.push(a.charPositions.length), a.chars.push(i);
			}
		} else if (d) {
			let e = d.kerning?.[o] || 0, n = d.xAdvance + e + u;
			p && v(c.width + n) && (s || _(), g(c), _()), c.positions[c.index++] = c.width + e, c.chars.push(i), c.width += n, lr(i) && (!s && t.wordWrap && v(a.width + c.width) && _(), g(c));
		}
		o = i;
	}
	return _(), t.align === "center" ? Ur(i) : t.align === "right" ? Wr(i) : t.align === "justify" && Gr(i), i;
}
function Ur(e) {
	for (let t = 0; t < e.lines.length; t++) {
		let n = e.lines[t], r = e.width / 2 - n.width / 2;
		for (let e = 0; e < n.charPositions.length; e++) n.charPositions[e] += r;
	}
}
function Wr(e) {
	for (let t = 0; t < e.lines.length; t++) {
		let n = e.lines[t], r = e.width - n.width;
		for (let e = 0; e < n.charPositions.length; e++) n.charPositions[e] += r;
	}
}
function Gr(e) {
	let t = e.width;
	for (let n = 0; n < e.lines.length - 2; n++) {
		let r = e.lines[n], i = 0, a = r.spacesIndex[i++], o = 0, s = r.spacesIndex.length, c = (t - r.width) / s;
		for (let e = 0; e < r.charPositions.length; e++) e === a && (a = r.spacesIndex[i++], o += c), r.charPositions[e] += o;
	}
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text-bitmap/utils/resolveCharacters.mjs
function Kr(e) {
	if (e === "") return [];
	typeof e == "string" && (e = [e]);
	let t = [];
	for (let n = 0, r = e.length; n < r; n++) {
		let r = e[n];
		if (Array.isArray(r)) {
			if (r.length !== 2) throw Error(`[BitmapFont]: Invalid character range length, expecting 2 got ${r.length}.`);
			if (r[0].length === 0 || r[1].length === 0) throw Error("[BitmapFont]: Invalid character delimiter.");
			let e = r[0].charCodeAt(0), n = r[1].charCodeAt(0);
			if (n < e) throw Error("[BitmapFont]: Invalid character range.");
			for (let r = e, i = n; r <= i; r++) t.push(String.fromCharCode(r));
		} else t.push(...Array.from(r));
	}
	if (t.length === 0) throw Error("[BitmapFont]: Empty set when resolving characters.");
	return t;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/text-bitmap/BitmapFontManager.mjs
var qr = 0, Jr = new class {
	constructor() {
		this.ALPHA = [
			["a", "z"],
			["A", "Z"],
			" "
		], this.NUMERIC = [["0", "9"]], this.ALPHANUMERIC = [
			["a", "z"],
			["A", "Z"],
			["0", "9"],
			" "
		], this.ASCII = [[" ", "~"]], this.defaultOptions = {
			chars: this.ALPHANUMERIC,
			resolution: 1,
			padding: 4,
			skipKerning: !1,
			textureStyle: null
		}, this.measureCache = Xn(1e3);
	}
	getFont(e, t) {
		let n = `${t.fontFamily}-bitmap`, r = !0;
		if (z.has(n)) {
			let t = z.get(n);
			return t.ensureCharacters?.(e), t;
		}
		if (t._fill.fill && !t._stroke ? (n += t._fill.fill.styleKey, r = !1) : (t._stroke || t.dropShadow) && (n = `${t.styleKey}-bitmap`, r = !1), n += `-${t.fontStyle}`, n += `-${t.fontVariant}`, n += `-${t.fontWeight}`, !z.has(n)) {
			let e = Object.create(t);
			e._lineHeight = 0;
			let i = new Vr({
				style: e,
				overrideFill: r,
				overrideSize: !0,
				...this.defaultOptions
			});
			qr++, qr > 50 && T("BitmapText", `You have dynamically created ${qr} bitmap fonts, this can be inefficient. Try pre installing your font styles using \`BitmapFont.install({name:"style1", style})\``), i.once("destroy", () => {
				qr--, z.remove(n);
			}), z.set(n, i);
		}
		let i = z.get(n);
		return i.ensureCharacters?.(e), i;
	}
	getLayout(e, t, n = !0) {
		let r = this.getFont(e, t), i = `${e}-${t.styleKey}-${n}`;
		if (this.measureCache.has(i)) return this.measureCache.get(i);
		let a = Hr(Y.graphemeSegmenter(e), t, r, n);
		return this.measureCache.set(i, a), a;
	}
	measureText(e, t, n = !0) {
		return this.getLayout(e, t, n);
	}
	install(...e) {
		let t = e[0];
		typeof t == "string" && (t = {
			name: t,
			style: e[1],
			chars: e[2]?.chars,
			resolution: e[2]?.resolution,
			padding: e[2]?.padding,
			skipKerning: e[2]?.skipKerning
		}, i(h, "BitmapFontManager.install(name, style, options) is deprecated, use BitmapFontManager.install({name, style, ...options})"));
		let n = t?.name;
		if (!n) throw Error("[BitmapFontManager] Property `name` is required.");
		t = {
			...this.defaultOptions,
			...t
		};
		let r = t.style, a = r instanceof Ar ? r : new Ar(r), o = new Vr({
			style: a,
			overrideFill: t.dynamicFill ?? this._canUseTintForStyle(a),
			skipKerning: t.skipKerning,
			padding: t.padding,
			resolution: t.resolution,
			overrideSize: !1,
			textureStyle: t.textureStyle
		}), s = Kr(t.chars);
		return o.ensureCharacters(s.join("")), z.set(`${n}-bitmap`, o), o.once("destroy", () => z.remove(`${n}-bitmap`)), o;
	}
	uninstall(e) {
		let t = `${e}-bitmap`, n = z.get(t);
		n && n.destroy();
	}
	_canUseTintForStyle(e) {
		return !e._stroke && (!e.dropShadow || e.dropShadow.color === 0) && !e._fill.fill && e._fill.color === 16777215;
	}
}();
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/utils/browser/isSafari.mjs
function Yr() {
	let { userAgent: e } = b.get().getNavigator();
	return /^((?!chrome|android).)*safari/i.test(e);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/batcher/canvas/CanvasBatchAdaptor.mjs
var Xr = class e {
	static _getPatternRepeat(e, t) {
		let n = e && e !== "clamp-to-edge", r = t && t !== "clamp-to-edge";
		return n && r ? "repeat" : n ? "repeat-x" : r ? "repeat-y" : "no-repeat";
	}
	start(e, t, n) {}
	execute(t, n) {
		let i = n.elements;
		if (!i || !i.length) return;
		let a = t.renderer, o = a.canvasContext, s = o.activeContext;
		for (let t = 0; t < i.length; t++) {
			let c = i[t];
			if (!c.packAsQuad) continue;
			let l = c, u = l.texture, d = u ? L.getCanvasSource(u) : null;
			if (!d) continue;
			let p = u.source.style, m = o.smoothProperty, h = p.scaleMode !== "nearest";
			s[m] !== h && (s[m] = h), o.setBlendMode(n.blendMode);
			let g = a.globalUniforms.globalUniformData?.worldColor ?? 4294967295, _ = l.color, v = (g >>> 24 & 255) / 255, y = (_ >>> 24 & 255) / 255, b = a.filter?.alphaMultiplier ?? 1, x = v * y * b;
			if (x <= 0) continue;
			s.globalAlpha = x;
			let S = g & 16777215, C = _ & 16777215, w = ne(f(C, S)), T = u.frame, E = p.addressModeU ?? p.addressMode, D = p.addressModeV ?? p.addressMode, O = e._getPatternRepeat(E, D), k = u.source._resolution ?? u.source.resolution ?? 1, ee = l.renderable?.renderGroup?.isCachedAsTexture, te = T.x * k, A = T.y * k, re = T.width * k, j = T.height * k, M = l.bounds, ie = a.renderTarget.renderTarget.isRoot, ae = M.minX, oe = M.minY, se = M.maxX - M.minX, N = M.maxY - M.minY, ce = u.rotate, P = u.uvs, le = Math.min(P.x0, P.x1, P.x2, P.x3, P.y0, P.y1, P.y2, P.y3), ue = Math.max(P.x0, P.x1, P.x2, P.x3, P.y0, P.y1, P.y2, P.y3), de = O !== "no-repeat" && (le < 0 || ue > 1), F = ce && !(!de && (w !== 16777215 || ce));
			F ? (e._tempPatternMatrix.copyFrom(l.transform), r.matrixAppendRotationInv(e._tempPatternMatrix, ce, ae, oe, se, N), o.setContextTransform(e._tempPatternMatrix, l.roundPixels === 1, void 0, ee && ie)) : o.setContextTransform(l.transform, l.roundPixels === 1, void 0, ee && ie);
			let fe = se, pe = N, I = F ? 0 : ae, R = F ? 0 : oe;
			if (!F && l.roundPixels === 1 && (I |= 0, R |= 0), de) {
				let t = d, n = w !== 16777215 && !ce, r = T.width <= u.source.width && T.height <= u.source.height;
				n && r && (t = L.getTintedCanvas({ texture: u }, w));
				let i = s.createPattern(t, O);
				if (!i) continue;
				let a = fe, o = pe;
				if (a === 0 || o === 0) continue;
				let c = 1 / a, l = 1 / o, f = (P.x1 - P.x0) * c, p = (P.y1 - P.y0) * c, m = (P.x3 - P.x0) * l, h = (P.y3 - P.y0) * l, g = P.x0 - f * I - m * R, _ = P.y0 - p * I - h * R, v = u.source.pixelWidth, y = u.source.pixelHeight;
				e._tempPatternMatrix.set(f * v, p * y, m * v, h * y, g * v, _ * y), L.applyPatternTransform(i, e._tempPatternMatrix), s.fillStyle = i, s.fillRect(I, R, fe, pe);
			} else {
				let e = w !== 16777215 || ce ? L.getTintedCanvas({ texture: u }, w) : d, t = e !== d;
				s.drawImage(e, t ? 0 : te, t ? 0 : A, t ? e.width : re, t ? e.height : j, I, R, fe, pe);
			}
		}
	}
};
Xr._tempPatternMatrix = new a(), Xr.extension = {
	type: [k.CanvasPipesAdaptor],
	name: "batch"
};
var Zr = Xr, Qr = class {
	constructor() {
		this._tempState = j.for2d(), this._didUploadHash = {};
	}
	init(e) {
		e.renderer.runners.contextChange.add(this);
	}
	contextChange() {
		this._didUploadHash = {};
	}
	start(e, t, n) {
		let r = e.renderer, i = this._didUploadHash[n.uid];
		r.shader.bind(n, i), i || (this._didUploadHash[n.uid] = !0), r.shader.updateUniformGroup(r.globalUniforms.uniformGroup), r.geometry.bind(t, n.glProgram);
	}
	execute(e, t) {
		let n = e.renderer;
		this._tempState.blendMode = t.blendMode, n.state.set(this._tempState);
		let r = t.textures.textures;
		for (let e = 0; e < t.textures.count; e++) n.texture.bind(r[e], e);
		n.geometry.draw(t.topology, t.size, t.start);
	}
};
Qr.extension = {
	type: [k.WebGLPipesAdaptor],
	name: "batch"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/batcher/gpu/GpuBatchAdaptor.mjs
var $r = j.for2d(), ei = class {
	start(e, t, n) {
		let r = e.renderer, i = r.encoder, a = n.gpuProgram;
		this._shader = n, this._geometry = t, i.setGeometry(t, a), $r.blendMode = "normal", r.pipeline.getPipeline(t, a, $r);
		let o = r.globalUniforms.bindGroup;
		i.resetBindGroup(1), i.setBindGroup(0, o, a);
	}
	execute(e, t) {
		let n = this._shader.gpuProgram, r = e.renderer, i = r.encoder;
		if (!t.bindGroup) {
			let e = t.textures;
			t.bindGroup = Ie(e.textures, e.count, r.limits.maxBatchableTextures);
		}
		$r.blendMode = t.blendMode;
		let a = r.bindGroup.getBindGroup(t.bindGroup, n, 1), o = r.pipeline.getPipeline(this._geometry, n, $r, t.topology);
		t.bindGroup._touch(r.gc.now, r.tick), i.setPipeline(o), i.renderPassEncoder.setBindGroup(1, a), i.renderPassEncoder.drawIndexed(t.size, 1, t.start);
	}
};
ei.extension = {
	type: [k.WebGPUPipesAdaptor],
	name: "batch"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/mask/color/CanvasColorMaskPipe.mjs
var ti = class {
	constructor(e) {
		this._colorStack = [], this._colorStackIndex = 0, this._currentColor = 0, this._renderer = e;
	}
	buildStart() {
		this._colorStack[0] = 15, this._colorStackIndex = 1, this._currentColor = 15;
	}
	push(e, t, n) {
		this._renderer.renderPipes.batch.break(n);
		let r = this._colorStack;
		r[this._colorStackIndex] = r[this._colorStackIndex - 1] & e.mask;
		let i = this._colorStack[this._colorStackIndex];
		i !== this._currentColor && (this._currentColor = i, n.add({
			renderPipeId: "colorMask",
			colorMask: i,
			canBundle: !1
		})), this._colorStackIndex++;
	}
	pop(e, t, n) {
		this._renderer.renderPipes.batch.break(n);
		let r = this._colorStack;
		this._colorStackIndex--;
		let i = r[this._colorStackIndex - 1];
		i !== this._currentColor && (this._currentColor = i, n.add({
			renderPipeId: "colorMask",
			colorMask: i,
			canBundle: !1
		}));
	}
	execute(e) {}
	destroy() {
		this._renderer = null, this._colorStack = null;
	}
};
ti.extension = {
	type: [k.CanvasPipes],
	name: "colorMask"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/mask/stencil/CanvasStencilMaskPipe.mjs
function ni(e, t, n, r, i, a) {
	a = Math.max(0, Math.min(a, Math.min(r, i) / 2)), e.moveTo(t + a, n), e.lineTo(t + r - a, n), e.quadraticCurveTo(t + r, n, t + r, n + a), e.lineTo(t + r, n + i - a), e.quadraticCurveTo(t + r, n + i, t + r - a, n + i), e.lineTo(t + a, n + i), e.quadraticCurveTo(t, n + i, t, n + i - a), e.lineTo(t, n + a), e.quadraticCurveTo(t, n, t + a, n);
}
function ri(e, t) {
	switch (t.type) {
		case "rectangle": {
			let n = t;
			e.rect(n.x, n.y, n.width, n.height);
			break;
		}
		case "roundedRectangle": {
			let n = t;
			ni(e, n.x, n.y, n.width, n.height, n.radius);
			break;
		}
		case "circle": {
			let n = t;
			e.moveTo(n.x + n.radius, n.y), e.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
			break;
		}
		case "ellipse": {
			let n = t;
			e.ellipse ? (e.moveTo(n.x + n.halfWidth, n.y), e.ellipse(n.x, n.y, n.halfWidth, n.halfHeight, 0, 0, Math.PI * 2)) : (e.save(), e.translate(n.x, n.y), e.scale(n.halfWidth, n.halfHeight), e.moveTo(1, 0), e.arc(0, 0, 1, 0, Math.PI * 2), e.restore());
			break;
		}
		case "triangle": {
			let n = t;
			e.moveTo(n.x, n.y), e.lineTo(n.x2, n.y2), e.lineTo(n.x3, n.y3), e.closePath();
			break;
		}
		default: {
			let n = t, r = n.points;
			if (!r?.length) break;
			e.moveTo(r[0], r[1]);
			for (let t = 2; t < r.length; t += 2) e.lineTo(r[t], r[t + 1]);
			n.closePath && e.closePath();
			break;
		}
	}
}
function ii(e, t, n) {
	let r = [], i = [], a = [];
	if (!Me[t.type]?.build(t, r)) return !1;
	let o = t.closePath ?? !0;
	Ae(r, n, !1, o, i, a);
	for (let t = 0; t < a.length; t += 3) {
		let n = a[t] * 2, r = a[t + 1] * 2, o = a[t + 2] * 2;
		e.moveTo(i[n], i[n + 1]), e.lineTo(i[r], i[r + 1]), e.lineTo(i[o], i[o + 1]), e.closePath();
	}
	return !0;
}
function ai(e, t) {
	if (!t?.length) return !1;
	for (let n = 0; n < t.length; n++) {
		let r = t[n];
		if (!r?.shape) continue;
		let i = r.transform, a = i && !i.isIdentity();
		a && (e.save(), e.transform(i.a, i.b, i.c, i.d, i.tx, i.ty)), ri(e, r.shape), a && e.restore();
	}
	return !0;
}
var oi = class {
	constructor(e) {
		this._warnedMaskTypes = /* @__PURE__ */ new Set(), this._canvasMaskStack = [], this._renderer = e;
	}
	push(e, t, n) {
		this._renderer.renderPipes.batch.break(n), n.add({
			renderPipeId: "stencilMask",
			action: "pushMaskBegin",
			mask: e,
			inverse: t._maskOptions.inverse,
			canBundle: !1
		});
	}
	pop(e, t, n) {
		this._renderer.renderPipes.batch.break(n), n.add({
			renderPipeId: "stencilMask",
			action: "popMaskEnd",
			mask: e,
			inverse: t._maskOptions.inverse,
			canBundle: !1
		});
	}
	execute(e) {
		if (e.action !== "pushMaskBegin" && e.action !== "popMaskEnd") return;
		let t = this._renderer, n = t.canvasContext, r = n?.activeContext;
		if (!r) return;
		if (e.action === "popMaskEnd") {
			this._canvasMaskStack.pop() && r.restore();
			return;
		}
		e.inverse && this._warnOnce("inverse", "CanvasRenderer: inverse masks are not supported on Canvas2D; ignoring inverse flag.");
		let i = e.mask.mask;
		if (!(i instanceof U)) {
			this._warnOnce("nonGraphics", "CanvasRenderer: only Graphics masks are supported in Canvas2D; skipping mask."), this._canvasMaskStack.push(!1);
			return;
		}
		let a = i, o = a.context?.instructions;
		if (!o?.length) {
			this._canvasMaskStack.push(!1);
			return;
		}
		r.save(), n.setContextTransform(a.groupTransform, (t._roundPixels | a._roundPixels) === 1), r.beginPath();
		let s = !1, c = !1;
		for (let e = 0; e < o.length; e++) {
			let t = o[e], n = t.action;
			if (n !== "fill" && n !== "stroke") continue;
			let i = t.data, a = i?.path?.shapePath;
			if (!a?.shapePrimitives?.length) continue;
			let l = n === "stroke", u = a.shapePrimitives;
			for (let e = 0; e < u.length; e++) {
				let t = u[e];
				if (!t?.shape) continue;
				let n = t.transform, a = n && !n.isIdentity();
				a && (r.save(), r.transform(n.a, n.b, n.c, n.d, n.tx, n.ty)), l && i.style ? s = ii(r, t.shape, i.style) || s : (ri(r, t.shape), c = ai(r, t.holes) || c, s = !0), a && r.restore();
			}
		}
		if (!s) {
			r.restore(), this._canvasMaskStack.push(!1);
			return;
		}
		c ? r.clip("evenodd") : r.clip(), this._canvasMaskStack.push(!0);
	}
	destroy() {
		this._renderer = null, this._warnedMaskTypes = null, this._canvasMaskStack = null;
	}
	_warnOnce(e, t) {
		this._warnedMaskTypes.has(e) || (this._warnedMaskTypes.add(e), T(t));
	}
};
oi.extension = {
	type: [k.CanvasPipes],
	name: "stencilMask"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/canvas/utils/mapCanvasBlendModesToPixi.mjs
var X = "source-over";
function si() {
	let e = pe(), t = /* @__PURE__ */ Object.create(null);
	return t.inherit = X, t.none = X, t.normal = "source-over", t.add = "lighter", t.multiply = e ? "multiply" : X, t.screen = e ? "screen" : X, t.overlay = e ? "overlay" : X, t.darken = e ? "darken" : X, t.lighten = e ? "lighten" : X, t["color-dodge"] = e ? "color-dodge" : X, t["color-burn"] = e ? "color-burn" : X, t["hard-light"] = e ? "hard-light" : X, t["soft-light"] = e ? "soft-light" : X, t.difference = e ? "difference" : X, t.exclusion = e ? "exclusion" : X, t.saturation = e ? "saturation" : X, t.color = e ? "color" : X, t.luminosity = e ? "luminosity" : X, t["linear-burn"] = e ? "color-burn" : X, t["linear-dodge"] = e ? "color-dodge" : X, t["linear-light"] = e ? "hard-light" : X, t["pin-light"] = e ? "hard-light" : X, t["vivid-light"] = e ? "hard-light" : X, t["hard-mix"] = X, t.negation = e ? "difference" : X, t["normal-npm"] = t.normal, t["add-npm"] = t.add, t["screen-npm"] = t.screen, t.erase = "destination-out", t.subtract = X, t.divide = X, t.min = X, t.max = X, t;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/canvas/CanvasContextSystem.mjs
var ci = new a(), li = class {
	constructor(e) {
		this.activeResolution = 1, this.smoothProperty = "imageSmoothingEnabled", this.blendModes = si(), this._activeBlendMode = "normal", this._projTransform = null, this._outerBlend = !1, this._warnedBlendModes = /* @__PURE__ */ new Set(), this._renderer = e;
	}
	resolutionChange(e) {
		this.activeResolution = e;
	}
	init() {
		let e = this._renderer.background.alpha < 1;
		if (this.rootContext = this._renderer.canvas.getContext("2d", { alpha: e }), this.activeContext = this.rootContext, this.activeResolution = this._renderer.resolution, !this.rootContext.imageSmoothingEnabled) {
			let e = this.rootContext;
			e.webkitImageSmoothingEnabled ? this.smoothProperty = "webkitImageSmoothingEnabled" : e.mozImageSmoothingEnabled ? this.smoothProperty = "mozImageSmoothingEnabled" : e.oImageSmoothingEnabled ? this.smoothProperty = "oImageSmoothingEnabled" : e.msImageSmoothingEnabled && (this.smoothProperty = "msImageSmoothingEnabled");
		}
	}
	setContextTransform(e, t, n, r) {
		let i = r ? a.IDENTITY : this._renderer.globalUniforms.globalUniformData?.worldTransformMatrix || a.IDENTITY, o = ci;
		o.copyFrom(i), o.append(e);
		let s = this._projTransform, c = this.activeResolution;
		if (n ||= c, s) {
			let e = a.shared;
			e.copyFrom(o), e.prepend(s), o = e;
		}
		t ? this.activeContext.setTransform(o.a * n, o.b * n, o.c * n, o.d * n, o.tx * c | 0, o.ty * c | 0) : this.activeContext.setTransform(o.a * n, o.b * n, o.c * n, o.d * n, o.tx * c, o.ty * c);
	}
	clear(e, t) {
		let n = this.activeContext, r = this._renderer;
		if (n.clearRect(0, 0, r.width, r.height), e) {
			let i = O.shared.setValue(e);
			n.globalAlpha = t ?? i.alpha, n.fillStyle = i.toHex(), n.fillRect(0, 0, r.width, r.height), n.globalAlpha = 1;
		}
	}
	setBlendMode(e) {
		if (this._activeBlendMode === e) return;
		this._activeBlendMode = e, this._outerBlend = !1;
		let t = this.blendModes[e];
		if (!t) {
			this._warnedBlendModes.has(e) || (console.warn(`CanvasRenderer: blend mode "${e}" is not supported in Canvas2D; falling back to "source-over".`), this._warnedBlendModes.add(e)), this.activeContext.globalCompositeOperation = "source-over";
			return;
		}
		this.activeContext.globalCompositeOperation = t;
	}
	destroy() {
		this.rootContext = null, this.activeContext = null, this._warnedBlendModes.clear();
	}
};
li.extension = {
	type: [k.CanvasSystem],
	name: "canvasContext"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/canvas/CanvasLimitsSystem.mjs
var ui = class {
	constructor() {
		this.maxTextures = 16, this.maxBatchableTextures = 16, this.maxUniformBindings = 0;
	}
	init() {}
};
ui.extension = {
	type: [k.CanvasSystem],
	name: "limits"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/graphics/canvas/CanvasGraphicsAdaptor.mjs
var di = "#808080", fi = new a(), pi = new a(), mi = new a(), hi = new a();
function gi(e, t, n) {
	e.beginPath();
	for (let r = 0; r < n.length; r += 3) {
		let i = n[r] * 2, a = n[r + 1] * 2, o = n[r + 2] * 2;
		e.moveTo(t[i], t[i + 1]), e.lineTo(t[a], t[a + 1]), e.lineTo(t[o], t[o + 1]), e.closePath();
	}
	e.fill();
}
function _i(e) {
	return `#${(e & 16777215).toString(16).padStart(6, "0")}`;
}
function vi(e, t, n, r, i, a) {
	a = Math.max(0, Math.min(a, Math.min(r, i) / 2)), e.moveTo(t + a, n), e.lineTo(t + r - a, n), e.quadraticCurveTo(t + r, n, t + r, n + a), e.lineTo(t + r, n + i - a), e.quadraticCurveTo(t + r, n + i, t + r - a, n + i), e.lineTo(t + a, n + i), e.quadraticCurveTo(t, n + i, t, n + i - a), e.lineTo(t, n + a), e.quadraticCurveTo(t, n, t + a, n);
}
function yi(e, t) {
	switch (t.type) {
		case "rectangle": {
			let n = t;
			e.rect(n.x, n.y, n.width, n.height);
			break;
		}
		case "roundedRectangle": {
			let n = t;
			vi(e, n.x, n.y, n.width, n.height, n.radius);
			break;
		}
		case "circle": {
			let n = t;
			e.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
			break;
		}
		case "ellipse": {
			let n = t;
			e.ellipse ? e.ellipse(n.x, n.y, n.halfWidth, n.halfHeight, 0, 0, Math.PI * 2) : (e.save(), e.translate(n.x, n.y), e.scale(n.halfWidth, n.halfHeight), e.arc(0, 0, 1, 0, Math.PI * 2), e.restore());
			break;
		}
		case "triangle": {
			let n = t;
			e.moveTo(n.x, n.y), e.lineTo(n.x2, n.y2), e.lineTo(n.x3, n.y3), e.closePath();
			break;
		}
		default: {
			let n = t, r = n.points;
			if (!r?.length) break;
			e.moveTo(r[0], r[1]);
			for (let t = 2; t < r.length; t += 2) e.lineTo(r[t], r[t + 1]);
			n.closePath && e.closePath();
			break;
		}
	}
}
function bi(e, t) {
	if (!t?.length) return !1;
	for (let n = 0; n < t.length; n++) {
		let r = t[n];
		if (!r?.shape) continue;
		let i = r.transform, a = i && !i.isIdentity();
		a && (e.save(), e.transform(i.a, i.b, i.c, i.d, i.tx, i.ty)), yi(e, r.shape), a && e.restore();
	}
	return !0;
}
function xi(e, t, n, r) {
	let i = e.fill;
	if (i instanceof Oe) {
		i.buildGradient();
		let a = i.texture;
		if (a) {
			let o = L.getTintedPattern(a, t), s = n ? hi.copyFrom(n).scale(a.source.pixelWidth, a.source.pixelHeight) : hi.copyFrom(i.transform);
			return r && !e.textureSpace && s.append(r), L.applyPatternTransform(o, s), o;
		}
	}
	if (i instanceof ke) {
		let e = L.getTintedPattern(i.texture, t);
		return L.applyPatternTransform(e, i.transform, !1), e;
	}
	let a = e.texture;
	if (a && a !== D.WHITE) {
		if (!a.source.resource) return di;
		let r = L.getTintedPattern(a, t), i = n ? hi.copyFrom(n).scale(a.source.pixelWidth, a.source.pixelHeight) : e.matrix;
		return L.applyPatternTransform(r, i), r;
	}
	return _i(t);
}
var Si = class {
	constructor() {
		this.shader = null;
	}
	contextChange(e) {}
	execute(e, t) {
		let n = e.renderer, i = n.canvasContext, a = i.activeContext, o = t.groupTransform, s = n.globalUniforms.globalUniformData?.worldColor ?? 4294967295, c = t.groupColorAlpha, l = (s >>> 24 & 255) / 255, u = (c >>> 24 & 255) / 255, d = n.filter?.alphaMultiplier ?? 1, p = l * u * d;
		if (p <= 0) return;
		let m = s & 16777215, h = c & 16777215, g = ne(f(h, m)), _ = n._roundPixels | t._roundPixels;
		a.save(), i.setContextTransform(o, _ === 1), i.setBlendMode(t.groupBlendMode);
		let v = t.context.instructions;
		for (let e = 0; e < v.length; e++) {
			let t = v[e];
			if (t.action === "texture") {
				let e = t.data, n = e.image, s = n ? L.getCanvasSource(n) : null;
				if (!s) continue;
				let c = e.alpha * p;
				if (c <= 0) continue;
				let l = f(e.style, g);
				a.globalAlpha = c;
				let u = s;
				l !== 16777215 && (u = L.getTintedCanvas({ texture: n }, l));
				let d = n.frame, m = n.source._resolution ?? n.source.resolution ?? 1, h = d.x * m, v = d.y * m, y = d.width * m, b = d.height * m;
				u !== s && (h = 0, v = 0);
				let x = e.transform, S = x && !x.isIdentity(), C = n.rotate;
				S || C ? (fi.copyFrom(o), S && fi.append(x), C && r.matrixAppendRotationInv(fi, C, e.dx, e.dy, e.dw, e.dh), i.setContextTransform(fi, _ === 1)) : i.setContextTransform(o, _ === 1), a.drawImage(u, h, v, u === s ? y : u.width, u === s ? b : u.height, C ? 0 : e.dx, C ? 0 : e.dy, e.dw, e.dh), (S || C) && i.setContextTransform(o, _ === 1);
				continue;
			}
			let n = t.data, s = n?.path?.shapePath;
			if (!s?.shapePrimitives?.length) continue;
			let c = n.style, l = f(c.color, g), u = c.alpha * p;
			if (u <= 0) continue;
			let d = t.action === "stroke";
			if (a.globalAlpha = u, d) {
				let e = c;
				a.lineWidth = e.width, a.lineCap = e.cap, a.lineJoin = e.join, a.miterLimit = e.miterLimit;
			}
			let m = s.shapePrimitives;
			if (!d && n.hole?.shapePath?.shapePrimitives?.length) {
				let e = m[m.length - 1];
				e.holes = n.hole.shapePath.shapePrimitives;
			}
			for (let e = 0; e < m.length; e++) {
				let t = m[e];
				if (!t?.shape) continue;
				let n = t.transform, r = n && !n.isIdentity(), i = c.texture && c.texture !== D.WHITE, s = c.textureSpace === "global" ? n : null, u = xi(c, l, i ? Pe(pi, c, t.shape, s) : null, r ? mi.copyFrom(o).append(n) : o);
				if (r && (a.save(), a.transform(n.a, n.b, n.c, n.d, n.tx, n.ty)), d) {
					let e = c;
					if (e.alignment !== .5 && !e.pixelLine) {
						let n = [], r = [], i = [];
						if (Me[t.shape.type]?.build(t.shape, n)) {
							let o = t.shape.closePath ?? !0;
							Ae(n, e, !1, o, r, i), a.fillStyle = u, gi(a, r, i);
						} else a.strokeStyle = u, a.beginPath(), yi(a, t.shape), a.stroke();
					} else a.strokeStyle = u, a.beginPath(), yi(a, t.shape), a.stroke();
				} else a.fillStyle = u, a.beginPath(), yi(a, t.shape), bi(a, t.holes) ? a.fill("evenodd") : a.fill();
				r && a.restore();
			}
		}
		a.restore();
	}
	destroy() {
		this.shader = null;
	}
};
Si.extension = {
	type: [k.CanvasPipesAdaptor],
	name: "graphics"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/canvas/renderTarget/CanvasRenderTargetAdaptor.mjs
var Ci = class {
	init(e, t) {
		this._renderer = e, this._renderTargetSystem = t;
	}
	initGpuRenderTarget(e) {
		let t = e.colorTexture, { canvas: n, context: r } = this._ensureCanvas(t);
		return {
			canvas: n,
			context: r,
			width: n.width,
			height: n.height
		};
	}
	resizeGpuRenderTarget(e) {
		let t = e.colorTexture, { canvas: n } = this._ensureCanvas(t);
		n.width = e.pixelWidth, n.height = e.pixelHeight;
	}
	startRenderPass(e, t, n, r) {
		let i = this._renderTargetSystem.getGpuRenderTarget(e);
		this._renderer.canvasContext.activeContext = i.context, this._renderer.canvasContext.activeResolution = e.resolution, t && this.clear(e, t, n, r);
	}
	clear(e, t, n, r) {
		let i = this._renderTargetSystem.getGpuRenderTarget(e).context, a = r || {
			x: 0,
			y: 0,
			width: e.pixelWidth,
			height: e.pixelHeight
		};
		if (i.setTransform(1, 0, 0, 1, 0, 0), i.clearRect(a.x, a.y, a.width, a.height), n) {
			let e = O.shared.setValue(n);
			e.alpha > 0 && (i.globalAlpha = e.alpha, i.fillStyle = e.toHex(), i.fillRect(a.x, a.y, a.width, a.height), i.globalAlpha = 1);
		}
	}
	finishRenderPass() {}
	copyToTexture(e, t, n, r, i) {
		let a = this._renderTargetSystem.getGpuRenderTarget(e).canvas, o = t.source, { context: s } = this._ensureCanvas(o), c = i?.x ?? 0, l = i?.y ?? 0;
		return s.drawImage(a, n.x, n.y, r.width, r.height, c, l, r.width, r.height), o.update(), t;
	}
	destroyGpuRenderTarget(e) {}
	_ensureCanvas(e) {
		let t = e.resource;
		(!t || !ee.test(t)) && (t = b.get().createCanvas(e.pixelWidth, e.pixelHeight), e.resource = t), (t.width !== e.pixelWidth || t.height !== e.pixelHeight) && (t.width = e.pixelWidth, t.height = e.pixelHeight);
		let n = t.getContext("2d");
		return {
			canvas: t,
			context: n
		};
	}
}, wi = class extends Te {
	constructor(e) {
		super(e), this.adaptor = new Ci(), this.adaptor.init(e, this);
	}
};
wi.extension = {
	type: [k.CanvasSystem],
	name: "renderTarget"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/canvas/texture/CanvasTextureSystem.mjs
var Ti = class {
	constructor(e) {}
	init() {}
	initSource(e) {}
	generateCanvas(e) {
		let t = b.get().createCanvas(), n = t.getContext("2d"), r = L.getCanvasSource(e);
		if (!r) return t;
		let i = e.frame, a = e.source._resolution ?? e.source.resolution ?? 1, o = i.x * a, s = i.y * a, c = i.width * a, l = i.height * a;
		return t.width = Math.ceil(c), t.height = Math.ceil(l), n.drawImage(r, o, s, c, l, 0, 0, c, l), t;
	}
	getPixels(e) {
		let t = this.generateCanvas(e);
		return {
			pixels: t.getContext("2d", { willReadFrequently: !0 }).getImageData(0, 0, t.width, t.height).data,
			width: t.width,
			height: t.height
		};
	}
	destroy() {}
};
Ti.extension = {
	type: [k.CanvasSystem],
	name: "texture"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/canvas/CanvasRenderer.mjs
var Ei = /* @__PURE__ */ c({ CanvasRenderer: () => Ni }), Di = [
	...Ce,
	li,
	ui,
	Ti,
	wi
], Oi = [
	ve,
	ye,
	me,
	xe,
	he,
	oi,
	ti,
	we
], ki = [Zr, Si], Ai = [], ji = [], Mi = [];
e.handleByNamedList(k.CanvasSystem, Ai), e.handleByNamedList(k.CanvasPipes, ji), e.handleByNamedList(k.CanvasPipesAdaptor, Mi), e.add(...Di, ...Oi, ...ki);
var Ni = class extends Se {
	constructor() {
		let e = {
			name: "canvas",
			type: l.CANVAS,
			systems: Ai,
			renderPipes: ji,
			renderPipeAdaptors: Mi
		};
		super(e);
	}
}, Pi = /* @__PURE__ */ ((e) => (e[e.ELEMENT_ARRAY_BUFFER = 34963] = "ELEMENT_ARRAY_BUFFER", e[e.ARRAY_BUFFER = 34962] = "ARRAY_BUFFER", e[e.UNIFORM_BUFFER = 35345] = "UNIFORM_BUFFER", e))(Pi || {}), Fi = class {
	constructor(e, t) {
		this._lastBindBaseLocation = -1, this._lastBindCallId = -1, this.buffer = e || null, this.updateID = -1, this.byteLength = -1, this.type = t;
	}
	destroy() {
		this.buffer = null, this.updateID = -1, this.byteLength = -1, this.type = -1, this._lastBindBaseLocation = -1, this._lastBindCallId = -1;
	}
}, Ii = class {
	constructor(e) {
		this._boundBufferBases = /* @__PURE__ */ Object.create(null), this._minBaseLocation = 0, this._nextBindBaseIndex = this._minBaseLocation, this._bindCallId = 0, this._renderer = e, this._managedBuffers = new H({
			renderer: e,
			type: "resource",
			onUnload: this.onBufferUnload.bind(this),
			name: "glBuffer"
		});
	}
	destroy() {
		this._managedBuffers.destroy(), this._renderer = null, this._gl = null, this._boundBufferBases = {};
	}
	contextChange() {
		this._gl = this._renderer.gl, this.destroyAll(!0), this._maxBindings = this._renderer.limits.maxUniformBindings;
	}
	getGlBuffer(e) {
		return e._gcLastUsed = this._renderer.gc.now, e._gpuData[this._renderer.uid] || this.createGLBuffer(e);
	}
	bind(e) {
		let { _gl: t } = this, n = this.getGlBuffer(e);
		t.bindBuffer(n.type, n.buffer);
	}
	bindBufferBase(e, t) {
		let { _gl: n } = this;
		this._boundBufferBases[t] !== e && (this._boundBufferBases[t] = e, e._lastBindBaseLocation = t, n.bindBufferBase(n.UNIFORM_BUFFER, t, e.buffer));
	}
	nextBindBase(e) {
		this._bindCallId++, this._minBaseLocation = 0, e && (this._boundBufferBases[0] = null, this._minBaseLocation = 1, this._nextBindBaseIndex < 1 && (this._nextBindBaseIndex = 1));
	}
	freeLocationForBufferBase(e) {
		let t = this.getLastBindBaseLocation(e);
		if (t >= this._minBaseLocation) return e._lastBindCallId = this._bindCallId, t;
		let n = 0, r = this._nextBindBaseIndex;
		for (; n < 2;) {
			r >= this._maxBindings && (r = this._minBaseLocation, n++);
			let e = this._boundBufferBases[r];
			if (e && e._lastBindCallId === this._bindCallId) {
				r++;
				continue;
			}
			break;
		}
		return t = r, this._nextBindBaseIndex = r + 1, n >= 2 ? -1 : (e._lastBindCallId = this._bindCallId, this._boundBufferBases[t] = null, t);
	}
	getLastBindBaseLocation(e) {
		let t = e._lastBindBaseLocation;
		return this._boundBufferBases[t] === e ? t : -1;
	}
	bindBufferRange(e, t, n, r) {
		let { _gl: i } = this;
		n ||= 0, t ||= 0, this._boundBufferBases[t] = null, i.bindBufferRange(i.UNIFORM_BUFFER, t || 0, e.buffer, n * 256, r || 256);
	}
	updateBuffer(e) {
		let { _gl: t } = this, n = this.getGlBuffer(e);
		if (e._updateID === n.updateID) return n;
		n.updateID = e._updateID, t.bindBuffer(n.type, n.buffer);
		let r = e.data, i = e.descriptor.usage & x.STATIC ? t.STATIC_DRAW : t.DYNAMIC_DRAW;
		return r ? n.byteLength >= r.byteLength ? t.bufferSubData(n.type, 0, r, 0, e._updateSize / r.BYTES_PER_ELEMENT) : (n.byteLength = r.byteLength, t.bufferData(n.type, r, i)) : (n.byteLength = e.descriptor.size, t.bufferData(n.type, n.byteLength, i)), n;
	}
	destroyAll(e = !1) {
		this._managedBuffers.removeAll(e);
	}
	onBufferUnload(e, t = !1) {
		let n = e._gpuData[this._renderer.uid];
		n && (t || this._gl.deleteBuffer(n.buffer));
	}
	createGLBuffer(e) {
		let { _gl: t } = this, n = Pi.ARRAY_BUFFER;
		e.descriptor.usage & x.INDEX ? n = Pi.ELEMENT_ARRAY_BUFFER : e.descriptor.usage & x.UNIFORM && (n = Pi.UNIFORM_BUFFER);
		let r = new Fi(t.createBuffer(), n);
		return e._gpuData[this._renderer.uid] = r, this._managedBuffers.add(e), r;
	}
	resetState() {
		this._boundBufferBases = /* @__PURE__ */ Object.create(null);
	}
};
Ii.extension = {
	type: [k.WebGLSystem],
	name: "buffer"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/context/GlContextSystem.mjs
var Li = class e {
	constructor(e) {
		this.supports = {
			uint32Indices: !0,
			uniformBufferObject: !0,
			vertexArrayObject: !0,
			srgbTextures: !0,
			nonPowOf2wrapping: !0,
			msaa: !0,
			nonPowOf2mipmaps: !0
		}, this._renderer = e, this.extensions = /* @__PURE__ */ Object.create(null), this.handleContextLost = this.handleContextLost.bind(this), this.handleContextRestored = this.handleContextRestored.bind(this);
	}
	get isLost() {
		return !this.gl || this.gl.isContextLost();
	}
	contextChange(e) {
		this.gl = e, this._renderer.gl = e;
	}
	init(t) {
		t = {
			...e.defaultOptions,
			...t
		};
		let n = this.multiView = t.multiView;
		if (t.context && n && (T("Renderer created with both a context and multiview enabled. Disabling multiView as both cannot work together."), n = !1), this.canvas = n ? b.get().createCanvas(this._renderer.canvas.width, this._renderer.canvas.height) : this._renderer.view.canvas, t.context) this.initFromContext(t.context);
		else {
			let e = this._renderer.background.alpha < 1, n = t.premultipliedAlpha ?? !0, r = t.antialias && !this._renderer.backBuffer.useBackBuffer;
			this.createContext(t.preferWebGLVersion, {
				alpha: e,
				premultipliedAlpha: n,
				antialias: r,
				stencil: !0,
				preserveDrawingBuffer: t.preserveDrawingBuffer,
				powerPreference: t.powerPreference ?? "default"
			});
		}
	}
	ensureCanvasSize(e) {
		if (!this.multiView) {
			e !== this.canvas && T("multiView is disabled, but targetCanvas is not the main canvas");
			return;
		}
		let { canvas: t } = this;
		(t.width < e.width || t.height < e.height) && (t.width = Math.max(e.width, e.width), t.height = Math.max(e.height, e.height));
	}
	initFromContext(e) {
		this.gl = e, this.webGLVersion = e instanceof b.get().getWebGLRenderingContext() ? 1 : 2, this.getExtensions(), this.validateContext(e), this._renderer.runners.contextChange.emit(e);
		let t = this._renderer.view.canvas;
		t.addEventListener("webglcontextlost", this.handleContextLost, !1), t.addEventListener("webglcontextrestored", this.handleContextRestored, !1);
	}
	createContext(e, t) {
		let n, r = this.canvas;
		if (e === 2 && (n = r.getContext("webgl2", t)), !n && (n = r.getContext("webgl", t), !n)) throw Error("This browser does not support WebGL. Try using the canvas renderer");
		this.gl = n, this.initFromContext(this.gl);
	}
	getExtensions() {
		let { gl: e } = this, t = {
			anisotropicFiltering: e.getExtension("EXT_texture_filter_anisotropic"),
			floatTextureLinear: e.getExtension("OES_texture_float_linear"),
			s3tc: e.getExtension("WEBGL_compressed_texture_s3tc"),
			s3tc_sRGB: e.getExtension("WEBGL_compressed_texture_s3tc_srgb"),
			etc: e.getExtension("WEBGL_compressed_texture_etc"),
			etc1: e.getExtension("WEBGL_compressed_texture_etc1"),
			pvrtc: e.getExtension("WEBGL_compressed_texture_pvrtc") || e.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc"),
			atc: e.getExtension("WEBGL_compressed_texture_atc"),
			astc: e.getExtension("WEBGL_compressed_texture_astc"),
			bptc: e.getExtension("EXT_texture_compression_bptc"),
			rgtc: e.getExtension("EXT_texture_compression_rgtc"),
			loseContext: e.getExtension("WEBGL_lose_context")
		};
		if (this.webGLVersion === 1) this.extensions = {
			...t,
			drawBuffers: e.getExtension("WEBGL_draw_buffers"),
			depthTexture: e.getExtension("WEBGL_depth_texture"),
			vertexArrayObject: e.getExtension("OES_vertex_array_object") || e.getExtension("MOZ_OES_vertex_array_object") || e.getExtension("WEBKIT_OES_vertex_array_object"),
			uint32ElementIndex: e.getExtension("OES_element_index_uint"),
			floatTexture: e.getExtension("OES_texture_float"),
			floatTextureLinear: e.getExtension("OES_texture_float_linear"),
			textureHalfFloat: e.getExtension("OES_texture_half_float"),
			textureHalfFloatLinear: e.getExtension("OES_texture_half_float_linear"),
			vertexAttribDivisorANGLE: e.getExtension("ANGLE_instanced_arrays"),
			srgb: e.getExtension("EXT_sRGB")
		};
		else {
			this.extensions = {
				...t,
				colorBufferFloat: e.getExtension("EXT_color_buffer_float")
			};
			let n = e.getExtension("WEBGL_provoking_vertex");
			n && n.provokingVertexWEBGL(n.FIRST_VERTEX_CONVENTION_WEBGL);
		}
	}
	handleContextLost(e) {
		e.preventDefault(), this._contextLossForced && (this._contextLossForced = !1, setTimeout(() => {
			this.gl.isContextLost() && this.extensions.loseContext?.restoreContext();
		}, 0));
	}
	handleContextRestored() {
		this.getExtensions(), this._renderer.runners.contextChange.emit(this.gl);
	}
	destroy() {
		let e = this._renderer.view.canvas;
		this._renderer = null, e.removeEventListener("webglcontextlost", this.handleContextLost), e.removeEventListener("webglcontextrestored", this.handleContextRestored), this.gl.useProgram(null), this.extensions.loseContext?.loseContext();
	}
	forceContextLoss() {
		this.extensions.loseContext?.loseContext(), this._contextLossForced = !0;
	}
	validateContext(e) {
		let t = e.getContextAttributes();
		t && !t.stencil && T("Provided WebGL context does not have a stencil buffer, masks may not render correctly");
		let n = this.supports, r = this.webGLVersion === 2, i = this.extensions;
		n.uint32Indices = r || !!i.uint32ElementIndex, n.uniformBufferObject = r, n.vertexArrayObject = r || !!i.vertexArrayObject, n.srgbTextures = r || !!i.srgb, n.nonPowOf2wrapping = r, n.nonPowOf2mipmaps = r, n.msaa = r, n.uint32Indices || T("Provided WebGL context does not support 32 index buffer, large scenes may not render correctly");
	}
};
Li.extension = {
	type: [k.WebGLSystem],
	name: "context"
}, Li.defaultOptions = {
	context: null,
	premultipliedAlpha: !0,
	preserveDrawingBuffer: !1,
	powerPreference: void 0,
	preferWebGLVersion: 2,
	multiView: !1
};
var Ri = Li, zi = /* @__PURE__ */ ((e) => (e[e.RGBA = 6408] = "RGBA", e[e.RGB = 6407] = "RGB", e[e.RG = 33319] = "RG", e[e.RED = 6403] = "RED", e[e.RGBA_INTEGER = 36249] = "RGBA_INTEGER", e[e.RGB_INTEGER = 36248] = "RGB_INTEGER", e[e.RG_INTEGER = 33320] = "RG_INTEGER", e[e.RED_INTEGER = 36244] = "RED_INTEGER", e[e.ALPHA = 6406] = "ALPHA", e[e.LUMINANCE = 6409] = "LUMINANCE", e[e.LUMINANCE_ALPHA = 6410] = "LUMINANCE_ALPHA", e[e.DEPTH_COMPONENT = 6402] = "DEPTH_COMPONENT", e[e.DEPTH_STENCIL = 34041] = "DEPTH_STENCIL", e))(zi || {}), Bi = /* @__PURE__ */ ((e) => (e[e.TEXTURE_2D = 3553] = "TEXTURE_2D", e[e.TEXTURE_CUBE_MAP = 34067] = "TEXTURE_CUBE_MAP", e[e.TEXTURE_2D_ARRAY = 35866] = "TEXTURE_2D_ARRAY", e[e.TEXTURE_CUBE_MAP_POSITIVE_X = 34069] = "TEXTURE_CUBE_MAP_POSITIVE_X", e[e.TEXTURE_CUBE_MAP_NEGATIVE_X = 34070] = "TEXTURE_CUBE_MAP_NEGATIVE_X", e[e.TEXTURE_CUBE_MAP_POSITIVE_Y = 34071] = "TEXTURE_CUBE_MAP_POSITIVE_Y", e[e.TEXTURE_CUBE_MAP_NEGATIVE_Y = 34072] = "TEXTURE_CUBE_MAP_NEGATIVE_Y", e[e.TEXTURE_CUBE_MAP_POSITIVE_Z = 34073] = "TEXTURE_CUBE_MAP_POSITIVE_Z", e[e.TEXTURE_CUBE_MAP_NEGATIVE_Z = 34074] = "TEXTURE_CUBE_MAP_NEGATIVE_Z", e))(Bi || {}), Z = /* @__PURE__ */ ((e) => (e[e.UNSIGNED_BYTE = 5121] = "UNSIGNED_BYTE", e[e.UNSIGNED_SHORT = 5123] = "UNSIGNED_SHORT", e[e.UNSIGNED_SHORT_5_6_5 = 33635] = "UNSIGNED_SHORT_5_6_5", e[e.UNSIGNED_SHORT_4_4_4_4 = 32819] = "UNSIGNED_SHORT_4_4_4_4", e[e.UNSIGNED_SHORT_5_5_5_1 = 32820] = "UNSIGNED_SHORT_5_5_5_1", e[e.UNSIGNED_INT = 5125] = "UNSIGNED_INT", e[e.UNSIGNED_INT_10F_11F_11F_REV = 35899] = "UNSIGNED_INT_10F_11F_11F_REV", e[e.UNSIGNED_INT_2_10_10_10_REV = 33640] = "UNSIGNED_INT_2_10_10_10_REV", e[e.UNSIGNED_INT_24_8 = 34042] = "UNSIGNED_INT_24_8", e[e.UNSIGNED_INT_5_9_9_9_REV = 35902] = "UNSIGNED_INT_5_9_9_9_REV", e[e.BYTE = 5120] = "BYTE", e[e.SHORT = 5122] = "SHORT", e[e.INT = 5124] = "INT", e[e.FLOAT = 5126] = "FLOAT", e[e.FLOAT_32_UNSIGNED_INT_24_8_REV = 36269] = "FLOAT_32_UNSIGNED_INT_24_8_REV", e[e.HALF_FLOAT = 36193] = "HALF_FLOAT", e))(Z || {}), Vi = {
	uint8x2: Z.UNSIGNED_BYTE,
	uint8x4: Z.UNSIGNED_BYTE,
	sint8x2: Z.BYTE,
	sint8x4: Z.BYTE,
	unorm8x2: Z.UNSIGNED_BYTE,
	unorm8x4: Z.UNSIGNED_BYTE,
	snorm8x2: Z.BYTE,
	snorm8x4: Z.BYTE,
	uint16x2: Z.UNSIGNED_SHORT,
	uint16x4: Z.UNSIGNED_SHORT,
	sint16x2: Z.SHORT,
	sint16x4: Z.SHORT,
	unorm16x2: Z.UNSIGNED_SHORT,
	unorm16x4: Z.UNSIGNED_SHORT,
	snorm16x2: Z.SHORT,
	snorm16x4: Z.SHORT,
	float16x2: Z.HALF_FLOAT,
	float16x4: Z.HALF_FLOAT,
	float32: Z.FLOAT,
	float32x2: Z.FLOAT,
	float32x3: Z.FLOAT,
	float32x4: Z.FLOAT,
	uint32: Z.UNSIGNED_INT,
	uint32x2: Z.UNSIGNED_INT,
	uint32x3: Z.UNSIGNED_INT,
	uint32x4: Z.UNSIGNED_INT,
	sint32: Z.INT,
	sint32x2: Z.INT,
	sint32x3: Z.INT,
	sint32x4: Z.INT
};
function Hi(e) {
	return Vi[e] ?? Vi.float32;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/geometry/GlGeometrySystem.mjs
var Ui = {
	"point-list": 0,
	"line-list": 1,
	"line-strip": 3,
	"triangle-list": 4,
	"triangle-strip": 5
}, Wi = class {
	constructor() {
		this.vaoCache = /* @__PURE__ */ Object.create(null);
	}
	destroy() {
		this.vaoCache = /* @__PURE__ */ Object.create(null);
	}
}, Gi = class {
	constructor(e) {
		this._renderer = e, this._activeGeometry = null, this._activeVao = null, this.hasVao = !0, this.hasInstance = !0, this._managedGeometries = new H({
			renderer: e,
			type: "resource",
			onUnload: this.onGeometryUnload.bind(this),
			name: "glGeometry"
		});
	}
	contextChange() {
		let e = this.gl = this._renderer.gl;
		if (!this._renderer.context.supports.vertexArrayObject) throw Error("[PixiJS] Vertex Array Objects are not supported on this device");
		this.destroyAll(!0);
		let t = this._renderer.context.extensions.vertexArrayObject;
		t && (e.createVertexArray = () => t.createVertexArrayOES(), e.bindVertexArray = (e) => t.bindVertexArrayOES(e), e.deleteVertexArray = (e) => t.deleteVertexArrayOES(e));
		let n = this._renderer.context.extensions.vertexAttribDivisorANGLE;
		n && (e.drawArraysInstanced = (e, t, r, i) => {
			n.drawArraysInstancedANGLE(e, t, r, i);
		}, e.drawElementsInstanced = (e, t, r, i, a) => {
			n.drawElementsInstancedANGLE(e, t, r, i, a);
		}, e.vertexAttribDivisor = (e, t) => n.vertexAttribDivisorANGLE(e, t)), this._activeGeometry = null, this._activeVao = null;
	}
	bind(e, t) {
		let n = this.gl;
		this._activeGeometry = e;
		let r = this.getVao(e, t);
		this._activeVao !== r && (this._activeVao = r, n.bindVertexArray(r)), this.updateBuffers();
	}
	resetState() {
		this.unbind();
	}
	updateBuffers() {
		let e = this._activeGeometry, t = this._renderer.buffer;
		for (let n = 0; n < e.buffers.length; n++) {
			let r = e.buffers[n];
			t.updateBuffer(r);
		}
		e._gcLastUsed = this._renderer.gc.now;
	}
	checkCompatibility(e, t) {
		let n = e.attributes, r = t._attributeData;
		for (let e in r) if (!n[e]) throw Error(`shader and geometry incompatible, geometry missing the "${e}" attribute`);
	}
	getSignature(e, t) {
		let n = e.attributes, r = t._attributeData, i = ["g", e.uid];
		for (let e in n) r[e] && i.push(e, r[e].location);
		return i.join("-");
	}
	getVao(e, t) {
		return e._gpuData[this._renderer.uid]?.vaoCache[t._key] || this.initGeometryVao(e, t);
	}
	initGeometryVao(e, t, n = !0) {
		let r = this._renderer.gl, i = this._renderer.buffer;
		this._renderer.shader._getProgramData(t), this.checkCompatibility(e, t);
		let a = this.getSignature(e, t), o = e._gpuData[this._renderer.uid];
		o || (o = new Wi(), e._gpuData[this._renderer.uid] = o, this._managedGeometries.add(e));
		let s = o.vaoCache, c = s[a];
		if (c) return s[t._key] = c, c;
		Ze(e, t._attributeData);
		let l = e.buffers;
		c = r.createVertexArray(), r.bindVertexArray(c);
		for (let e = 0; e < l.length; e++) {
			let t = l[e];
			i.bind(t);
		}
		return this.activateVao(e, t), s[t._key] = c, s[a] = c, r.bindVertexArray(null), c;
	}
	onGeometryUnload(e, t = !1) {
		let n = e._gpuData[this._renderer.uid];
		if (!n) return;
		let r = n.vaoCache;
		if (!t) for (let e in r) this._activeVao !== r[e] && this.resetState(), this.gl.deleteVertexArray(r[e]);
	}
	destroyAll(e = !1) {
		this._managedGeometries.removeAll(e);
	}
	activateVao(e, t) {
		let n = this._renderer.gl, r = this._renderer.buffer, i = e.attributes;
		e.indexBuffer && r.bind(e.indexBuffer);
		let a = null;
		for (let e in i) {
			let o = i[e], s = o.buffer, c = r.getGlBuffer(s), l = t._attributeData[e];
			if (l) {
				a !== c && (r.bind(s), a = c);
				let e = l.location;
				n.enableVertexAttribArray(e);
				let t = g(o.format), i = Hi(o.format);
				if (l.format?.substring(1, 4) === "int" ? n.vertexAttribIPointer(e, t.size, i, o.stride, o.offset) : n.vertexAttribPointer(e, t.size, i, t.normalised, o.stride, o.offset), o.instance) {
					if (this.hasInstance) {
						let t = o.divisor ?? 1;
						n.vertexAttribDivisor(e, t);
					} else throw Error("geometry error, GPU Instancing is not supported on this device");
				}
			}
		}
	}
	draw(e, t, n, r) {
		let { gl: i } = this._renderer, a = this._activeGeometry, o = Ui[e || a.topology];
		if (r ??= a.instanceCount, a.indexBuffer) {
			let e = a.indexBuffer.data.BYTES_PER_ELEMENT, s = e === 2 ? i.UNSIGNED_SHORT : i.UNSIGNED_INT;
			r === 1 ? i.drawElements(o, t || a.indexBuffer.data.length, s, (n || 0) * e) : i.drawElementsInstanced(o, t || a.indexBuffer.data.length, s, (n || 0) * e, r);
		} else r === 1 ? i.drawArrays(o, n || 0, t || a.getSize()) : i.drawArraysInstanced(o, n || 0, t || a.getSize(), r);
		return this;
	}
	unbind() {
		this.gl.bindVertexArray(null), this._activeVao = null, this._activeGeometry = null;
	}
	destroy() {
		this._managedGeometries.destroy(), this._renderer = null, this.gl = null, this._activeVao = null, this._activeGeometry = null;
	}
};
Gi.extension = {
	type: [k.WebGLSystem],
	name: "geometry"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/GlBackBufferSystem.mjs
var Ki = new C({ attributes: { aPosition: [
	-1,
	-1,
	3,
	-1,
	-1,
	3
] } }), qi = class e {
	constructor(e) {
		this.useBackBuffer = !1, this._useBackBufferThisRender = !1, this._renderer = e;
	}
	init(t = {}) {
		let { useBackBuffer: n, antialias: r } = {
			...e.defaultOptions,
			...t
		};
		this.useBackBuffer = n, this._antialias = r, this._renderer.context.supports.msaa || (T("antialiasing, is not supported on when using the back buffer"), this._antialias = !1), this._state = j.for2d();
		let i = new w({
			vertex: "\n                attribute vec2 aPosition;\n                out vec2 vUv;\n\n                void main() {\n                    gl_Position = vec4(aPosition, 0.0, 1.0);\n\n                    vUv = (aPosition + 1.0) / 2.0;\n\n                    // flip dem UVs\n                    vUv.y = 1.0 - vUv.y;\n                }",
			fragment: "\n                in vec2 vUv;\n                out vec4 finalColor;\n\n                uniform sampler2D uTexture;\n\n                void main() {\n                    finalColor = texture(uTexture, vUv);\n                }",
			name: "big-triangle"
		});
		this._bigTriangleShader = new p({
			glProgram: i,
			resources: { uTexture: D.WHITE.source }
		});
	}
	renderStart(e) {
		let t = this._renderer.renderTarget.getRenderTarget(e.target);
		if (this._useBackBufferThisRender = this.useBackBuffer && !!t.isRoot, this._useBackBufferThisRender) {
			let t = this._renderer.renderTarget.getRenderTarget(e.target);
			this._targetTexture = t.colorTexture, e.target = this._getBackBufferTexture(t.colorTexture);
		}
	}
	renderEnd() {
		this._presentBackBuffer();
	}
	_presentBackBuffer() {
		let e = this._renderer;
		e.renderTarget.finishRenderPass(), this._useBackBufferThisRender && (e.renderTarget.bind(this._targetTexture, !1), this._bigTriangleShader.resources.uTexture = this._backBufferTexture.source, e.encoder.draw({
			geometry: Ki,
			shader: this._bigTriangleShader,
			state: this._state
		}));
	}
	_getBackBufferTexture(e) {
		return this._backBufferTexture = this._backBufferTexture || new D({ source: new E({
			width: e.width,
			height: e.height,
			resolution: e._resolution,
			antialias: this._antialias
		}) }), this._backBufferTexture.source.resize(e.width, e.height, e._resolution), this._backBufferTexture;
	}
	destroy() {
		this._backBufferTexture &&= (this._backBufferTexture.destroy(), null);
	}
};
qi.extension = {
	type: [k.WebGLSystem],
	name: "backBuffer",
	priority: 1
}, qi.defaultOptions = { useBackBuffer: !1 };
var Ji = qi, Yi = class {
	constructor(e) {
		this._colorMaskCache = 15, this._renderer = e;
	}
	setMask(e) {
		this._colorMaskCache !== e && (this._colorMaskCache = e, this._renderer.gl.colorMask(!!(e & 8), !!(e & 4), !!(e & 2), !!(e & 1)));
	}
};
Yi.extension = {
	type: [k.WebGLSystem],
	name: "colorMask"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/GlEncoderSystem.mjs
var Xi = class {
	constructor(e) {
		this.commandFinished = Promise.resolve(), this._renderer = e;
	}
	setGeometry(e, t) {
		this._renderer.geometry.bind(e, t.glProgram);
	}
	finishRenderPass() {}
	draw(e) {
		let t = this._renderer, { geometry: n, shader: r, state: i, skipSync: a, topology: o, size: s, start: c, instanceCount: l } = e;
		t.shader.bind(r, a), t.geometry.bind(n, t.shader._activeProgram), i && t.state.set(i), t.geometry.draw(o, s, c, l ?? n.instanceCount);
	}
	destroy() {
		this._renderer = null;
	}
};
Xi.extension = {
	type: [k.WebGLSystem],
	name: "encoder"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/GlLimitsSystem.mjs
var Zi = class {
	constructor(e) {
		this._renderer = e;
	}
	contextChange() {
		let e = this._renderer.gl;
		this.maxTextures = e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS), this.maxBatchableTextures = Be(this.maxTextures, e);
		let t = this._renderer.context.webGLVersion === 2;
		this.maxUniformBindings = t ? e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS) : 0;
	}
	destroy() {}
};
Zi.extension = {
	type: [k.WebGLSystem],
	name: "limits"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/GlRenderTarget.mjs
var Qi = class {
	constructor() {
		this.width = -1, this.height = -1, this.msaa = !1, this._attachedMipLevel = 0, this._attachedLayer = 0, this.msaaRenderBuffer = [];
	}
}, $i = class {
	constructor(e) {
		this._stencilCache = {
			enabled: !1,
			stencilReference: 0,
			stencilMode: Ge.NONE
		}, this._renderTargetStencilState = /* @__PURE__ */ Object.create(null), e.renderTarget.onRenderTargetChange.add(this);
	}
	contextChange(e) {
		this._gl = e, this._comparisonFuncMapping = {
			always: e.ALWAYS,
			never: e.NEVER,
			equal: e.EQUAL,
			"not-equal": e.NOTEQUAL,
			less: e.LESS,
			"less-equal": e.LEQUAL,
			greater: e.GREATER,
			"greater-equal": e.GEQUAL
		}, this._stencilOpsMapping = {
			keep: e.KEEP,
			zero: e.ZERO,
			replace: e.REPLACE,
			invert: e.INVERT,
			"increment-clamp": e.INCR,
			"decrement-clamp": e.DECR,
			"increment-wrap": e.INCR_WRAP,
			"decrement-wrap": e.DECR_WRAP
		}, this.resetState();
	}
	onRenderTargetChange(e) {
		if (this._activeRenderTarget === e) return;
		this._activeRenderTarget = e;
		let t = this._renderTargetStencilState[e.uid];
		t ||= this._renderTargetStencilState[e.uid] = {
			stencilMode: Ge.DISABLED,
			stencilReference: 0
		}, this.setStencilMode(t.stencilMode, t.stencilReference);
	}
	resetState() {
		this._stencilCache.enabled = !1, this._stencilCache.stencilMode = Ge.NONE, this._stencilCache.stencilReference = 0;
	}
	setStencilMode(e, t) {
		let n = this._renderTargetStencilState[this._activeRenderTarget.uid], r = this._gl, i = ot[e], a = this._stencilCache;
		if (n.stencilMode = e, n.stencilReference = t, e === Ge.DISABLED) {
			this._stencilCache.enabled && (this._stencilCache.enabled = !1, r.disable(r.STENCIL_TEST));
			return;
		}
		this._stencilCache.enabled || (this._stencilCache.enabled = !0, r.enable(r.STENCIL_TEST)), (e !== a.stencilMode || a.stencilReference !== t) && (a.stencilMode = e, a.stencilReference = t, r.stencilFunc(this._comparisonFuncMapping[i.stencilBack.compare], t, 255), r.stencilOp(r.KEEP, r.KEEP, this._stencilOpsMapping[i.stencilBack.passOp]));
	}
};
$i.extension = {
	type: [k.WebGLSystem],
	name: "stencil"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/utils/createUboElementsSTD40.mjs
var ea = {
	f32: 4,
	i32: 4,
	"vec2<f32>": 8,
	"vec3<f32>": 12,
	"vec4<f32>": 16,
	"vec2<i32>": 8,
	"vec3<i32>": 12,
	"vec4<i32>": 16,
	"mat2x2<f32>": 32,
	"mat3x3<f32>": 48,
	"mat4x4<f32>": 64
};
function ta(e) {
	let t = e.map((e) => ({
		data: e,
		offset: 0,
		size: 0
	})), n = 0, r = 0;
	for (let e = 0; e < t.length; e++) {
		let i = t[e];
		if (n = ea[i.data.type], !n) throw Error(`Unknown type ${i.data.type}`);
		i.data.size > 1 && (n = Math.max(n, 16) * i.data.size);
		let a = n === 12 ? 16 : n;
		i.size = n;
		let o = r % 16;
		o > 0 && 16 - o < a ? r += (16 - o) % 16 : r += (n - o % n) % n, i.offset = r, r += n;
	}
	return r = Math.ceil(r / 16) * 16, {
		uboElements: t,
		size: r
	};
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/utils/generateArraySyncSTD40.mjs
function na(e, t) {
	let n = Math.max(ea[e.data.type] / 16, 1), r = e.data.value.length / e.data.size, i = (4 - r % 4) % 4, a = e.data.type.indexOf("i32") >= 0 ? "dataInt32" : "data";
	return `
        v = uv.${e.data.name};
        offset += ${t};

        arrayOffset = offset;

        t = 0;

        for(var i=0; i < ${e.data.size * n}; i++)
        {
            for(var j = 0; j < ${r}; j++)
            {
                ${a}[arrayOffset++] = v[t++];
            }
            ${i === 0 ? "" : `arrayOffset += ${i};`}
        }
    `;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/utils/createUboSyncSTD40.mjs
function ra(e) {
	return et(e, "uboStd40", na, nt);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/GlUboSystem.mjs
var ia = class extends rt {
	constructor() {
		super({
			createUboElements: ta,
			generateUboSync: ra
		});
	}
};
ia.extension = {
	type: [k.WebGLSystem],
	name: "ubo"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/renderTarget/GlRenderTargetAdaptor.mjs
var aa = class {
	constructor() {
		this._clearColorCache = [
			0,
			0,
			0,
			0
		], this._viewPortCache = new n();
	}
	init(e, t) {
		this._renderer = e, this._renderTargetSystem = t, e.runners.contextChange.add(this);
	}
	contextChange() {
		this._clearColorCache = [
			0,
			0,
			0,
			0
		], this._viewPortCache = new n();
		let e = this._renderer.gl;
		this._drawBuffersCache = [];
		for (let t = 1; t <= 16; t++) this._drawBuffersCache[t] = Array.from({ length: t }, (t, n) => e.COLOR_ATTACHMENT0 + n);
	}
	copyToTexture(e, t, n, r, i) {
		let a = this._renderTargetSystem, o = this._renderer, s = a.getGpuRenderTarget(e), c = o.gl;
		return this.finishRenderPass(e), c.bindFramebuffer(c.FRAMEBUFFER, s.resolveTargetFramebuffer), o.texture.bind(t, 0), c.copyTexSubImage2D(c.TEXTURE_2D, 0, i.x, i.y, n.x, n.y, r.width, r.height), t;
	}
	startRenderPass(e, t = !0, n, r, i = 0, a = 0) {
		let o = this._renderTargetSystem, s = e.colorTexture, c = o.getGpuRenderTarget(e);
		if (a !== 0 && this._renderer.context.webGLVersion < 2) throw Error("[RenderTargetSystem] Rendering to array layers requires WebGL2.");
		if (i > 0) {
			if (c.msaa) throw Error("[RenderTargetSystem] Rendering to mip levels is not supported with MSAA render targets.");
			if (this._renderer.context.webGLVersion < 2) throw Error("[RenderTargetSystem] Rendering to mip levels requires WebGL2.");
		}
		let l = r.y;
		e.isRoot && (l = s.pixelHeight - r.height - r.y), e.colorTextures.forEach((e) => {
			this._renderer.texture.unbind(e);
		});
		let u = this._renderer.gl;
		u.bindFramebuffer(u.FRAMEBUFFER, c.framebuffer), !e.isRoot && (c._attachedMipLevel !== i || c._attachedLayer !== a) && (e.colorTextures.forEach((e, t) => {
			let n = this._renderer.texture.getGlSource(e);
			if (n.target === u.TEXTURE_2D) {
				if (a !== 0) throw Error("[RenderTargetSystem] layer must be 0 when rendering to 2D textures in WebGL.");
				u.framebufferTexture2D(u.FRAMEBUFFER, u.COLOR_ATTACHMENT0 + t, u.TEXTURE_2D, n.texture, i);
			} else if (n.target === u.TEXTURE_2D_ARRAY) {
				if (this._renderer.context.webGLVersion < 2) throw Error("[RenderTargetSystem] Rendering to 2D array textures requires WebGL2.");
				u.framebufferTextureLayer(u.FRAMEBUFFER, u.COLOR_ATTACHMENT0 + t, n.texture, i, a);
			} else if (n.target === u.TEXTURE_CUBE_MAP) {
				if (a < 0 || a > 5) throw Error("[RenderTargetSystem] Cube map layer must be between 0 and 5.");
				u.framebufferTexture2D(u.FRAMEBUFFER, u.COLOR_ATTACHMENT0 + t, u.TEXTURE_CUBE_MAP_POSITIVE_X + a, n.texture, i);
			} else throw Error("[RenderTargetSystem] Unsupported texture target for render-to-layer in WebGL.");
		}), c._attachedMipLevel = i, c._attachedLayer = a), e.colorTextures.length > 1 && this._setDrawBuffers(e, u);
		let d = this._viewPortCache;
		(d.x !== r.x || d.y !== l || d.width !== r.width || d.height !== r.height) && (d.x = r.x, d.y = l, d.width = r.width, d.height = r.height, u.viewport(r.x, l, r.width, r.height)), !c.depthStencilRenderBuffer && (e.stencil || e.depth) && this._initStencil(c), this.clear(e, t, n);
	}
	finishRenderPass(e) {
		let t = this._renderTargetSystem.getGpuRenderTarget(e);
		if (!t.msaa) return;
		let n = this._renderer.gl;
		n.bindFramebuffer(n.FRAMEBUFFER, t.resolveTargetFramebuffer), n.bindFramebuffer(n.READ_FRAMEBUFFER, t.framebuffer), n.blitFramebuffer(0, 0, t.width, t.height, 0, 0, t.width, t.height, n.COLOR_BUFFER_BIT, n.NEAREST), n.bindFramebuffer(n.FRAMEBUFFER, t.framebuffer);
	}
	initGpuRenderTarget(e) {
		let t = this._renderer.gl, n = new Qi();
		return n._attachedMipLevel = 0, n._attachedLayer = 0, e.colorTexture instanceof ee ? (this._renderer.context.ensureCanvasSize(e.colorTexture.resource), n.framebuffer = null, n) : (this._initColor(e, n), t.bindFramebuffer(t.FRAMEBUFFER, null), n);
	}
	destroyGpuRenderTarget(e) {
		let t = this._renderer.gl;
		e.framebuffer &&= (t.deleteFramebuffer(e.framebuffer), null), e.resolveTargetFramebuffer &&= (t.deleteFramebuffer(e.resolveTargetFramebuffer), null), e.depthStencilRenderBuffer &&= (t.deleteRenderbuffer(e.depthStencilRenderBuffer), null), e.msaaRenderBuffer.forEach((e) => {
			t.deleteRenderbuffer(e);
		}), e.msaaRenderBuffer = null;
	}
	clear(e, t, n, r, i = 0, a = 0) {
		if (!t) return;
		if (a !== 0) throw Error("[RenderTargetSystem] Clearing array layers is not supported in WebGL renderer.");
		let o = this._renderTargetSystem;
		typeof t == "boolean" && (t = t ? B.ALL : B.NONE);
		let s = this._renderer.gl;
		if (t & B.COLOR) {
			n ??= o.defaultClearColor;
			let e = this._clearColorCache, t = n;
			(e[0] !== t[0] || e[1] !== t[1] || e[2] !== t[2] || e[3] !== t[3]) && (e[0] = t[0], e[1] = t[1], e[2] = t[2], e[3] = t[3], s.clearColor(t[0], t[1], t[2], t[3]));
		}
		s.clear(t);
	}
	resizeGpuRenderTarget(e) {
		if (e.isRoot) return;
		let t = this._renderTargetSystem.getGpuRenderTarget(e);
		this._resizeColor(e, t), (e.stencil || e.depth) && this._resizeStencil(t);
	}
	_initColor(e, t) {
		let n = this._renderer, r = n.gl, i = r.createFramebuffer();
		if (t.resolveTargetFramebuffer = i, r.bindFramebuffer(r.FRAMEBUFFER, i), t.width = e.colorTexture.source.pixelWidth, t.height = e.colorTexture.source.pixelHeight, e.colorTextures.forEach((e, i) => {
			let a = e.source;
			a.antialias && (n.context.supports.msaa ? t.msaa = !0 : T("[RenderTexture] Antialiasing on textures is not supported in WebGL1")), n.texture.bindSource(a, 0);
			let o = n.texture.getGlSource(a), s = o.texture;
			if (o.target === r.TEXTURE_2D) r.framebufferTexture2D(r.FRAMEBUFFER, r.COLOR_ATTACHMENT0 + i, r.TEXTURE_2D, s, 0);
			else if (o.target === r.TEXTURE_2D_ARRAY) {
				if (n.context.webGLVersion < 2) throw Error("[RenderTargetSystem] TEXTURE_2D_ARRAY requires WebGL2.");
				r.framebufferTextureLayer(r.FRAMEBUFFER, r.COLOR_ATTACHMENT0 + i, s, 0, 0);
			} else if (o.target === r.TEXTURE_CUBE_MAP) r.framebufferTexture2D(r.FRAMEBUFFER, r.COLOR_ATTACHMENT0 + i, r.TEXTURE_CUBE_MAP_POSITIVE_X, s, 0);
			else throw Error("[RenderTargetSystem] Unsupported texture target for framebuffer attachment.");
		}), t.msaa) {
			let n = r.createFramebuffer();
			t.framebuffer = n, r.bindFramebuffer(r.FRAMEBUFFER, n), e.colorTextures.forEach((e, n) => {
				let i = r.createRenderbuffer();
				t.msaaRenderBuffer[n] = i;
			});
		} else t.framebuffer = i;
		this._resizeColor(e, t);
	}
	_resizeColor(e, t) {
		let n = e.colorTexture.source;
		if (t.width = n.pixelWidth, t.height = n.pixelHeight, t._attachedMipLevel = 0, t._attachedLayer = 0, e.colorTextures.forEach((e, t) => {
			t !== 0 && e.source.resize(n.width, n.height, n._resolution);
		}), t.msaa) {
			let n = this._renderer, r = n.gl, i = t.framebuffer;
			r.bindFramebuffer(r.FRAMEBUFFER, i), e.colorTextures.forEach((e, i) => {
				let a = e.source;
				n.texture.bindSource(a, 0);
				let o = n.texture.getGlSource(a).internalFormat, s = t.msaaRenderBuffer[i];
				r.bindRenderbuffer(r.RENDERBUFFER, s), r.renderbufferStorageMultisample(r.RENDERBUFFER, 4, o, a.pixelWidth, a.pixelHeight), r.framebufferRenderbuffer(r.FRAMEBUFFER, r.COLOR_ATTACHMENT0 + i, r.RENDERBUFFER, s);
			});
		}
	}
	_initStencil(e) {
		if (e.framebuffer === null) return;
		let t = this._renderer.gl, n = t.createRenderbuffer();
		e.depthStencilRenderBuffer = n, t.bindRenderbuffer(t.RENDERBUFFER, n), t.framebufferRenderbuffer(t.FRAMEBUFFER, t.DEPTH_STENCIL_ATTACHMENT, t.RENDERBUFFER, n), this._resizeStencil(e);
	}
	_resizeStencil(e) {
		let t = this._renderer.gl;
		t.bindRenderbuffer(t.RENDERBUFFER, e.depthStencilRenderBuffer), e.msaa ? t.renderbufferStorageMultisample(t.RENDERBUFFER, 4, t.DEPTH24_STENCIL8, e.width, e.height) : t.renderbufferStorage(t.RENDERBUFFER, this._renderer.context.webGLVersion === 2 ? t.DEPTH24_STENCIL8 : t.DEPTH_STENCIL, e.width, e.height);
	}
	prerender(e) {
		let t = e.colorTexture.resource;
		this._renderer.context.multiView && ee.test(t) && this._renderer.context.ensureCanvasSize(t);
	}
	postrender(e) {
		if (this._renderer.context.multiView && ee.test(e.colorTexture.resource)) {
			let t = this._renderer.context.canvas, n = e.colorTexture;
			n.context2D.drawImage(t, 0, n.pixelHeight - t.height);
		}
	}
	_setDrawBuffers(e, t) {
		let n = e.colorTextures.length, r = this._drawBuffersCache[n];
		if (this._renderer.context.webGLVersion === 1) {
			let e = this._renderer.context.extensions.drawBuffers;
			e ? e.drawBuffersWEBGL(r) : T("[RenderTexture] This WebGL1 context does not support rendering to multiple targets");
		} else t.drawBuffers(r);
	}
}, oa = class extends Te {
	constructor(e) {
		super(e), this.adaptor = new aa(), this.adaptor.init(e, this);
	}
};
oa.extension = {
	type: [k.WebGLSystem],
	name: "renderTarget"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/GenerateShaderSyncCode.mjs
function sa(e, t) {
	let n = [], r = ["\n        var g = s.groups;\n        var sS = r.shader;\n        var p = s.glProgram;\n        var ugS = r.uniformGroup;\n        var resources;\n    "], i = !1, a = 0, o = t._getProgramData(e.glProgram);
	for (let s in e.groups) {
		let c = e.groups[s];
		n.push(`
            resources = g[${s}].resources;
        `);
		for (let l in c.resources) {
			let u = c.resources[l];
			if (u instanceof S) {
				if (u.ubo) {
					let t = e._uniformBindMap[s][Number(l)];
					n.push(`
                        sS.bindUniformBlock(
                            resources[${l}],
                            '${t}',
                            ${e.glProgram._uniformBlockData[t].index}
                        );
                    `);
				} else n.push(`
                        ugS.updateUniformGroup(resources[${l}], p, sD);
                    `);
			} else if (u instanceof st) {
				let t = e._uniformBindMap[s][Number(l)];
				n.push(`
                    sS.bindUniformBlock(
                        resources[${l}],
                        '${t}',
                        ${e.glProgram._uniformBlockData[t].index}
                    );
                `);
			} else if (u instanceof E) {
				let c = e._uniformBindMap[s][l], u = o.uniformData[c];
				u && (i || (i = !0, r.push("\n                        var tS = r.texture;\n                        ")), t._gl.uniform1i(u.location, a), n.push(`
                        tS.bind(resources[${l}], ${a});
                    `), a++);
			}
		}
	}
	let s = [...r, ...n].join("\n");
	return Function("r", "s", "sD", s);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/GlProgramData.mjs
var ca = class {
	constructor(e, t) {
		this.program = e, this.uniformData = t, this.uniformGroups = {}, this.uniformDirtyGroups = {}, this.uniformBlockBindings = {};
	}
	destroy() {
		this.uniformData = null, this.uniformGroups = null, this.uniformDirtyGroups = null, this.uniformBlockBindings = null, this.program = null;
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/compileShader.mjs
function la(e, t, n) {
	let r = e.createShader(t);
	return e.shaderSource(r, n), e.compileShader(r), r;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/defaultValue.mjs
function ua(e) {
	let t = Array(e);
	for (let e = 0; e < t.length; e++) t[e] = !1;
	return t;
}
function da(e, t) {
	switch (e) {
		case "float": return 0;
		case "vec2": return new Float32Array(2 * t);
		case "vec3": return new Float32Array(3 * t);
		case "vec4": return new Float32Array(4 * t);
		case "int":
		case "uint":
		case "sampler2D":
		case "sampler2DArray": return 0;
		case "ivec2": return new Int32Array(2 * t);
		case "ivec3": return new Int32Array(3 * t);
		case "ivec4": return new Int32Array(4 * t);
		case "uvec2": return new Uint32Array(2 * t);
		case "uvec3": return new Uint32Array(3 * t);
		case "uvec4": return new Uint32Array(4 * t);
		case "bool": return !1;
		case "bvec2": return ua(2 * t);
		case "bvec3": return ua(3 * t);
		case "bvec4": return ua(4 * t);
		case "mat2": return new Float32Array([
			1,
			0,
			0,
			1
		]);
		case "mat3": return new Float32Array([
			1,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			1
		]);
		case "mat4": return new Float32Array([
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1
		]);
	}
	return null;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/mapType.mjs
var fa = null, pa = {
	FLOAT: "float",
	FLOAT_VEC2: "vec2",
	FLOAT_VEC3: "vec3",
	FLOAT_VEC4: "vec4",
	INT: "int",
	INT_VEC2: "ivec2",
	INT_VEC3: "ivec3",
	INT_VEC4: "ivec4",
	UNSIGNED_INT: "uint",
	UNSIGNED_INT_VEC2: "uvec2",
	UNSIGNED_INT_VEC3: "uvec3",
	UNSIGNED_INT_VEC4: "uvec4",
	BOOL: "bool",
	BOOL_VEC2: "bvec2",
	BOOL_VEC3: "bvec3",
	BOOL_VEC4: "bvec4",
	FLOAT_MAT2: "mat2",
	FLOAT_MAT3: "mat3",
	FLOAT_MAT4: "mat4",
	SAMPLER_2D: "sampler2D",
	INT_SAMPLER_2D: "sampler2D",
	UNSIGNED_INT_SAMPLER_2D: "sampler2D",
	SAMPLER_CUBE: "samplerCube",
	INT_SAMPLER_CUBE: "samplerCube",
	UNSIGNED_INT_SAMPLER_CUBE: "samplerCube",
	SAMPLER_2D_ARRAY: "sampler2DArray",
	INT_SAMPLER_2D_ARRAY: "sampler2DArray",
	UNSIGNED_INT_SAMPLER_2D_ARRAY: "sampler2DArray"
}, ma = {
	float: "float32",
	vec2: "float32x2",
	vec3: "float32x3",
	vec4: "float32x4",
	int: "sint32",
	ivec2: "sint32x2",
	ivec3: "sint32x3",
	ivec4: "sint32x4",
	uint: "uint32",
	uvec2: "uint32x2",
	uvec3: "uint32x3",
	uvec4: "uint32x4",
	bool: "uint32",
	bvec2: "uint32x2",
	bvec3: "uint32x3",
	bvec4: "uint32x4"
};
function ha(e, t) {
	if (!fa) {
		let t = Object.keys(pa);
		fa = {};
		for (let n = 0; n < t.length; ++n) {
			let r = t[n];
			fa[e[r]] = pa[r];
		}
	}
	return fa[t];
}
function ga(e, t) {
	return ma[ha(e, t)] || "float32";
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/extractAttributesFromGlProgram.mjs
function _a(e, t, n = !1) {
	let r = {}, i = t.getProgramParameter(e, t.ACTIVE_ATTRIBUTES);
	for (let n = 0; n < i; n++) {
		let i = t.getActiveAttrib(e, n);
		if (i.name.startsWith("gl_")) continue;
		let a = ga(t, i.type);
		r[i.name] = {
			location: 0,
			format: a,
			stride: g(a).stride,
			offset: 0,
			instance: !1,
			start: 0
		};
	}
	let a = Object.keys(r);
	if (n) {
		a.sort((e, t) => e > t ? 1 : -1);
		for (let n = 0; n < a.length; n++) r[a[n]].location = n, t.bindAttribLocation(e, n, a[n]);
		t.linkProgram(e);
	} else for (let n = 0; n < a.length; n++) r[a[n]].location = t.getAttribLocation(e, a[n]);
	return r;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/getUboData.mjs
function va(e, t) {
	if (!t.ACTIVE_UNIFORM_BLOCKS) return {};
	let n = {}, r = t.getProgramParameter(e, t.ACTIVE_UNIFORM_BLOCKS);
	for (let i = 0; i < r; i++) {
		let r = t.getActiveUniformBlockName(e, i);
		n[r] = {
			name: r,
			index: t.getUniformBlockIndex(e, r),
			size: t.getActiveUniformBlockParameter(e, i, t.UNIFORM_BLOCK_DATA_SIZE)
		};
	}
	return n;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/getUniformData.mjs
function ya(e, t) {
	let n = {}, r = t.getProgramParameter(e, t.ACTIVE_UNIFORMS);
	for (let i = 0; i < r; i++) {
		let r = t.getActiveUniform(e, i), a = r.name.replace(/\[.*?\]$/, ""), o = !!r.name.match(/\[.*?\]$/), s = ha(t, r.type);
		n[a] = {
			name: a,
			index: i,
			type: s,
			size: r.size,
			isArray: o,
			value: da(s, r.size)
		};
	}
	return n;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/logProgramError.mjs
function ba(e, t) {
	let n = e.getShaderSource(t);
	if (n === null) {
		console.error("PixiJS Error: Could not retrieve shader source (WebGL context may be lost).");
		return;
	}
	let r = n.split("\n").map((e, t) => `${t}: ${e}`), i = e.getShaderInfoLog(t) ?? "", a = i.split("\n"), o = {}, s = a.map((e) => parseFloat(e.replace(/^ERROR\: 0\:([\d]+)\:.*$/, "$1"))).filter((e) => e && !o[e] ? (o[e] = !0, !0) : !1), c = [""];
	s.forEach((e) => {
		r[e - 1] = `%c${r[e - 1]}%c`, c.push("background: #FF0000; color:#FFFFFF; font-size: 10px", "font-size: 10px");
	}), c[0] = r.join("\n"), console.error(i), console.groupCollapsed("click to view full shader code"), console.warn(...c), console.groupEnd();
}
function xa(e, t, n, r) {
	e.getProgramParameter(t, e.LINK_STATUS) || (e.getShaderParameter(n, e.COMPILE_STATUS) || ba(e, n), e.getShaderParameter(r, e.COMPILE_STATUS) || ba(e, r), console.error("PixiJS Error: Could not initialize shader."), e.getProgramInfoLog(t) !== "" && console.warn("PixiJS Warning: gl.getProgramInfoLog()", e.getProgramInfoLog(t)));
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/program/generateProgram.mjs
function Sa(e, t) {
	let n = la(e, e.VERTEX_SHADER, t.vertex), r = la(e, e.FRAGMENT_SHADER, t.fragment), i = e.createProgram();
	e.attachShader(i, n), e.attachShader(i, r);
	let a = t.transformFeedbackVaryings;
	a && (typeof e.transformFeedbackVaryings == "function" ? e.transformFeedbackVaryings(i, a.names, a.bufferMode === "separate" ? e.SEPARATE_ATTRIBS : e.INTERLEAVED_ATTRIBS) : T("TransformFeedback is not supported but TransformFeedbackVaryings are given.")), e.linkProgram(i), e.getProgramParameter(i, e.LINK_STATUS) || xa(e, i, n, r), t._attributeData = _a(i, e, !/^[ \t]*#[ \t]*version[ \t]+300[ \t]+es[ \t]*$/m.test(t.vertex)), t._uniformData = ya(i, e), t._uniformBlockData = va(i, e), e.deleteShader(n), e.deleteShader(r);
	let o = {};
	for (let n in t._uniformData) {
		let r = t._uniformData[n];
		o[n] = {
			location: e.getUniformLocation(i, n),
			value: da(r.type, r.size)
		};
	}
	return new ca(i, o);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/GlShaderSystem.mjs
var Ca = {
	textureCount: 0,
	blockIndex: 0
}, wa = class {
	constructor(e) {
		this._activeProgram = null, this._programDataHash = /* @__PURE__ */ Object.create(null), this._shaderSyncFunctions = /* @__PURE__ */ Object.create(null), this._renderer = e;
	}
	contextChange(e) {
		this._gl = e, this._programDataHash = /* @__PURE__ */ Object.create(null), this._shaderSyncFunctions = /* @__PURE__ */ Object.create(null), this._activeProgram = null;
	}
	bind(e, t) {
		if (this._setProgram(e.glProgram), t) return;
		Ca.textureCount = 0, Ca.blockIndex = 0;
		let n = this._shaderSyncFunctions[e.glProgram._key];
		n ||= this._shaderSyncFunctions[e.glProgram._key] = this._generateShaderSync(e, this), this._renderer.buffer.nextBindBase(!!e.glProgram.transformFeedbackVaryings), n(this._renderer, e, Ca);
	}
	updateUniformGroup(e) {
		this._renderer.uniformGroup.updateUniformGroup(e, this._activeProgram, Ca);
	}
	bindUniformBlock(e, t, n = 0) {
		let r = this._renderer.buffer, i = this._getProgramData(this._activeProgram), a = e._bufferResource;
		a || this._renderer.ubo.updateUniformGroup(e);
		let o = e.buffer, s = r.updateBuffer(o), c = r.freeLocationForBufferBase(s);
		if (a) {
			let { offset: t, size: n } = e;
			t === 0 && n === o.data.byteLength ? r.bindBufferBase(s, c) : r.bindBufferRange(s, c, t);
		} else r.getLastBindBaseLocation(s) !== c && r.bindBufferBase(s, c);
		let l = this._activeProgram._uniformBlockData[t].index;
		i.uniformBlockBindings[n] !== c && (i.uniformBlockBindings[n] = c, this._renderer.gl.uniformBlockBinding(i.program, l, c));
	}
	_setProgram(e) {
		if (this._activeProgram === e) return;
		this._activeProgram = e;
		let t = this._getProgramData(e);
		this._gl.useProgram(t.program);
	}
	_getProgramData(e) {
		return this._programDataHash[e._key] || this._createProgramData(e);
	}
	_createProgramData(e) {
		let t = e._key;
		return this._programDataHash[t] = Sa(this._gl, e), this._programDataHash[t];
	}
	destroy() {
		for (let e of Object.keys(this._programDataHash)) this._programDataHash[e].destroy();
		this._programDataHash = null, this._shaderSyncFunctions = null, this._activeProgram = null, this._renderer = null, this._gl = null;
	}
	_generateShaderSync(e, t) {
		return sa(e, t);
	}
	resetState() {
		this._activeProgram = null;
	}
};
wa.extension = {
	type: [k.WebGLSystem],
	name: "shader"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/utils/generateUniformsSyncTypes.mjs
var Ta = {
	f32: "if (cv !== v) {\n            cu.value = v;\n            gl.uniform1f(location, v);\n        }",
	"vec2<f32>": "if (cv[0] !== v[0] || cv[1] !== v[1]) {\n            cv[0] = v[0];\n            cv[1] = v[1];\n            gl.uniform2f(location, v[0], v[1]);\n        }",
	"vec3<f32>": "if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2]) {\n            cv[0] = v[0];\n            cv[1] = v[1];\n            cv[2] = v[2];\n            gl.uniform3f(location, v[0], v[1], v[2]);\n        }",
	"vec4<f32>": "if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2] || cv[3] !== v[3]) {\n            cv[0] = v[0];\n            cv[1] = v[1];\n            cv[2] = v[2];\n            cv[3] = v[3];\n            gl.uniform4f(location, v[0], v[1], v[2], v[3]);\n        }",
	i32: "if (cv !== v) {\n            cu.value = v;\n            gl.uniform1i(location, v);\n        }",
	"vec2<i32>": "if (cv[0] !== v[0] || cv[1] !== v[1]) {\n            cv[0] = v[0];\n            cv[1] = v[1];\n            gl.uniform2i(location, v[0], v[1]);\n        }",
	"vec3<i32>": "if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2]) {\n            cv[0] = v[0];\n            cv[1] = v[1];\n            cv[2] = v[2];\n            gl.uniform3i(location, v[0], v[1], v[2]);\n        }",
	"vec4<i32>": "if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2] || cv[3] !== v[3]) {\n            cv[0] = v[0];\n            cv[1] = v[1];\n            cv[2] = v[2];\n            cv[3] = v[3];\n            gl.uniform4i(location, v[0], v[1], v[2], v[3]);\n        }",
	u32: "if (cv !== v) {\n            cu.value = v;\n            gl.uniform1ui(location, v);\n        }",
	"vec2<u32>": "if (cv[0] !== v[0] || cv[1] !== v[1]) {\n            cv[0] = v[0];\n            cv[1] = v[1];\n            gl.uniform2ui(location, v[0], v[1]);\n        }",
	"vec3<u32>": "if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2]) {\n            cv[0] = v[0];\n            cv[1] = v[1];\n            cv[2] = v[2];\n            gl.uniform3ui(location, v[0], v[1], v[2]);\n        }",
	"vec4<u32>": "if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2] || cv[3] !== v[3]) {\n            cv[0] = v[0];\n            cv[1] = v[1];\n            cv[2] = v[2];\n            cv[3] = v[3];\n            gl.uniform4ui(location, v[0], v[1], v[2], v[3]);\n        }",
	bool: "if (cv !== v) {\n            cu.value = v;\n            gl.uniform1i(location, v);\n        }",
	"vec2<bool>": "if (cv[0] !== v[0] || cv[1] !== v[1]) {\n            cv[0] = v[0];\n            cv[1] = v[1];\n            gl.uniform2i(location, v[0], v[1]);\n        }",
	"vec3<bool>": "if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2]) {\n            cv[0] = v[0];\n            cv[1] = v[1];\n            cv[2] = v[2];\n            gl.uniform3i(location, v[0], v[1], v[2]);\n        }",
	"vec4<bool>": "if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2] || cv[3] !== v[3]) {\n            cv[0] = v[0];\n            cv[1] = v[1];\n            cv[2] = v[2];\n            cv[3] = v[3];\n            gl.uniform4i(location, v[0], v[1], v[2], v[3]);\n        }",
	"mat2x2<f32>": "gl.uniformMatrix2fv(location, false, v);",
	"mat3x3<f32>": "gl.uniformMatrix3fv(location, false, v);",
	"mat4x4<f32>": "gl.uniformMatrix4fv(location, false, v);"
}, Ea = {
	f32: "gl.uniform1fv(location, v);",
	"vec2<f32>": "gl.uniform2fv(location, v);",
	"vec3<f32>": "gl.uniform3fv(location, v);",
	"vec4<f32>": "gl.uniform4fv(location, v);",
	"mat2x2<f32>": "gl.uniformMatrix2fv(location, false, v);",
	"mat3x3<f32>": "gl.uniformMatrix3fv(location, false, v);",
	"mat4x4<f32>": "gl.uniformMatrix4fv(location, false, v);",
	i32: "gl.uniform1iv(location, v);",
	"vec2<i32>": "gl.uniform2iv(location, v);",
	"vec3<i32>": "gl.uniform3iv(location, v);",
	"vec4<i32>": "gl.uniform4iv(location, v);",
	u32: "gl.uniform1iv(location, v);",
	"vec2<u32>": "gl.uniform2iv(location, v);",
	"vec3<u32>": "gl.uniform3iv(location, v);",
	"vec4<u32>": "gl.uniform4iv(location, v);",
	bool: "gl.uniform1iv(location, v);",
	"vec2<bool>": "gl.uniform2iv(location, v);",
	"vec3<bool>": "gl.uniform3iv(location, v);",
	"vec4<bool>": "gl.uniform4iv(location, v);"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/utils/generateUniformsSync.mjs
function Da(e, t) {
	let n = ["\n        var v = null;\n        var cv = null;\n        var cu = null;\n        var t = 0;\n        var gl = renderer.gl;\n        var name = null;\n    "];
	for (let r in e.uniforms) {
		if (!t[r]) {
			e.uniforms[r] instanceof S ? e.uniforms[r].ubo ? n.push(`
                        renderer.shader.bindUniformBlock(uv.${r}, "${r}");
                    `) : n.push(`
                        renderer.shader.updateUniformGroup(uv.${r});
                    `) : e.uniforms[r] instanceof st && n.push(`
                        renderer.shader.bindBufferResource(uv.${r}, "${r}");
                    `);
			continue;
		}
		let i = e.uniformStructures[r], a = !1;
		for (let e = 0; e < Xe.length; e++) {
			let t = Xe[e];
			if (i.type === t.type && t.test(i)) {
				n.push(`name = "${r}";`, Xe[e].uniform), a = !0;
				break;
			}
		}
		if (!a) {
			let e = (i.size === 1 ? Ta : Ea)[i.type].replace("location", `ud["${r}"].location`);
			n.push(`
            cu = ud["${r}"];
            cv = cu.value;
            v = uv["${r}"];
            ${e};`);
		}
	}
	return Function("ud", "uv", "renderer", "syncData", n.join("\n"));
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/shader/GlUniformGroupSystem.mjs
var Oa = class {
	constructor(e) {
		this._cache = {}, this._uniformGroupSyncHash = {}, this._renderer = e, this.gl = null, this._cache = {};
	}
	contextChange(e) {
		this.gl = e;
	}
	updateUniformGroup(e, t, n) {
		let r = this._renderer.shader._getProgramData(t);
		(!e.isStatic || e._dirtyId !== r.uniformDirtyGroups[e.uid]) && (r.uniformDirtyGroups[e.uid] = e._dirtyId, this._getUniformSyncFunction(e, t)(r.uniformData, e.uniforms, this._renderer, n));
	}
	_getUniformSyncFunction(e, t) {
		return this._uniformGroupSyncHash[e._signature]?.[t._key] || this._createUniformSyncFunction(e, t);
	}
	_createUniformSyncFunction(e, t) {
		let n = this._uniformGroupSyncHash[e._signature] || (this._uniformGroupSyncHash[e._signature] = {}), r = this._getSignature(e, t._uniformData, "u");
		return this._cache[r] || (this._cache[r] = this._generateUniformsSync(e, t._uniformData)), n[t._key] = this._cache[r], n[t._key];
	}
	_generateUniformsSync(e, t) {
		return Da(e, t);
	}
	_getSignature(e, t, n) {
		let r = e.uniforms, i = [`${n}-`];
		for (let e in r) i.push(e), t[e] && i.push(t[e].type);
		return i.join("-");
	}
	destroy() {
		this._renderer = null, this._cache = null;
	}
};
Oa.extension = {
	type: [k.WebGLSystem],
	name: "uniformGroup"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/state/mapWebGLBlendModesToPixi.mjs
function ka(e) {
	let t = {};
	if (t.normal = [e.ONE, e.ONE_MINUS_SRC_ALPHA], t.add = [e.ONE, e.ONE], t.multiply = [
		e.DST_COLOR,
		e.ONE_MINUS_SRC_ALPHA,
		e.ONE,
		e.ONE_MINUS_SRC_ALPHA
	], t.screen = [
		e.ONE,
		e.ONE_MINUS_SRC_COLOR,
		e.ONE,
		e.ONE_MINUS_SRC_ALPHA
	], t.none = [0, 0], t["normal-npm"] = [
		e.SRC_ALPHA,
		e.ONE_MINUS_SRC_ALPHA,
		e.ONE,
		e.ONE_MINUS_SRC_ALPHA
	], t["add-npm"] = [
		e.SRC_ALPHA,
		e.ONE,
		e.ONE,
		e.ONE
	], t["screen-npm"] = [
		e.SRC_ALPHA,
		e.ONE_MINUS_SRC_COLOR,
		e.ONE,
		e.ONE_MINUS_SRC_ALPHA
	], t.erase = [e.ZERO, e.ONE_MINUS_SRC_ALPHA], !(e instanceof b.get().getWebGLRenderingContext())) t.min = [
		e.ONE,
		e.ONE,
		e.ONE,
		e.ONE,
		e.MIN,
		e.MIN
	], t.max = [
		e.ONE,
		e.ONE,
		e.ONE,
		e.ONE,
		e.MAX,
		e.MAX
	];
	else {
		let n = e.getExtension("EXT_blend_minmax");
		n && (t.min = [
			e.ONE,
			e.ONE,
			e.ONE,
			e.ONE,
			n.MIN_EXT,
			n.MIN_EXT
		], t.max = [
			e.ONE,
			e.ONE,
			e.ONE,
			e.ONE,
			n.MAX_EXT,
			n.MAX_EXT
		]);
	}
	return t;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/state/GlStateSystem.mjs
var Aa = 0, ja = 1, Ma = 2, Na = 3, Pa = 4, Fa = 5, Ia = class e {
	constructor(e) {
		this._invertFrontFace = !1, this.gl = null, this.stateId = 0, this.polygonOffset = 0, this.blendMode = "none", this._blendEq = !1, this.map = [], this.map[Aa] = this.setBlend, this.map[ja] = this.setOffset, this.map[Ma] = this.setCullFace, this.map[Na] = this.setDepthTest, this.map[Pa] = this.setFrontFace, this.map[Fa] = this.setDepthMask, this.checks = [], this.defaultState = j.for2d(), e.renderTarget.onRenderTargetChange.add(this);
	}
	onRenderTargetChange(e) {
		this._invertFrontFace = !e.isRoot, this._cullFace ? this.setFrontFace(this._frontFace) : this._frontFaceDirty = !0;
	}
	contextChange(e) {
		this.gl = e, this.blendModesMap = ka(e), this.resetState();
	}
	set(e) {
		if (e ||= this.defaultState, this.stateId !== e.data) {
			let t = this.stateId ^ e.data, n = 0;
			for (; t;) t & 1 && this.map[n].call(this, !!(e.data & 1 << n)), t >>= 1, n++;
			this.stateId = e.data;
		}
		for (let t = 0; t < this.checks.length; t++) this.checks[t](this, e);
	}
	forceState(e) {
		e ||= this.defaultState;
		for (let t = 0; t < this.map.length; t++) this.map[t].call(this, !!(e.data & 1 << t));
		for (let t = 0; t < this.checks.length; t++) this.checks[t](this, e);
		this.stateId = e.data;
	}
	setBlend(t) {
		this._updateCheck(e._checkBlendMode, t), this.gl[t ? "enable" : "disable"](this.gl.BLEND);
	}
	setOffset(t) {
		this._updateCheck(e._checkPolygonOffset, t), this.gl[t ? "enable" : "disable"](this.gl.POLYGON_OFFSET_FILL);
	}
	setDepthTest(e) {
		this.gl[e ? "enable" : "disable"](this.gl.DEPTH_TEST);
	}
	setDepthMask(e) {
		this.gl.depthMask(e);
	}
	setCullFace(e) {
		this._cullFace = e, this.gl[e ? "enable" : "disable"](this.gl.CULL_FACE), this._cullFace && this._frontFaceDirty && this.setFrontFace(this._frontFace);
	}
	setFrontFace(e) {
		this._frontFace = e, this._frontFaceDirty = !1;
		let t = this._invertFrontFace ? !e : e;
		this._glFrontFace !== t && (this._glFrontFace = t, this.gl.frontFace(this.gl[t ? "CW" : "CCW"]));
	}
	setBlendMode(e) {
		if (this.blendModesMap[e] || (e = "normal"), e === this.blendMode) return;
		this.blendMode = e;
		let t = this.blendModesMap[e], n = this.gl;
		t.length === 2 ? n.blendFunc(t[0], t[1]) : n.blendFuncSeparate(t[0], t[1], t[2], t[3]), t.length === 6 ? (this._blendEq = !0, n.blendEquationSeparate(t[4], t[5])) : this._blendEq && (this._blendEq = !1, n.blendEquationSeparate(n.FUNC_ADD, n.FUNC_ADD));
	}
	setPolygonOffset(e, t) {
		this.gl.polygonOffset(e, t);
	}
	resetState() {
		this._glFrontFace = !1, this._frontFace = !1, this._cullFace = !1, this._frontFaceDirty = !1, this._invertFrontFace = !1, this.gl.frontFace(this.gl.CCW), this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, !1), this.forceState(this.defaultState), this._blendEq = !0, this.blendMode = "", this.setBlendMode("normal");
	}
	_updateCheck(e, t) {
		let n = this.checks.indexOf(e);
		t && n === -1 ? this.checks.push(e) : !t && n !== -1 && this.checks.splice(n, 1);
	}
	static _checkBlendMode(e, t) {
		e.setBlendMode(t.blendMode);
	}
	static _checkPolygonOffset(e, t) {
		e.setPolygonOffset(1, t.polygonOffset);
	}
	destroy() {
		this.gl = null, this.checks.length = 0;
	}
};
Ia.extension = {
	type: [k.WebGLSystem],
	name: "state"
};
var La = Ia, Ra = class {
	constructor(e) {
		this.target = Bi.TEXTURE_2D, this._layerInitMask = 0, this.texture = e, this.width = -1, this.height = -1, this.type = Z.UNSIGNED_BYTE, this.internalFormat = zi.RGBA, this.format = zi.RGBA, this.samplerType = 0;
	}
	destroy() {}
}, za = {
	id: "buffer",
	upload(e, t, n, r, i, a = !1) {
		let o = i || t.target;
		!a && t.width === e.width && t.height === e.height ? n.texSubImage2D(o, 0, 0, 0, e.width, e.height, t.format, t.type, e.resource) : n.texImage2D(o, 0, t.internalFormat, e.width, e.height, 0, t.format, t.type, e.resource), t.width = e.width, t.height = e.height;
	}
}, Ba = {
	"bc1-rgba-unorm": !0,
	"bc1-rgba-unorm-srgb": !0,
	"bc2-rgba-unorm": !0,
	"bc2-rgba-unorm-srgb": !0,
	"bc3-rgba-unorm": !0,
	"bc3-rgba-unorm-srgb": !0,
	"bc4-r-unorm": !0,
	"bc4-r-snorm": !0,
	"bc5-rg-unorm": !0,
	"bc5-rg-snorm": !0,
	"bc6h-rgb-ufloat": !0,
	"bc6h-rgb-float": !0,
	"bc7-rgba-unorm": !0,
	"bc7-rgba-unorm-srgb": !0,
	"etc2-rgb8unorm": !0,
	"etc2-rgb8unorm-srgb": !0,
	"etc2-rgb8a1unorm": !0,
	"etc2-rgb8a1unorm-srgb": !0,
	"etc2-rgba8unorm": !0,
	"etc2-rgba8unorm-srgb": !0,
	"eac-r11unorm": !0,
	"eac-r11snorm": !0,
	"eac-rg11unorm": !0,
	"eac-rg11snorm": !0,
	"astc-4x4-unorm": !0,
	"astc-4x4-unorm-srgb": !0,
	"astc-5x4-unorm": !0,
	"astc-5x4-unorm-srgb": !0,
	"astc-5x5-unorm": !0,
	"astc-5x5-unorm-srgb": !0,
	"astc-6x5-unorm": !0,
	"astc-6x5-unorm-srgb": !0,
	"astc-6x6-unorm": !0,
	"astc-6x6-unorm-srgb": !0,
	"astc-8x5-unorm": !0,
	"astc-8x5-unorm-srgb": !0,
	"astc-8x6-unorm": !0,
	"astc-8x6-unorm-srgb": !0,
	"astc-8x8-unorm": !0,
	"astc-8x8-unorm-srgb": !0,
	"astc-10x5-unorm": !0,
	"astc-10x5-unorm-srgb": !0,
	"astc-10x6-unorm": !0,
	"astc-10x6-unorm-srgb": !0,
	"astc-10x8-unorm": !0,
	"astc-10x8-unorm-srgb": !0,
	"astc-10x10-unorm": !0,
	"astc-10x10-unorm-srgb": !0,
	"astc-12x10-unorm": !0,
	"astc-12x10-unorm-srgb": !0,
	"astc-12x12-unorm": !0,
	"astc-12x12-unorm-srgb": !0
}, Va = {
	id: "compressed",
	upload(e, t, n, r, i, a) {
		let o = i ?? t.target;
		n.pixelStorei(n.UNPACK_ALIGNMENT, 4);
		let s = e.pixelWidth, c = e.pixelHeight, l = !!Ba[e.format];
		for (let r = 0; r < e.resource.length; r++) {
			let i = e.resource[r];
			l ? n.compressedTexImage2D(o, r, t.internalFormat, s, c, 0, i) : n.texImage2D(o, r, t.internalFormat, s, c, 0, t.format, t.type, i), s = Math.max(s >> 1, 1), c = Math.max(c >> 1, 1);
		}
	}
}, Ha = [
	"right",
	"left",
	"top",
	"bottom",
	"front",
	"back"
];
function Ua(e) {
	return {
		id: "cube",
		upload(t, n, r, i) {
			let a = t.faces;
			for (let t = 0; t < Ha.length; t++) {
				let o = a[Ha[t]];
				(e[o.uploadMethodId] || e.image).upload(o, n, r, i, Bi.TEXTURE_CUBE_MAP_POSITIVE_X + t, !(n._layerInitMask & 1 << t)), n._layerInitMask |= 1 << t;
			}
			n.width = t.pixelWidth, n.height = t.pixelHeight;
		}
	};
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/texture/uploaders/glUploadImageResource.mjs
var Wa = {
	id: "image",
	upload(e, t, n, r, i, a = !1) {
		let o = i || t.target, s = e.pixelWidth, c = e.pixelHeight, l = e.resourceWidth, u = e.resourceHeight, d = r === 2, f = a || t.width !== s || t.height !== c, p = l >= s && u >= c, m = e.resource;
		(d ? Ga : Ka)(n, o, t, s, c, l, u, m, f, p), t.width = s, t.height = c;
	}
};
function Ga(e, t, n, r, i, a, o, s, c, l) {
	if (!l) {
		c && e.texImage2D(t, 0, n.internalFormat, r, i, 0, n.format, n.type, null), e.texSubImage2D(t, 0, 0, 0, a, o, n.format, n.type, s);
		return;
	}
	if (!c) {
		e.texSubImage2D(t, 0, 0, 0, n.format, n.type, s);
		return;
	}
	e.texImage2D(t, 0, n.internalFormat, r, i, 0, n.format, n.type, s);
}
function Ka(e, t, n, r, i, a, o, s, c, l) {
	if (!l) {
		c && e.texImage2D(t, 0, n.internalFormat, r, i, 0, n.format, n.type, null), e.texSubImage2D(t, 0, 0, 0, n.format, n.type, s);
		return;
	}
	if (!c) {
		e.texSubImage2D(t, 0, 0, 0, n.format, n.type, s);
		return;
	}
	e.texImage2D(t, 0, n.internalFormat, n.format, n.type, s);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/texture/uploaders/glUploadVideoResource.mjs
var qa = Yr(), Ja = {
	id: "video",
	upload(e, t, n, r, i, a = qa) {
		if (!e.isValid) {
			let e = i ?? t.target;
			n.texImage2D(e, 0, t.internalFormat, 1, 1, 0, t.format, t.type, null);
			return;
		}
		Wa.upload(e, t, n, r, i, a);
	}
}, Ya = {
	linear: 9729,
	nearest: 9728
}, Xa = {
	linear: {
		linear: 9987,
		nearest: 9985
	},
	nearest: {
		linear: 9986,
		nearest: 9984
	}
}, Za = {
	"clamp-to-edge": 33071,
	repeat: 10497,
	"mirror-repeat": 33648
}, Qa = {
	never: 512,
	less: 513,
	equal: 514,
	"less-equal": 515,
	greater: 516,
	"not-equal": 517,
	"greater-equal": 518,
	always: 519
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/texture/utils/applyStyleParams.mjs
function $a(e, t, n, r, i, a, o, s) {
	let c = a;
	if (!s || e.addressModeU !== "repeat" || e.addressModeV !== "repeat" || e.addressModeW !== "repeat") {
		let n = Za[o ? "clamp-to-edge" : e.addressModeU], r = Za[o ? "clamp-to-edge" : e.addressModeV], a = Za[o ? "clamp-to-edge" : e.addressModeW];
		t[i](c, t.TEXTURE_WRAP_S, n), t[i](c, t.TEXTURE_WRAP_T, r), t.TEXTURE_WRAP_R && t[i](c, t.TEXTURE_WRAP_R, a);
	}
	if ((!s || e.magFilter !== "linear") && t[i](c, t.TEXTURE_MAG_FILTER, Ya[e.magFilter]), n) {
		if (!s || e.mipmapFilter !== "linear") {
			let n = Xa[e.minFilter][e.mipmapFilter];
			t[i](c, t.TEXTURE_MIN_FILTER, n);
		}
	} else t[i](c, t.TEXTURE_MIN_FILTER, Ya[e.minFilter]);
	if (r && e.maxAnisotropy > 1) {
		let n = Math.min(e.maxAnisotropy, t.getParameter(r.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
		t[i](c, r.TEXTURE_MAX_ANISOTROPY_EXT, n);
	}
	e.compare && t[i](c, t.TEXTURE_COMPARE_FUNC, Qa[e.compare]);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/texture/utils/mapFormatToGlFormat.mjs
function eo(e) {
	return {
		r8unorm: e.RED,
		r8snorm: e.RED,
		r8uint: e.RED,
		r8sint: e.RED,
		r16uint: e.RED,
		r16sint: e.RED,
		r16float: e.RED,
		rg8unorm: e.RG,
		rg8snorm: e.RG,
		rg8uint: e.RG,
		rg8sint: e.RG,
		r32uint: e.RED,
		r32sint: e.RED,
		r32float: e.RED,
		rg16uint: e.RG,
		rg16sint: e.RG,
		rg16float: e.RG,
		rgba8unorm: e.RGBA,
		"rgba8unorm-srgb": e.RGBA,
		rgba8snorm: e.RGBA,
		rgba8uint: e.RGBA,
		rgba8sint: e.RGBA,
		bgra8unorm: e.RGBA,
		"bgra8unorm-srgb": e.RGBA,
		rgb9e5ufloat: e.RGB,
		rgb10a2unorm: e.RGBA,
		rg11b10ufloat: e.RGB,
		rg32uint: e.RG,
		rg32sint: e.RG,
		rg32float: e.RG,
		rgba16uint: e.RGBA,
		rgba16sint: e.RGBA,
		rgba16float: e.RGBA,
		rgba32uint: e.RGBA,
		rgba32sint: e.RGBA,
		rgba32float: e.RGBA,
		stencil8: e.STENCIL_INDEX8,
		depth16unorm: e.DEPTH_COMPONENT,
		depth24plus: e.DEPTH_COMPONENT,
		"depth24plus-stencil8": e.DEPTH_STENCIL,
		depth32float: e.DEPTH_COMPONENT,
		"depth32float-stencil8": e.DEPTH_STENCIL
	};
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/texture/utils/mapFormatToGlInternalFormat.mjs
function to(e, t) {
	let n = {}, r = e.RGBA;
	return e instanceof b.get().getWebGLRenderingContext() ? t.srgb && (n = {
		"rgba8unorm-srgb": t.srgb.SRGB8_ALPHA8_EXT,
		"bgra8unorm-srgb": t.srgb.SRGB8_ALPHA8_EXT
	}) : (n = {
		"rgba8unorm-srgb": e.SRGB8_ALPHA8,
		"bgra8unorm-srgb": e.SRGB8_ALPHA8
	}, r = e.RGBA8), {
		r8unorm: e.R8,
		r8snorm: e.R8_SNORM,
		r8uint: e.R8UI,
		r8sint: e.R8I,
		r16uint: e.R16UI,
		r16sint: e.R16I,
		r16float: e.R16F,
		rg8unorm: e.RG8,
		rg8snorm: e.RG8_SNORM,
		rg8uint: e.RG8UI,
		rg8sint: e.RG8I,
		r32uint: e.R32UI,
		r32sint: e.R32I,
		r32float: e.R32F,
		rg16uint: e.RG16UI,
		rg16sint: e.RG16I,
		rg16float: e.RG16F,
		rgba8unorm: e.RGBA,
		...n,
		rgba8snorm: e.RGBA8_SNORM,
		rgba8uint: e.RGBA8UI,
		rgba8sint: e.RGBA8I,
		bgra8unorm: r,
		rgb9e5ufloat: e.RGB9_E5,
		rgb10a2unorm: e.RGB10_A2,
		rg11b10ufloat: e.R11F_G11F_B10F,
		rg32uint: e.RG32UI,
		rg32sint: e.RG32I,
		rg32float: e.RG32F,
		rgba16uint: e.RGBA16UI,
		rgba16sint: e.RGBA16I,
		rgba16float: e.RGBA16F,
		rgba32uint: e.RGBA32UI,
		rgba32sint: e.RGBA32I,
		rgba32float: e.RGBA32F,
		stencil8: e.STENCIL_INDEX8,
		depth16unorm: e.DEPTH_COMPONENT16,
		depth24plus: e.DEPTH_COMPONENT24,
		"depth24plus-stencil8": e.DEPTH24_STENCIL8,
		depth32float: e.DEPTH_COMPONENT32F,
		"depth32float-stencil8": e.DEPTH32F_STENCIL8,
		...t.s3tc ? {
			"bc1-rgba-unorm": t.s3tc.COMPRESSED_RGBA_S3TC_DXT1_EXT,
			"bc2-rgba-unorm": t.s3tc.COMPRESSED_RGBA_S3TC_DXT3_EXT,
			"bc3-rgba-unorm": t.s3tc.COMPRESSED_RGBA_S3TC_DXT5_EXT
		} : {},
		...t.s3tc_sRGB ? {
			"bc1-rgba-unorm-srgb": t.s3tc_sRGB.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT,
			"bc2-rgba-unorm-srgb": t.s3tc_sRGB.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT,
			"bc3-rgba-unorm-srgb": t.s3tc_sRGB.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT
		} : {},
		...t.rgtc ? {
			"bc4-r-unorm": t.rgtc.COMPRESSED_RED_RGTC1_EXT,
			"bc4-r-snorm": t.rgtc.COMPRESSED_SIGNED_RED_RGTC1_EXT,
			"bc5-rg-unorm": t.rgtc.COMPRESSED_RED_GREEN_RGTC2_EXT,
			"bc5-rg-snorm": t.rgtc.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT
		} : {},
		...t.bptc ? {
			"bc6h-rgb-float": t.bptc.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT,
			"bc6h-rgb-ufloat": t.bptc.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT,
			"bc7-rgba-unorm": t.bptc.COMPRESSED_RGBA_BPTC_UNORM_EXT,
			"bc7-rgba-unorm-srgb": t.bptc.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT
		} : {},
		...t.etc ? {
			"etc2-rgb8unorm": t.etc.COMPRESSED_RGB8_ETC2,
			"etc2-rgb8unorm-srgb": t.etc.COMPRESSED_SRGB8_ETC2,
			"etc2-rgb8a1unorm": t.etc.COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2,
			"etc2-rgb8a1unorm-srgb": t.etc.COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2,
			"etc2-rgba8unorm": t.etc.COMPRESSED_RGBA8_ETC2_EAC,
			"etc2-rgba8unorm-srgb": t.etc.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC,
			"eac-r11unorm": t.etc.COMPRESSED_R11_EAC,
			"eac-rg11unorm": t.etc.COMPRESSED_SIGNED_RG11_EAC
		} : {},
		...t.astc ? {
			"astc-4x4-unorm": t.astc.COMPRESSED_RGBA_ASTC_4x4_KHR,
			"astc-4x4-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR,
			"astc-5x4-unorm": t.astc.COMPRESSED_RGBA_ASTC_5x4_KHR,
			"astc-5x4-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR,
			"astc-5x5-unorm": t.astc.COMPRESSED_RGBA_ASTC_5x5_KHR,
			"astc-5x5-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR,
			"astc-6x5-unorm": t.astc.COMPRESSED_RGBA_ASTC_6x5_KHR,
			"astc-6x5-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR,
			"astc-6x6-unorm": t.astc.COMPRESSED_RGBA_ASTC_6x6_KHR,
			"astc-6x6-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR,
			"astc-8x5-unorm": t.astc.COMPRESSED_RGBA_ASTC_8x5_KHR,
			"astc-8x5-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR,
			"astc-8x6-unorm": t.astc.COMPRESSED_RGBA_ASTC_8x6_KHR,
			"astc-8x6-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR,
			"astc-8x8-unorm": t.astc.COMPRESSED_RGBA_ASTC_8x8_KHR,
			"astc-8x8-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR,
			"astc-10x5-unorm": t.astc.COMPRESSED_RGBA_ASTC_10x5_KHR,
			"astc-10x5-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR,
			"astc-10x6-unorm": t.astc.COMPRESSED_RGBA_ASTC_10x6_KHR,
			"astc-10x6-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR,
			"astc-10x8-unorm": t.astc.COMPRESSED_RGBA_ASTC_10x8_KHR,
			"astc-10x8-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR,
			"astc-10x10-unorm": t.astc.COMPRESSED_RGBA_ASTC_10x10_KHR,
			"astc-10x10-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR,
			"astc-12x10-unorm": t.astc.COMPRESSED_RGBA_ASTC_12x10_KHR,
			"astc-12x10-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR,
			"astc-12x12-unorm": t.astc.COMPRESSED_RGBA_ASTC_12x12_KHR,
			"astc-12x12-unorm-srgb": t.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR
		} : {}
	};
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/texture/utils/mapFormatToGlType.mjs
function no(e) {
	return {
		r8unorm: e.UNSIGNED_BYTE,
		r8snorm: e.BYTE,
		r8uint: e.UNSIGNED_BYTE,
		r8sint: e.BYTE,
		r16uint: e.UNSIGNED_SHORT,
		r16sint: e.SHORT,
		r16float: e.HALF_FLOAT,
		rg8unorm: e.UNSIGNED_BYTE,
		rg8snorm: e.BYTE,
		rg8uint: e.UNSIGNED_BYTE,
		rg8sint: e.BYTE,
		r32uint: e.UNSIGNED_INT,
		r32sint: e.INT,
		r32float: e.FLOAT,
		rg16uint: e.UNSIGNED_SHORT,
		rg16sint: e.SHORT,
		rg16float: e.HALF_FLOAT,
		rgba8unorm: e.UNSIGNED_BYTE,
		"rgba8unorm-srgb": e.UNSIGNED_BYTE,
		rgba8snorm: e.BYTE,
		rgba8uint: e.UNSIGNED_BYTE,
		rgba8sint: e.BYTE,
		bgra8unorm: e.UNSIGNED_BYTE,
		"bgra8unorm-srgb": e.UNSIGNED_BYTE,
		rgb9e5ufloat: e.UNSIGNED_INT_5_9_9_9_REV,
		rgb10a2unorm: e.UNSIGNED_INT_2_10_10_10_REV,
		rg11b10ufloat: e.UNSIGNED_INT_10F_11F_11F_REV,
		rg32uint: e.UNSIGNED_INT,
		rg32sint: e.INT,
		rg32float: e.FLOAT,
		rgba16uint: e.UNSIGNED_SHORT,
		rgba16sint: e.SHORT,
		rgba16float: e.HALF_FLOAT,
		rgba32uint: e.UNSIGNED_INT,
		rgba32sint: e.INT,
		rgba32float: e.FLOAT,
		stencil8: e.UNSIGNED_BYTE,
		depth16unorm: e.UNSIGNED_SHORT,
		depth24plus: e.UNSIGNED_INT,
		"depth24plus-stencil8": e.UNSIGNED_INT_24_8,
		depth32float: e.FLOAT,
		"depth32float-stencil8": e.FLOAT_32_UNSIGNED_INT_24_8_REV
	};
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/texture/utils/mapViewDimensionToGlTarget.mjs
function ro(e) {
	return {
		"2d": e.TEXTURE_2D,
		cube: e.TEXTURE_CUBE_MAP,
		"1d": null,
		"3d": e?.TEXTURE_3D || null,
		"2d-array": e?.TEXTURE_2D_ARRAY || null,
		"cube-array": e?.TEXTURE_CUBE_MAP_ARRAY || null
	};
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/texture/GlTextureSystem.mjs
var io = 4, ao = class e {
	constructor(t) {
		this._glSamplers = /* @__PURE__ */ Object.create(null), this._boundTextures = [], this._activeTextureLocation = -1, this._boundSamplers = /* @__PURE__ */ Object.create(null), this._premultiplyAlpha = !1, this._useSeparateSamplers = !1, this._renderer = t, this._managedTextures = new H({
			renderer: t,
			type: "resource",
			onUnload: this.onSourceUnload.bind(this),
			name: "glTexture"
		});
		let n = {
			image: Wa,
			buffer: za,
			video: Ja,
			compressed: Va,
			...e.uploadExtensions
		};
		this._uploads = {
			...n,
			cube: Ua(n)
		};
	}
	get managedTextures() {
		return Object.values(this._managedTextures.items);
	}
	contextChange(e) {
		this._gl = e, this._mapFormatToInternalFormat || (this._mapFormatToInternalFormat = to(e, this._renderer.context.extensions), this._mapFormatToType = no(e), this._mapFormatToFormat = eo(e), this._mapViewDimensionToGlTarget = ro(e)), this._managedTextures.removeAll(!0), this._glSamplers = /* @__PURE__ */ Object.create(null), this._boundSamplers = /* @__PURE__ */ Object.create(null), this._premultiplyAlpha = !1;
		for (let e = 0; e < 16; e++) this.bind(D.EMPTY, e);
	}
	initSource(e) {
		this.bind(e);
	}
	bind(e, t = 0) {
		let n = e.source;
		e ? (this.bindSource(n, t), this._useSeparateSamplers && this._bindSampler(n.style, t)) : (this.bindSource(null, t), this._useSeparateSamplers && this._bindSampler(null, t));
	}
	bindSource(e, t = 0) {
		let n = this._gl;
		if (e._gcLastUsed = this._renderer.gc.now, this._boundTextures[t] !== e) {
			this._boundTextures[t] = e, this._activateLocation(t), e ||= D.EMPTY.source;
			let r = this.getGlSource(e);
			n.bindTexture(r.target, r.texture);
		}
	}
	_bindSampler(e, t = 0) {
		let n = this._gl;
		if (!e) {
			this._boundSamplers[t] = null, n.bindSampler(t, null);
			return;
		}
		let r = this._getGlSampler(e);
		this._boundSamplers[t] !== r && (this._boundSamplers[t] = r, n.bindSampler(t, r));
	}
	unbind(e) {
		let t = e.source, n = this._boundTextures, r = this._gl;
		for (let e = 0; e < n.length; e++) if (n[e] === t) {
			this._activateLocation(e);
			let i = this.getGlSource(t);
			r.bindTexture(i.target, null), n[e] = null;
		}
	}
	_activateLocation(e) {
		this._activeTextureLocation !== e && (this._activeTextureLocation = e, this._gl.activeTexture(this._gl.TEXTURE0 + e));
	}
	_initSource(e) {
		let t = this._gl, n = new Ra(t.createTexture());
		if (n.type = this._mapFormatToType[e.format], n.internalFormat = this._mapFormatToInternalFormat[e.format], n.format = this._mapFormatToFormat[e.format], n.target = this._mapViewDimensionToGlTarget[e.viewDimension], n.target === null) throw Error(`Unsupported view dimension: ${e.viewDimension} with this webgl version: ${this._renderer.context.webGLVersion}`);
		if (e.uploadMethodId === "cube" && (n.target = t.TEXTURE_CUBE_MAP), e.autoGenerateMipmaps && (this._renderer.context.supports.nonPowOf2mipmaps || e.isPowerOfTwo)) {
			let t = Math.max(e.width, e.height);
			e.mipLevelCount = Math.floor(Math.log2(t)) + 1;
		}
		return e._gpuData[this._renderer.uid] = n, this._managedTextures.add(e) && (e.on("update", this.onSourceUpdate, this), e.on("resize", this.onSourceUpdate, this), e.on("styleChange", this.onStyleChange, this), e.on("updateMipmaps", this.onUpdateMipmaps, this)), this.onSourceUpdate(e), this.updateStyle(e, !1), n;
	}
	onStyleChange(e) {
		this.updateStyle(e, !1);
	}
	updateStyle(e, t) {
		let n = this._gl, r = this.getGlSource(e);
		n.bindTexture(r.target, r.texture), this._boundTextures[this._activeTextureLocation] = e, $a(e.style, n, e.mipLevelCount > 1, this._renderer.context.extensions.anisotropicFiltering, "texParameteri", r.target, !this._renderer.context.supports.nonPowOf2wrapping && !e.isPowerOfTwo, t);
	}
	onSourceUnload(e, t = !1) {
		let n = e._gpuData[this._renderer.uid];
		n && (t || (this.unbind(e), this._gl.deleteTexture(n.texture)), e.off("update", this.onSourceUpdate, this), e.off("resize", this.onSourceUpdate, this), e.off("styleChange", this.onStyleChange, this), e.off("updateMipmaps", this.onUpdateMipmaps, this));
	}
	onSourceUpdate(e) {
		let t = this._gl, n = this.getGlSource(e);
		t.bindTexture(n.target, n.texture), this._boundTextures[this._activeTextureLocation] = e;
		let r = e.alphaMode === "premultiply-alpha-on-upload";
		if (this._premultiplyAlpha !== r && (this._premultiplyAlpha = r, t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL, r)), this._uploads[e.uploadMethodId]) this._uploads[e.uploadMethodId].upload(e, n, t, this._renderer.context.webGLVersion);
		else if (n.target === t.TEXTURE_2D) this._initEmptyTexture2D(n, e);
		else if (n.target === t.TEXTURE_2D_ARRAY) this._initEmptyTexture2DArray(n, e);
		else if (n.target === t.TEXTURE_CUBE_MAP) this._initEmptyTextureCube(n, e);
		else throw Error("[GlTextureSystem] Unsupported texture target for empty allocation.");
		this._applyMipRange(n, e), e.autoGenerateMipmaps && e.mipLevelCount > 1 && this.onUpdateMipmaps(e, !1);
	}
	onUpdateMipmaps(e, t = !0) {
		t && this.bindSource(e, 0);
		let n = this.getGlSource(e);
		this._gl.generateMipmap(n.target);
	}
	_initEmptyTexture2D(e, t) {
		let n = this._gl;
		n.texImage2D(n.TEXTURE_2D, 0, e.internalFormat, t.pixelWidth, t.pixelHeight, 0, e.format, e.type, null);
		let r = Math.max(t.pixelWidth >> 1, 1), i = Math.max(t.pixelHeight >> 1, 1);
		for (let a = 1; a < t.mipLevelCount; a++) n.texImage2D(n.TEXTURE_2D, a, e.internalFormat, r, i, 0, e.format, e.type, null), r = Math.max(r >> 1, 1), i = Math.max(i >> 1, 1);
	}
	_initEmptyTexture2DArray(e, t) {
		if (this._renderer.context.webGLVersion !== 2) throw Error("[GlTextureSystem] TEXTURE_2D_ARRAY requires WebGL2.");
		let n = this._gl, r = Math.max(t.arrayLayerCount | 0, 1);
		n.texImage3D(n.TEXTURE_2D_ARRAY, 0, e.internalFormat, t.pixelWidth, t.pixelHeight, r, 0, e.format, e.type, null);
		let i = Math.max(t.pixelWidth >> 1, 1), a = Math.max(t.pixelHeight >> 1, 1);
		for (let o = 1; o < t.mipLevelCount; o++) n.texImage3D(n.TEXTURE_2D_ARRAY, o, e.internalFormat, i, a, r, 0, e.format, e.type, null), i = Math.max(i >> 1, 1), a = Math.max(a >> 1, 1);
	}
	_initEmptyTextureCube(e, t) {
		let n = this._gl;
		for (let r = 0; r < 6; r++) n.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X + r, 0, e.internalFormat, t.pixelWidth, t.pixelHeight, 0, e.format, e.type, null);
		let r = Math.max(t.pixelWidth >> 1, 1), i = Math.max(t.pixelHeight >> 1, 1);
		for (let a = 1; a < t.mipLevelCount; a++) {
			for (let t = 0; t < 6; t++) n.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X + t, a, e.internalFormat, r, i, 0, e.format, e.type, null);
			r = Math.max(r >> 1, 1), i = Math.max(i >> 1, 1);
		}
	}
	_applyMipRange(e, t) {
		if (this._renderer.context.webGLVersion !== 2 || t.mipLevelCount <= 1) return;
		let n = this._gl, r = Math.max((t.mipLevelCount | 0) - 1, 0);
		n.texParameteri(e.target, n.TEXTURE_BASE_LEVEL, 0), n.texParameteri(e.target, n.TEXTURE_MAX_LEVEL, r);
	}
	_initSampler(e) {
		let t = this._gl, n = this._gl.createSampler();
		return this._glSamplers[e._resourceId] = n, $a(e, t, this._boundTextures[this._activeTextureLocation].mipLevelCount > 1, this._renderer.context.extensions.anisotropicFiltering, "samplerParameteri", n, !1, !0), this._glSamplers[e._resourceId];
	}
	_getGlSampler(e) {
		return this._glSamplers[e._resourceId] || this._initSampler(e);
	}
	getGlSource(e) {
		return e._gcLastUsed = this._renderer.gc.now, e._gpuData[this._renderer.uid] || this._initSource(e);
	}
	generateCanvas(e) {
		let { pixels: t, width: n, height: r } = this.getPixels(e), i = b.get().createCanvas();
		i.width = n, i.height = r;
		let a = i.getContext("2d");
		if (a) {
			let e = a.createImageData(n, r);
			e.data.set(t), a.putImageData(e, 0, 0);
		}
		return i;
	}
	getPixels(e) {
		let t = e.source.resolution, n = e.frame, r = Math.max(Math.round(n.width * t), 1), i = Math.max(Math.round(n.height * t), 1), a = new Uint8Array(io * r * i), o = this._renderer, s = o.renderTarget.getRenderTarget(e), c = o.renderTarget.getGpuRenderTarget(s), l = o.gl;
		return l.bindFramebuffer(l.FRAMEBUFFER, c.resolveTargetFramebuffer), l.readPixels(Math.round(n.x * t), Math.round(n.y * t), r, i, l.RGBA, l.UNSIGNED_BYTE, a), {
			pixels: new Uint8ClampedArray(a.buffer),
			width: r,
			height: i
		};
	}
	destroy() {
		this._managedTextures.destroy(), this._glSamplers = null, this._boundTextures = null, this._boundSamplers = null, this._mapFormatToInternalFormat = null, this._mapFormatToType = null, this._mapFormatToFormat = null, this._uploads = null, this._renderer = null;
	}
	resetState() {
		this._activeTextureLocation = -1, this._boundTextures.fill(D.EMPTY.source), this._boundSamplers = /* @__PURE__ */ Object.create(null);
		let e = this._gl;
		this._premultiplyAlpha = !1, e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this._premultiplyAlpha);
	}
};
ao.extension = {
	type: [k.WebGLSystem],
	name: "texture"
}, ao.uploadExtensions = /* @__PURE__ */ Object.create(null);
var oo = ao;
e.handleByMap(k.TextureUploaderWebGL, oo.uploadExtensions);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/graphics/gl/GlGraphicsAdaptor.mjs
var so = class {
	contextChange(e) {
		let t = new S({
			uColor: {
				value: new Float32Array([
					1,
					1,
					1,
					1
				]),
				type: "vec4<f32>"
			},
			uTransformMatrix: {
				value: new a(),
				type: "mat3x3<f32>"
			},
			uRound: {
				value: 0,
				type: "f32"
			}
		}), n = e.limits.maxBatchableTextures, r = Je({
			name: "graphics",
			bits: [
				He,
				qe(n),
				$e,
				Le
			]
		});
		this.shader = new p({
			glProgram: r,
			resources: {
				localUniforms: t,
				batchSamplers: Ke(n)
			}
		});
	}
	execute(e, t) {
		let n = t.context, r = n.customShader || this.shader, i = e.renderer, { batcher: a, instructions: o } = i.graphicsContext.getContextRenderData(n);
		r.groups[0] = i.globalUniforms.bindGroup, i.state.set(e.state), i.shader.bind(r), i.geometry.bind(a.geometry, r.glProgram);
		let s = o.instructions;
		for (let e = 0; e < o.instructionSize; e++) {
			let t = s[e];
			if (t.size) {
				for (let e = 0; e < t.textures.count; e++) i.texture.bind(t.textures.textures[e], e);
				i.geometry.draw(t.topology, t.size, t.start);
			}
		}
	}
	destroy() {
		this.shader.destroy(!0), this.shader = null;
	}
};
so.extension = {
	type: [k.WebGLPipesAdaptor],
	name: "graphics"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/mesh/gl/GlMeshAdaptor.mjs
var co = class {
	init() {
		let e = Je({
			name: "mesh",
			bits: [
				$e,
				ct,
				Le
			]
		});
		this._shader = new p({
			glProgram: e,
			resources: {
				uTexture: D.EMPTY.source,
				textureUniforms: { uTextureMatrix: {
					type: "mat3x3<f32>",
					value: new a()
				} }
			}
		});
	}
	execute(e, t) {
		let n = e.renderer, r = t._shader;
		if (!r) {
			r = this._shader;
			let e = t.texture, n = e.source;
			r.resources.uTexture = n, r.resources.uSampler = n.style, r.resources.textureUniforms.uniforms.uTextureMatrix = e.textureMatrix.mapCoord;
		} else if (!r.glProgram) {
			T("Mesh shader has no glProgram", t.shader);
			return;
		}
		r.groups[100] = n.globalUniforms.bindGroup, r.groups[101] = e.localUniformsBindGroup, n.encoder.draw({
			geometry: t._geometry,
			shader: r,
			state: t.state
		});
	}
	destroy() {
		this._shader.destroy(!0), this._shader = null;
	}
};
co.extension = {
	type: [k.WebGLPipesAdaptor],
	name: "mesh"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gl/WebGLRenderer.mjs
var lo = /* @__PURE__ */ c({ WebGLRenderer: () => _o }), uo = [
	...Ce,
	ia,
	Ji,
	Ri,
	Zi,
	Ii,
	oo,
	oa,
	Gi,
	Oa,
	wa,
	Xi,
	La,
	$i,
	Yi
], fo = [...be], po = [
	Qr,
	co,
	so
], mo = [], ho = [], go = [];
e.handleByNamedList(k.WebGLSystem, mo), e.handleByNamedList(k.WebGLPipes, ho), e.handleByNamedList(k.WebGLPipesAdaptor, go), e.add(...uo, ...fo, ...po);
var _o = class extends Se {
	constructor() {
		let e = {
			name: "webgl",
			type: l.WEBGL,
			systems: mo,
			renderPipes: ho,
			renderPipeAdaptors: go
		};
		super(e);
	}
}, vo = class {
	constructor(e) {
		this._hash = /* @__PURE__ */ Object.create(null), this._renderer = e;
	}
	contextChange(e) {
		this._gpu = e;
	}
	getBindGroup(e, t, n) {
		return e._updateKey(), this._hash[e._key] || this._createBindGroup(e, t, n);
	}
	_createBindGroup(e, t, n) {
		let r = this._gpu.device, i = t.layout[n], a = [], o = this._renderer;
		for (let t in i) {
			let n = e.resources[t] ?? e.resources[i[t]], r;
			if (n._resourceType === "uniformGroup") {
				let e = n;
				o.ubo.updateUniformGroup(e);
				let t = e.buffer;
				r = {
					buffer: o.buffer.getGPUBuffer(t),
					offset: 0,
					size: t.descriptor.size
				};
			} else if (n._resourceType === "buffer") {
				let e = n;
				r = {
					buffer: o.buffer.getGPUBuffer(e),
					offset: 0,
					size: e.descriptor.size
				};
			} else if (n._resourceType === "bufferResource") {
				let e = n;
				r = {
					buffer: o.buffer.getGPUBuffer(e.buffer),
					offset: e.offset,
					size: e.size
				};
			} else if (n._resourceType === "textureSampler") {
				let e = n;
				r = o.texture.getGpuSampler(e);
			} else if (n._resourceType === "textureSource") {
				let e = n;
				r = o.texture.getTextureView(e);
			}
			a.push({
				binding: i[t],
				resource: r
			});
		}
		let s = o.shader.getProgramData(t).bindGroups[n], c = r.createBindGroup({
			layout: s,
			entries: a
		});
		return this._hash[e._key] = c, c;
	}
	destroy() {
		this._hash = null, this._renderer = null;
	}
};
vo.extension = {
	type: [k.WebGPUSystem],
	name: "bindGroup"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/buffer/GpuBufferSystem.mjs
var yo = class {
	constructor(e) {
		this.gpuBuffer = e;
	}
	destroy() {
		this.gpuBuffer.destroy(), this.gpuBuffer = null;
	}
}, bo = class {
	constructor(e) {
		this._renderer = e, this._managedBuffers = new H({
			renderer: e,
			type: "resource",
			onUnload: this.onBufferUnload.bind(this),
			name: "gpuBuffer"
		});
	}
	contextChange(e) {
		this._gpu = e;
	}
	getGPUBuffer(e) {
		return e._gcLastUsed = this._renderer.gc.now, e._gpuData[this._renderer.uid]?.gpuBuffer || this.createGPUBuffer(e);
	}
	updateBuffer(e) {
		let t = this.getGPUBuffer(e), n = e.data;
		return e._updateID && n && (e._updateID = 0, this._gpu.device.queue.writeBuffer(t, 0, n.buffer, 0, (e._updateSize || n.byteLength) + 3 & -4)), t;
	}
	destroyAll() {
		this._managedBuffers.removeAll();
	}
	onBufferUnload(e) {
		e.off("update", this.updateBuffer, this), e.off("change", this.onBufferChange, this);
	}
	createGPUBuffer(e) {
		let t = this._gpu.device.createBuffer(e.descriptor);
		return e._updateID = 0, e._resourceId = m("resource"), e.data && (Ue(e.data.buffer, t.getMappedRange(), e.data.byteOffset, e.data.byteLength), t.unmap()), e._gpuData[this._renderer.uid] = new yo(t), this._managedBuffers.add(e) && (e.on("update", this.updateBuffer, this), e.on("change", this.onBufferChange, this)), t;
	}
	onBufferChange(e) {
		this._managedBuffers.remove(e), e._updateID = 0, this.createGPUBuffer(e);
	}
	destroy() {
		this._managedBuffers.destroy(), this._renderer = null, this._gpu = null;
	}
};
bo.extension = {
	type: [k.WebGPUSystem],
	name: "buffer"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/buffer/UboBatch.mjs
var xo = class {
	constructor({ minUniformOffsetAlignment: e }) {
		this._minUniformOffsetAlignment = 256, this.byteIndex = 0, this._minUniformOffsetAlignment = e, this.data = /* @__PURE__ */ new Float32Array(65535);
	}
	clear() {
		this.byteIndex = 0;
	}
	addEmptyGroup(e) {
		if (e > this._minUniformOffsetAlignment / 4) throw Error(`UniformBufferBatch: array is too large: ${e * 4}`);
		let t = this.byteIndex, n = t + e * 4;
		if (n = Math.ceil(n / this._minUniformOffsetAlignment) * this._minUniformOffsetAlignment, n > this.data.length * 4) throw Error("UniformBufferBatch: ubo batch got too big");
		return this.byteIndex = n, t;
	}
	addGroup(e) {
		let t = this.addEmptyGroup(e.length);
		for (let n = 0; n < e.length; n++) this.data[t / 4 + n] = e[n];
		return t;
	}
	destroy() {
		this.data = null;
	}
}, So = class {
	constructor(e) {
		this._colorMaskCache = 15, this._renderer = e;
	}
	setMask(e) {
		this._colorMaskCache !== e && (this._colorMaskCache = e, this._renderer.pipeline.setColorMask(e));
	}
	destroy() {
		this._renderer = null, this._colorMaskCache = null;
	}
};
So.extension = {
	type: [k.WebGPUSystem],
	name: "colorMask"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/GpuDeviceSystem.mjs
var Co = class {
	constructor(e) {
		this._renderer = e;
	}
	async init(e) {
		return this._initPromise ||= (e.gpu ? Promise.resolve(e.gpu) : this._createDeviceAndAdaptor(e)).then((e) => {
			this.gpu = e, this.extensions = { transientAttachment: typeof GPUTextureUsage.TRANSIENT_ATTACHMENT == "number" }, this._renderer.runners.contextChange.emit(this.gpu);
		}), this._initPromise;
	}
	contextChange(e) {
		this._renderer.gpu = e;
	}
	async _createDeviceAndAdaptor(e) {
		let t = await b.get().getNavigator().gpu.requestAdapter({
			powerPreference: e.powerPreference,
			forceFallbackAdapter: e.forceFallbackAdapter
		}), n = [
			"texture-compression-bc",
			"texture-compression-astc",
			"texture-compression-etc2"
		].filter((e) => t.features.has(e));
		return {
			adapter: t,
			device: await t.requestDevice({ requiredFeatures: n })
		};
	}
	destroy() {
		this.gpu = null, this.extensions = null, this._renderer = null;
	}
};
Co.extension = {
	type: [k.WebGPUSystem],
	name: "device"
}, Co.defaultOptions = {
	powerPreference: void 0,
	forceFallbackAdapter: !1
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/GpuEncoderSystem.mjs
var wo = class {
	constructor(e) {
		this._boundBindGroup = /* @__PURE__ */ Object.create(null), this._boundVertexBuffer = /* @__PURE__ */ Object.create(null), this._renderer = e;
	}
	renderStart() {
		this.commandFinished = new Promise((e) => {
			this._resolveCommandFinished = e;
		}), this.commandEncoder = this._renderer.gpu.device.createCommandEncoder();
	}
	beginRenderPass(e) {
		this.endRenderPass(), this._clearCache(), this.renderPassEncoder = this.commandEncoder.beginRenderPass(e.descriptor);
	}
	endRenderPass() {
		this.renderPassEncoder && this.renderPassEncoder.end(), this.renderPassEncoder = null;
	}
	setViewport(e) {
		this.renderPassEncoder.setViewport(e.x, e.y, e.width, e.height, 0, 1);
	}
	setPipelineFromGeometryProgramAndState(e, t, n, r) {
		let i = this._renderer.pipeline.getPipeline(e, t, n, r);
		this.setPipeline(i);
	}
	setPipeline(e) {
		this._boundPipeline !== e && (this._boundPipeline = e, this.renderPassEncoder.setPipeline(e));
	}
	_setVertexBuffer(e, t) {
		this._boundVertexBuffer[e] !== t && (this._boundVertexBuffer[e] = t, this.renderPassEncoder.setVertexBuffer(e, this._renderer.buffer.updateBuffer(t)));
	}
	_setIndexBuffer(e) {
		if (this._boundIndexBuffer === e) return;
		this._boundIndexBuffer = e;
		let t = e.data.BYTES_PER_ELEMENT === 2 ? "uint16" : "uint32";
		this.renderPassEncoder.setIndexBuffer(this._renderer.buffer.updateBuffer(e), t);
	}
	resetBindGroup(e) {
		this._boundBindGroup[e] = null;
	}
	setBindGroup(e, t, n) {
		if (this._boundBindGroup[e] === t) return;
		this._boundBindGroup[e] = t, t._touch(this._renderer.gc.now, this._renderer.tick);
		let r = this._renderer.bindGroup.getBindGroup(t, n, e);
		this.renderPassEncoder.setBindGroup(e, r);
	}
	setGeometry(e, t) {
		let n = this._renderer.pipeline.getBufferNamesToBind(e, t);
		for (let t in n) this._setVertexBuffer(parseInt(t, 10), e.attributes[n[t]].buffer);
		e.indexBuffer && this._setIndexBuffer(e.indexBuffer);
	}
	_setShaderBindGroups(e, t) {
		for (let n in e.groups) {
			let r = e.groups[n];
			t || this._syncBindGroup(r), this.setBindGroup(n, r, e.gpuProgram);
		}
	}
	_syncBindGroup(e) {
		for (let t in e.resources) {
			let n = e.resources[t];
			n.isUniformGroup && this._renderer.ubo.updateUniformGroup(n);
		}
	}
	draw(e) {
		let { geometry: t, shader: n, state: r, topology: i, size: a, start: o, instanceCount: s, skipSync: c } = e;
		this.setPipelineFromGeometryProgramAndState(t, n.gpuProgram, r, i), this.setGeometry(t, n.gpuProgram), this._setShaderBindGroups(n, c), t.indexBuffer ? this.renderPassEncoder.drawIndexed(a || t.indexBuffer.data.length, s ?? t.instanceCount, o || 0) : this.renderPassEncoder.draw(a || t.getSize(), s ?? t.instanceCount, o || 0);
	}
	finishRenderPass() {
		this.renderPassEncoder &&= (this.renderPassEncoder.end(), null);
	}
	postrender() {
		this.finishRenderPass(), this._gpu.device.queue.submit([this.commandEncoder.finish()]), this._resolveCommandFinished(), this.commandEncoder = null;
	}
	restoreRenderPass() {
		let e = this._renderer.renderTarget.adaptor.getDescriptor(this._renderer.renderTarget.renderTarget, !1, [
			0,
			0,
			0,
			1
		], this._renderer.renderTarget.mipLevel, this._renderer.renderTarget.layer);
		this.renderPassEncoder = this.commandEncoder.beginRenderPass(e);
		let t = this._boundPipeline, n = { ...this._boundVertexBuffer }, r = this._boundIndexBuffer, i = { ...this._boundBindGroup };
		this._clearCache();
		let a = this._renderer.renderTarget.viewport;
		this.renderPassEncoder.setViewport(a.x, a.y, a.width, a.height, 0, 1), this.setPipeline(t);
		for (let e in n) this._setVertexBuffer(e, n[e]);
		for (let e in i) this.setBindGroup(e, i[e], null);
		this._setIndexBuffer(r);
	}
	_clearCache() {
		for (let e = 0; e < 16; e++) this._boundBindGroup[e] = null, this._boundVertexBuffer[e] = null;
		this._boundIndexBuffer = null, this._boundPipeline = null;
	}
	destroy() {
		this._renderer = null, this._gpu = null, this._boundBindGroup = null, this._boundVertexBuffer = null, this._boundIndexBuffer = null, this._boundPipeline = null;
	}
	contextChange(e) {
		this._gpu = e;
	}
};
wo.extension = {
	type: [k.WebGPUSystem],
	name: "encoder",
	priority: 1
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/GpuLimitsSystem.mjs
var To = class {
	constructor(e) {
		this._renderer = e;
	}
	contextChange() {
		this.maxTextures = this._renderer.device.gpu.device.limits.maxSampledTexturesPerShaderStage, this.maxBatchableTextures = this.maxTextures;
	}
	destroy() {}
};
To.extension = {
	type: [k.WebGPUSystem],
	name: "limits"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/GpuStencilSystem.mjs
var Eo = class {
	constructor(e) {
		this._renderTargetStencilState = /* @__PURE__ */ Object.create(null), this._renderer = e, e.renderTarget.onRenderTargetChange.add(this);
	}
	onRenderTargetChange(e) {
		let t = this._renderTargetStencilState[e.uid];
		t ||= this._renderTargetStencilState[e.uid] = {
			stencilMode: Ge.DISABLED,
			stencilReference: 0
		}, this._activeRenderTarget = e, this.setStencilMode(t.stencilMode, t.stencilReference);
	}
	setStencilMode(e, t) {
		let n = this._renderTargetStencilState[this._activeRenderTarget.uid];
		n.stencilMode = e, n.stencilReference = t;
		let r = this._renderer;
		r.pipeline.setStencilMode(e), r.encoder.renderPassEncoder.setStencilReference(t);
	}
	destroy() {
		this._renderer.renderTarget.onRenderTargetChange.remove(this), this._renderer = null, this._activeRenderTarget = null, this._renderTargetStencilState = null;
	}
};
Eo.extension = {
	type: [k.WebGPUSystem],
	name: "stencil"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/shader/utils/createUboElementsWGSL.mjs
var Do = {
	i32: {
		align: 4,
		size: 4
	},
	u32: {
		align: 4,
		size: 4
	},
	f32: {
		align: 4,
		size: 4
	},
	f16: {
		align: 2,
		size: 2
	},
	"vec2<i32>": {
		align: 8,
		size: 8
	},
	"vec2<u32>": {
		align: 8,
		size: 8
	},
	"vec2<f32>": {
		align: 8,
		size: 8
	},
	"vec2<f16>": {
		align: 4,
		size: 4
	},
	"vec3<i32>": {
		align: 16,
		size: 12
	},
	"vec3<u32>": {
		align: 16,
		size: 12
	},
	"vec3<f32>": {
		align: 16,
		size: 12
	},
	"vec3<f16>": {
		align: 8,
		size: 6
	},
	"vec4<i32>": {
		align: 16,
		size: 16
	},
	"vec4<u32>": {
		align: 16,
		size: 16
	},
	"vec4<f32>": {
		align: 16,
		size: 16
	},
	"vec4<f16>": {
		align: 8,
		size: 8
	},
	"mat2x2<f32>": {
		align: 8,
		size: 16
	},
	"mat2x2<f16>": {
		align: 4,
		size: 8
	},
	"mat3x2<f32>": {
		align: 8,
		size: 24
	},
	"mat3x2<f16>": {
		align: 4,
		size: 12
	},
	"mat4x2<f32>": {
		align: 8,
		size: 32
	},
	"mat4x2<f16>": {
		align: 4,
		size: 16
	},
	"mat2x3<f32>": {
		align: 16,
		size: 32
	},
	"mat2x3<f16>": {
		align: 8,
		size: 16
	},
	"mat3x3<f32>": {
		align: 16,
		size: 48
	},
	"mat3x3<f16>": {
		align: 8,
		size: 24
	},
	"mat4x3<f32>": {
		align: 16,
		size: 64
	},
	"mat4x3<f16>": {
		align: 8,
		size: 32
	},
	"mat2x4<f32>": {
		align: 16,
		size: 32
	},
	"mat2x4<f16>": {
		align: 8,
		size: 16
	},
	"mat3x4<f32>": {
		align: 16,
		size: 48
	},
	"mat3x4<f16>": {
		align: 8,
		size: 24
	},
	"mat4x4<f32>": {
		align: 16,
		size: 64
	},
	"mat4x4<f16>": {
		align: 8,
		size: 32
	}
};
function Oo(e) {
	let t = e.map((e) => ({
		data: e,
		offset: 0,
		size: 0
	})), n = 0;
	for (let e = 0; e < t.length; e++) {
		let r = t[e], i = Do[r.data.type].size, a = Do[r.data.type].align;
		if (!Do[r.data.type]) throw Error(`[Pixi.js] WebGPU UniformBuffer: Unknown type ${r.data.type}`);
		r.data.size > 1 && (i = Math.max(i, a) * r.data.size), n = Math.ceil(n / a) * a, r.size = i, r.offset = n, n += i;
	}
	return n = Math.ceil(n / 16) * 16, {
		uboElements: t,
		size: n
	};
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/shader/utils/generateArraySyncWGSL.mjs
function ko(e, t) {
	let { size: n, align: r } = Do[e.data.type], i = (r - n) / 4, a = e.data.type.indexOf("i32") >= 0 ? "dataInt32" : "data";
	return `
         v = uv.${e.data.name};
         ${t === 0 ? "" : `offset += ${t};`}

         arrayOffset = offset;

         t = 0;

         for(var i=0; i < ${e.data.size * (n / 4)}; i++)
         {
             for(var j = 0; j < ${n / 4}; j++)
             {
                 ${a}[arrayOffset++] = v[t++];
             }
             ${i === 0 ? "" : `arrayOffset += ${i};`}
         }
     `;
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/shader/utils/createUboSyncFunctionWGSL.mjs
function Ao(e) {
	return et(e, "uboWgsl", ko, at);
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/GpuUboSystem.mjs
var jo = class extends rt {
	constructor() {
		super({
			createUboElements: Oo,
			generateUboSync: Ao
		});
	}
};
jo.extension = {
	type: [k.WebGPUSystem],
	name: "ubo"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/GpuUniformBatchPipe.mjs
var Q = 128, Mo = class {
	constructor(e) {
		this._bindGroupHash = /* @__PURE__ */ Object.create(null), this._buffers = [], this._bindGroups = [], this._bufferResources = [], this._renderer = e, this._batchBuffer = new xo({ minUniformOffsetAlignment: Q });
		let t = 256 / Q;
		for (let e = 0; e < t; e++) {
			let t = x.UNIFORM | x.COPY_DST;
			e === 0 && (t |= x.COPY_SRC), this._buffers.push(new v({
				data: this._batchBuffer.data,
				usage: t
			}));
		}
	}
	renderEnd() {
		this._uploadBindGroups(), this._resetBindGroups();
	}
	_resetBindGroups() {
		this._bindGroupHash = /* @__PURE__ */ Object.create(null), this._batchBuffer.clear();
	}
	getUniformBindGroup(e, t) {
		if (!t && this._bindGroupHash[e.uid]) return this._bindGroupHash[e.uid];
		this._renderer.ubo.ensureUniformGroup(e);
		let n = e.buffer.data, r = this._batchBuffer.addEmptyGroup(n.length);
		return this._renderer.ubo.syncUniformGroup(e, this._batchBuffer.data, r / 4), this._bindGroupHash[e.uid] = this._getBindGroup(r / Q), this._bindGroupHash[e.uid];
	}
	getUboResource(e) {
		this._renderer.ubo.updateUniformGroup(e);
		let t = e.buffer.data, n = this._batchBuffer.addGroup(t);
		return this._getBufferResource(n / Q);
	}
	getArrayBindGroup(e) {
		let t = this._batchBuffer.addGroup(e);
		return this._getBindGroup(t / Q);
	}
	getArrayBufferResource(e) {
		let t = this._batchBuffer.addGroup(e) / Q;
		return this._getBufferResource(t);
	}
	_getBufferResource(e) {
		if (!this._bufferResources[e]) {
			let t = this._buffers[e % 2];
			this._bufferResources[e] = new st({
				buffer: t,
				offset: (e / 2 | 0) * 256,
				size: Q
			});
		}
		return this._bufferResources[e];
	}
	_getBindGroup(e) {
		if (!this._bindGroups[e]) {
			let t = new y({ 0: this._getBufferResource(e) });
			this._bindGroups[e] = t;
		}
		return this._bindGroups[e];
	}
	_uploadBindGroups() {
		let e = this._renderer.buffer, t = this._buffers[0];
		t.update(this._batchBuffer.byteIndex), e.updateBuffer(t);
		let n = this._renderer.gpu.device.createCommandEncoder();
		for (let r = 1; r < this._buffers.length; r++) {
			let i = this._buffers[r];
			n.copyBufferToBuffer(e.getGPUBuffer(t), Q, e.getGPUBuffer(i), 0, this._batchBuffer.byteIndex);
		}
		this._renderer.gpu.device.queue.submit([n.finish()]);
	}
	destroy() {
		for (let e = 0; e < this._bindGroups.length; e++) this._bindGroups[e]?.destroy();
		this._bindGroups = null, this._bindGroupHash = null;
		for (let e = 0; e < this._buffers.length; e++) this._buffers[e].destroy();
		this._buffers = null;
		for (let e = 0; e < this._bufferResources.length; e++) this._bufferResources[e].destroy();
		this._bufferResources = null, this._batchBuffer.destroy(), this._renderer = null;
	}
};
Mo.extension = {
	type: [k.WebGPUPipes],
	name: "uniformBatch"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/pipeline/PipelineSystem.mjs
var No = {
	"point-list": 0,
	"line-list": 1,
	"line-strip": 2,
	"triangle-list": 3,
	"triangle-strip": 4
};
function Po(e, t, n, r, i) {
	return e << 24 | t << 16 | n << 10 | r << 5 | i;
}
function Fo(e, t, n, r, i) {
	return n << 8 | e << 5 | r << 3 | i << 1 | t;
}
var Io = class {
	constructor(e) {
		this._moduleCache = /* @__PURE__ */ Object.create(null), this._bufferLayoutsCache = /* @__PURE__ */ Object.create(null), this._bindingNamesCache = /* @__PURE__ */ Object.create(null), this._pipeCache = /* @__PURE__ */ Object.create(null), this._pipeStateCaches = /* @__PURE__ */ Object.create(null), this._colorMask = 15, this._multisampleCount = 1, this._colorTargetCount = 1, this._renderer = e;
	}
	contextChange(e) {
		this._gpu = e, this.setStencilMode(Ge.DISABLED), this._updatePipeHash();
	}
	setMultisampleCount(e) {
		this._multisampleCount !== e && (this._multisampleCount = e, this._updatePipeHash());
	}
	setRenderTarget(e) {
		this._multisampleCount = e.msaaSamples, this._depthStencilAttachment = +!!e.descriptor.depthStencilAttachment, this._colorTargetCount = e.colorTargetCount, this._updatePipeHash();
	}
	setColorMask(e) {
		this._colorMask !== e && (this._colorMask = e, this._updatePipeHash());
	}
	setStencilMode(e) {
		this._stencilMode !== e && (this._stencilMode = e, this._stencilState = ot[e], this._updatePipeHash());
	}
	setPipeline(e, t, n, r) {
		let i = this.getPipeline(e, t, n);
		r.setPipeline(i);
	}
	getPipeline(e, t, n, r) {
		e._layoutKey || (Ze(e, t.attributeData), this._generateBufferKey(e)), r ||= e.topology;
		let i = Po(e._layoutKey, t._layoutKey, n.data, n._blendModeId, No[r]);
		return this._pipeCache[i] || (this._pipeCache[i] = this._createPipeline(e, t, n, r)), this._pipeCache[i];
	}
	_createPipeline(e, t, n, r) {
		let i = this._gpu.device, a = this._createVertexBufferLayouts(e, t), o = this._renderer.state.getColorTargets(n, this._colorTargetCount), s = this._stencilMode === Ge.RENDERING_MASK_ADD ? 0 : this._colorMask;
		for (let e = 0; e < o.length; e++) o[e].writeMask = s;
		let c = this._renderer.shader.getProgramData(t).pipeline, l = {
			vertex: {
				module: this._getModule(t.vertex.source),
				entryPoint: t.vertex.entryPoint,
				buffers: a
			},
			fragment: {
				module: this._getModule(t.fragment.source),
				entryPoint: t.fragment.entryPoint,
				targets: o
			},
			primitive: {
				topology: r,
				cullMode: n.cullMode
			},
			layout: c,
			multisample: { count: this._multisampleCount },
			label: "PIXI Pipeline"
		};
		return this._depthStencilAttachment && (l.depthStencil = {
			...this._stencilState,
			format: "depth24plus-stencil8",
			depthWriteEnabled: n.depthTest,
			depthCompare: n.depthTest ? "less" : "always"
		}), i.createRenderPipeline(l);
	}
	_getModule(e) {
		return this._moduleCache[e] || this._createModule(e);
	}
	_createModule(e) {
		let t = this._gpu.device;
		return this._moduleCache[e] = t.createShaderModule({ code: e }), this._moduleCache[e];
	}
	_generateBufferKey(e) {
		let t = [], n = 0, r = Object.keys(e.attributes).sort();
		for (let i = 0; i < r.length; i++) {
			let a = e.attributes[r[i]];
			t[n++] = a.offset, t[n++] = a.format, t[n++] = a.stride, t[n++] = a.instance;
		}
		let i = t.join("|");
		return e._layoutKey = u(i, "geometry"), e._layoutKey;
	}
	_generateAttributeLocationsKey(e) {
		let t = [], n = 0, r = Object.keys(e.attributeData).sort();
		for (let i = 0; i < r.length; i++) {
			let a = e.attributeData[r[i]];
			t[n++] = a.location;
		}
		let i = t.join("|");
		return e._attributeLocationsKey = u(i, "programAttributes"), e._attributeLocationsKey;
	}
	getBufferNamesToBind(e, t) {
		let n = e._layoutKey << 16 | t._attributeLocationsKey;
		if (this._bindingNamesCache[n]) return this._bindingNamesCache[n];
		let r = this._createVertexBufferLayouts(e, t), i = /* @__PURE__ */ Object.create(null), a = t.attributeData;
		for (let e = 0; e < r.length; e++) {
			let t = Object.values(r[e].attributes)[0].shaderLocation;
			for (let n in a) if (a[n].location === t) {
				i[e] = n;
				break;
			}
		}
		return this._bindingNamesCache[n] = i, i;
	}
	_createVertexBufferLayouts(e, t) {
		t._attributeLocationsKey || this._generateAttributeLocationsKey(t);
		let n = e._layoutKey << 16 | t._attributeLocationsKey;
		if (this._bufferLayoutsCache[n]) return this._bufferLayoutsCache[n];
		let r = [];
		return e.buffers.forEach((n) => {
			let i = {
				arrayStride: 0,
				stepMode: "vertex",
				attributes: []
			}, a = i.attributes;
			for (let r in t.attributeData) {
				let o = e.attributes[r];
				(o.divisor ?? 1) !== 1 && T(`Attribute ${r} has an invalid divisor value of '${o.divisor}'. WebGPU only supports a divisor value of 1`), o.buffer === n && (i.arrayStride = o.stride, i.stepMode = o.instance ? "instance" : "vertex", a.push({
					shaderLocation: t.attributeData[r].location,
					offset: o.offset,
					format: o.format
				}));
			}
			a.length && r.push(i);
		}), this._bufferLayoutsCache[n] = r, r;
	}
	_updatePipeHash() {
		let e = Fo(this._stencilMode, this._multisampleCount, this._colorMask, this._depthStencilAttachment, this._colorTargetCount);
		this._pipeStateCaches[e] || (this._pipeStateCaches[e] = /* @__PURE__ */ Object.create(null)), this._pipeCache = this._pipeStateCaches[e];
	}
	destroy() {
		this._renderer = null, this._bufferLayoutsCache = null;
	}
};
Io.extension = {
	type: [k.WebGPUSystem],
	name: "pipeline"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/renderTarget/GpuRenderTarget.mjs
var Lo = class {
	constructor() {
		this.contexts = [], this.msaaTextures = [], this.msaaSamples = 1;
	}
}, Ro = class {
	init(e, t) {
		this._renderer = e, this._renderTargetSystem = t;
	}
	copyToTexture(e, t, n, r, i) {
		let a = this._renderer, o = this._getGpuColorTexture(e), s = a.texture.getGpuSource(t.source);
		return a.encoder.commandEncoder.copyTextureToTexture({
			texture: o,
			origin: n
		}, {
			texture: s,
			origin: i
		}, r), t;
	}
	startRenderPass(e, t = !0, n, r, i = 0, a = 0) {
		let o = this._renderTargetSystem.getGpuRenderTarget(e);
		if (a !== 0 && o.msaaTextures?.length) throw Error("[RenderTargetSystem] Rendering to array layers is not supported with MSAA render targets.");
		if (i > 0 && o.msaaTextures?.length) throw Error("[RenderTargetSystem] Rendering to mip levels is not supported with MSAA render targets.");
		o.descriptor = this.getDescriptor(e, t, n, i, a), this._renderer.pipeline.setRenderTarget(o), this._renderer.encoder.beginRenderPass(o), this._renderer.encoder.setViewport(r);
	}
	finishRenderPass() {
		this._renderer.encoder.endRenderPass();
	}
	_getGpuColorTexture(e) {
		let t = this._renderTargetSystem.getGpuRenderTarget(e);
		return t.contexts[0] ? t.contexts[0].getCurrentTexture() : this._renderer.texture.getGpuSource(e.colorTextures[0].source);
	}
	getDescriptor(e, t, n, r = 0, i = 0) {
		typeof t == "boolean" && (t = t ? B.ALL : B.NONE);
		let a = this._renderTargetSystem, o = a.getGpuRenderTarget(e), s = e.colorTextures.map((e, s) => {
			let c = o.contexts[s], l, u;
			if (c) {
				if (i !== 0) throw Error("[RenderTargetSystem] Rendering to array layers is not supported for canvas targets.");
				l = c.getCurrentTexture().createView();
			} else l = this._renderer.texture.getGpuSource(e).createView({
				dimension: "2d",
				baseMipLevel: r,
				mipLevelCount: 1,
				baseArrayLayer: i,
				arrayLayerCount: 1
			});
			let d = !1;
			o.msaaTextures[s] && (u = l, l = this._renderer.texture.getTextureView(o.msaaTextures[s]), d = o.msaaTextures[s].transient);
			let f = t & B.COLOR ? "clear" : "load";
			return n ??= a.defaultClearColor, {
				view: l,
				resolveTarget: u,
				clearValue: n,
				storeOp: d ? "discard" : "store",
				loadOp: f
			};
		}), c;
		if ((e.stencil || e.depth) && !e.depthStencilTexture && (e.ensureDepthStencilTexture(), e.depthStencilTexture.source.sampleCount = o.msaa ? 4 : 1, e.depthStencilTexture.source.transient = !!o.msaaTextures[0]?.transient), e.depthStencilTexture) {
			let n = t & B.STENCIL ? "clear" : "load", a = t & B.DEPTH ? "clear" : "load", o = e.depthStencilTexture.source.transient ? "discard" : "store";
			c = {
				view: this._renderer.texture.getGpuSource(e.depthStencilTexture.source).createView({
					dimension: "2d",
					baseMipLevel: r,
					mipLevelCount: 1,
					baseArrayLayer: i,
					arrayLayerCount: 1
				}),
				stencilStoreOp: o,
				stencilLoadOp: n,
				depthClearValue: 1,
				depthLoadOp: a,
				depthStoreOp: o
			};
		}
		return {
			colorAttachments: s,
			depthStencilAttachment: c
		};
	}
	clear(e, t = !0, n, r, i = 0, a = 0) {
		if (!t) return;
		let { gpu: o, encoder: s } = this._renderer, c = o.device;
		if (s.commandEncoder === null) {
			let o = c.createCommandEncoder(), s = this.getDescriptor(e, t, n, i, a), l = o.beginRenderPass(s);
			l.setViewport(r.x, r.y, r.width, r.height, 0, 1), l.end();
			let u = o.finish();
			c.queue.submit([u]);
		} else this.startRenderPass(e, t, n, r, i, a);
	}
	initGpuRenderTarget(e) {
		e.isRoot = !0;
		let t = new Lo();
		return t.colorTargetCount = e.colorTextures.length, e.colorTextures.forEach((e, n) => {
			if (e instanceof ee) {
				let r = e.resource.getContext("webgpu"), i = e.transparent ? "premultiplied" : "opaque";
				try {
					r.configure({
						device: this._renderer.gpu.device,
						usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
						format: "bgra8unorm",
						alphaMode: i
					});
				} catch (e) {
					console.error(e);
				}
				t.contexts[n] = r;
			}
			if (t.msaa = e.source.antialias, e.source.antialias) {
				let r = new E({
					width: 0,
					height: 0,
					sampleCount: 4,
					transient: e.source.transient,
					arrayLayerCount: e.source.arrayLayerCount
				});
				t.msaaTextures[n] = r;
			}
		}), t.msaa && (t.msaaSamples = 4, e.depthStencilTexture && (e.depthStencilTexture.source.sampleCount = 4, e.depthStencilTexture.source.transient = !!t.msaaTextures[0]?.transient)), t;
	}
	destroyGpuRenderTarget(e) {
		e.contexts.forEach((e) => {
			e.unconfigure();
		}), e.msaaTextures.forEach((e) => {
			e.destroy();
		}), e.msaaTextures.length = 0, e.contexts.length = 0;
	}
	ensureDepthStencilTexture(e) {
		let t = this._renderTargetSystem.getGpuRenderTarget(e);
		e.depthStencilTexture && t.msaa && (e.depthStencilTexture.source.sampleCount = 4);
	}
	resizeGpuRenderTarget(e) {
		let t = this._renderTargetSystem.getGpuRenderTarget(e);
		t.width = e.width, t.height = e.height, t.msaa && e.colorTextures.forEach((e, n) => {
			t.msaaTextures[n]?.resize(e.source.width, e.source.height, e.source._resolution);
		});
	}
}, zo = class extends Te {
	constructor(e) {
		super(e), this.adaptor = new Ro(), this.adaptor.init(e, this);
	}
};
zo.extension = {
	type: [k.WebGPUSystem],
	name: "renderTarget"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/shader/GpuShaderSystem.mjs
var Bo = class {
	constructor() {
		this._gpuProgramData = /* @__PURE__ */ Object.create(null);
	}
	contextChange(e) {
		this._gpu = e;
	}
	getProgramData(e) {
		return this._gpuProgramData[e._layoutKey] || this._createGPUProgramData(e);
	}
	_createGPUProgramData(e) {
		let t = this._gpu.device, n = e.gpuLayout.map((e) => t.createBindGroupLayout({ entries: e })), r = { bindGroupLayouts: n };
		return this._gpuProgramData[e._layoutKey] = {
			bindGroups: n,
			pipeline: t.createPipelineLayout(r)
		}, this._gpuProgramData[e._layoutKey];
	}
	destroy() {
		this._gpu = null, this._gpuProgramData = null;
	}
};
Bo.extension = {
	type: [k.WebGPUSystem],
	name: "shader"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/state/GpuBlendModesToPixi.mjs
var $ = {};
$.normal = {
	alpha: {
		srcFactor: "one",
		dstFactor: "one-minus-src-alpha",
		operation: "add"
	},
	color: {
		srcFactor: "one",
		dstFactor: "one-minus-src-alpha",
		operation: "add"
	}
}, $.add = {
	alpha: {
		srcFactor: "src-alpha",
		dstFactor: "one-minus-src-alpha",
		operation: "add"
	},
	color: {
		srcFactor: "one",
		dstFactor: "one",
		operation: "add"
	}
}, $.multiply = {
	alpha: {
		srcFactor: "one",
		dstFactor: "one-minus-src-alpha",
		operation: "add"
	},
	color: {
		srcFactor: "dst",
		dstFactor: "one-minus-src-alpha",
		operation: "add"
	}
}, $.screen = {
	alpha: {
		srcFactor: "one",
		dstFactor: "one-minus-src-alpha",
		operation: "add"
	},
	color: {
		srcFactor: "one",
		dstFactor: "one-minus-src",
		operation: "add"
	}
}, $.overlay = {
	alpha: {
		srcFactor: "one",
		dstFactor: "one-minus-src-alpha",
		operation: "add"
	},
	color: {
		srcFactor: "one",
		dstFactor: "one-minus-src",
		operation: "add"
	}
}, $.none = {
	alpha: {
		srcFactor: "one",
		dstFactor: "one-minus-src-alpha",
		operation: "add"
	},
	color: {
		srcFactor: "zero",
		dstFactor: "zero",
		operation: "add"
	}
}, $["normal-npm"] = {
	alpha: {
		srcFactor: "one",
		dstFactor: "one-minus-src-alpha",
		operation: "add"
	},
	color: {
		srcFactor: "src-alpha",
		dstFactor: "one-minus-src-alpha",
		operation: "add"
	}
}, $["add-npm"] = {
	alpha: {
		srcFactor: "one",
		dstFactor: "one",
		operation: "add"
	},
	color: {
		srcFactor: "src-alpha",
		dstFactor: "one",
		operation: "add"
	}
}, $["screen-npm"] = {
	alpha: {
		srcFactor: "one",
		dstFactor: "one-minus-src-alpha",
		operation: "add"
	},
	color: {
		srcFactor: "src-alpha",
		dstFactor: "one-minus-src",
		operation: "add"
	}
}, $.erase = {
	alpha: {
		srcFactor: "zero",
		dstFactor: "one-minus-src-alpha",
		operation: "add"
	},
	color: {
		srcFactor: "zero",
		dstFactor: "one-minus-src",
		operation: "add"
	}
}, $.min = {
	alpha: {
		srcFactor: "one",
		dstFactor: "one",
		operation: "min"
	},
	color: {
		srcFactor: "one",
		dstFactor: "one",
		operation: "min"
	}
}, $.max = {
	alpha: {
		srcFactor: "one",
		dstFactor: "one",
		operation: "max"
	},
	color: {
		srcFactor: "one",
		dstFactor: "one",
		operation: "max"
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/state/GpuStateSystem.mjs
var Vo = class {
	constructor() {
		this.defaultState = new j(), this.defaultState.blend = !0;
	}
	contextChange(e) {
		this.gpu = e;
	}
	getColorTargets(e, t) {
		let n = $[e.blendMode] || $.normal, r = [], i = {
			format: "bgra8unorm",
			writeMask: 0,
			blend: n
		};
		for (let e = 0; e < t; e++) r[e] = i;
		return r;
	}
	destroy() {
		this.gpu = null;
	}
};
Vo.extension = {
	type: [k.WebGPUSystem],
	name: "state"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/texture/uploaders/gpuUploadBufferImageResource.mjs
var Ho = {
	type: "image",
	upload(e, t, n, r = 0) {
		let i = e.resource, a = (e.pixelWidth | 0) * (e.pixelHeight | 0), o = i.byteLength / a;
		n.device.queue.writeTexture({
			texture: t,
			origin: {
				x: 0,
				y: 0,
				z: r
			}
		}, i, {
			offset: 0,
			rowsPerImage: e.pixelHeight,
			bytesPerRow: e.pixelWidth * o
		}, {
			width: e.pixelWidth,
			height: e.pixelHeight,
			depthOrArrayLayers: 1
		});
	}
}, Uo = {
	"bc1-rgba-unorm": {
		blockBytes: 8,
		blockWidth: 4,
		blockHeight: 4
	},
	"bc2-rgba-unorm": {
		blockBytes: 16,
		blockWidth: 4,
		blockHeight: 4
	},
	"bc3-rgba-unorm": {
		blockBytes: 16,
		blockWidth: 4,
		blockHeight: 4
	},
	"bc7-rgba-unorm": {
		blockBytes: 16,
		blockWidth: 4,
		blockHeight: 4
	},
	"etc1-rgb-unorm": {
		blockBytes: 8,
		blockWidth: 4,
		blockHeight: 4
	},
	"etc2-rgba8unorm": {
		blockBytes: 16,
		blockWidth: 4,
		blockHeight: 4
	},
	"astc-4x4-unorm": {
		blockBytes: 16,
		blockWidth: 4,
		blockHeight: 4
	}
}, Wo = {
	blockBytes: 4,
	blockWidth: 1,
	blockHeight: 1
}, Go = {
	type: "compressed",
	upload(e, t, n, r = 0) {
		let i = e.pixelWidth, a = e.pixelHeight, o = Uo[e.format] || Wo;
		for (let s = 0; s < e.resource.length; s++) {
			let c = e.resource[s], l = Math.ceil(i / o.blockWidth) * o.blockBytes;
			n.device.queue.writeTexture({
				texture: t,
				mipLevel: s,
				origin: {
					x: 0,
					y: 0,
					z: r
				}
			}, c, {
				offset: 0,
				bytesPerRow: l
			}, {
				width: Math.ceil(i / o.blockWidth) * o.blockWidth,
				height: Math.ceil(a / o.blockHeight) * o.blockHeight,
				depthOrArrayLayers: 1
			}), i = Math.max(i >> 1, 1), a = Math.max(a >> 1, 1);
		}
	}
}, Ko = [
	"right",
	"left",
	"top",
	"bottom",
	"front",
	"back"
];
function qo(e) {
	return {
		type: "cube",
		upload(t, n, r) {
			let i = t.faces;
			for (let t = 0; t < Ko.length; t++) {
				let a = i[Ko[t]];
				(e[a.uploadMethodId] || e.image).upload(a, n, r, t);
			}
		}
	};
}
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/texture/uploaders/gpuUploadImageSource.mjs
var Jo = {
	type: "image",
	upload(e, t, n, r = 0) {
		let i = e.resource;
		if (!i) return;
		if (globalThis.HTMLImageElement && i instanceof HTMLImageElement) {
			let t = b.get().createCanvas(i.width, i.height);
			t.getContext("2d").drawImage(i, 0, 0, i.width, i.height), e.resource = t, T("ImageSource: Image element passed, converting to canvas and replacing resource.");
		}
		let a = Math.min(t.width, e.resourceWidth || e.pixelWidth), o = Math.min(t.height, e.resourceHeight || e.pixelHeight), s = e.alphaMode === "premultiply-alpha-on-upload";
		n.device.queue.copyExternalImageToTexture({ source: i }, {
			texture: t,
			origin: {
				x: 0,
				y: 0,
				z: r
			},
			premultipliedAlpha: s
		}, {
			width: a,
			height: o
		});
	}
}, Yo = {
	type: "video",
	upload(e, t, n, r) {
		Jo.upload(e, t, n, r);
	}
}, Xo = class {
	constructor(e) {
		this.device = e, this.sampler = e.createSampler({ minFilter: "linear" }), this.pipelines = {};
	}
	_getMipmapPipeline(e) {
		let t = this.pipelines[e];
		return t || (this.mipmapShaderModule ||= this.device.createShaderModule({ code: "\n                        var<private> pos : array<vec2<f32>, 3> = array<vec2<f32>, 3>(\n                        vec2<f32>(-1.0, -1.0), vec2<f32>(-1.0, 3.0), vec2<f32>(3.0, -1.0));\n\n                        struct VertexOutput {\n                        @builtin(position) position : vec4<f32>,\n                        @location(0) texCoord : vec2<f32>,\n                        };\n\n                        @vertex\n                        fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {\n                        var output : VertexOutput;\n                        output.texCoord = pos[vertexIndex] * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5);\n                        output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);\n                        return output;\n                        }\n\n                        @group(0) @binding(0) var imgSampler : sampler;\n                        @group(0) @binding(1) var img : texture_2d<f32>;\n\n                        @fragment\n                        fn fragmentMain(@location(0) texCoord : vec2<f32>) -> @location(0) vec4<f32> {\n                        return textureSample(img, imgSampler, texCoord);\n                        }\n                    " }), t = this.device.createRenderPipeline({
			layout: "auto",
			vertex: {
				module: this.mipmapShaderModule,
				entryPoint: "vertexMain"
			},
			fragment: {
				module: this.mipmapShaderModule,
				entryPoint: "fragmentMain",
				targets: [{ format: e }]
			}
		}), this.pipelines[e] = t), t;
	}
	generateMipmap(e) {
		let t = this._getMipmapPipeline(e.format);
		if (e.dimension === "3d" || e.dimension === "1d") throw Error("Generating mipmaps for non-2d textures is currently unsupported!");
		let n = e, r = e.depthOrArrayLayers || 1, i = e.usage & GPUTextureUsage.RENDER_ATTACHMENT;
		if (!i) {
			let t = {
				size: {
					width: Math.ceil(e.width / 2),
					height: Math.ceil(e.height / 2),
					depthOrArrayLayers: r
				},
				format: e.format,
				usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT,
				mipLevelCount: e.mipLevelCount - 1
			};
			n = this.device.createTexture(t);
		}
		let a = this.device.createCommandEncoder({}), o = t.getBindGroupLayout(0);
		for (let s = 0; s < r; ++s) {
			let r = e.createView({
				baseMipLevel: 0,
				mipLevelCount: 1,
				dimension: "2d",
				baseArrayLayer: s,
				arrayLayerCount: 1
			}), c = +!!i;
			for (let i = 1; i < e.mipLevelCount; ++i) {
				let e = n.createView({
					baseMipLevel: c++,
					mipLevelCount: 1,
					dimension: "2d",
					baseArrayLayer: s,
					arrayLayerCount: 1
				}), i = a.beginRenderPass({ colorAttachments: [{
					view: e,
					storeOp: "store",
					loadOp: "clear",
					clearValue: {
						r: 0,
						g: 0,
						b: 0,
						a: 0
					}
				}] }), l = this.device.createBindGroup({
					layout: o,
					entries: [{
						binding: 0,
						resource: this.sampler
					}, {
						binding: 1,
						resource: r
					}]
				});
				i.setPipeline(t), i.setBindGroup(0, l), i.draw(3, 1, 0, 0), i.end(), r = e;
			}
		}
		if (!i) {
			let t = {
				width: Math.ceil(e.width / 2),
				height: Math.ceil(e.height / 2),
				depthOrArrayLayers: r
			};
			for (let r = 1; r < e.mipLevelCount; ++r) a.copyTextureToTexture({
				texture: n,
				mipLevel: r - 1
			}, {
				texture: e,
				mipLevel: r
			}, t), t.width = Math.ceil(t.width / 2), t.height = Math.ceil(t.height / 2);
		}
		return this.device.queue.submit([a.finish()]), i || n.destroy(), e;
	}
}, Zo = class {
	constructor(e) {
		this.textureView = null, this.gpuTexture = e;
	}
	destroy() {
		this.gpuTexture.destroy(), this.textureView = null, this.gpuTexture = null;
	}
}, Qo = class e {
	constructor(t) {
		this._gpuSamplers = /* @__PURE__ */ Object.create(null), this._bindGroupHash = /* @__PURE__ */ Object.create(null), this._renderer = t, t.gc.addCollection(this, "_bindGroupHash", "hash"), this._managedTextures = new H({
			renderer: t,
			type: "resource",
			onUnload: this.onSourceUnload.bind(this),
			name: "gpuTextureSource"
		});
		let n = {
			image: Jo,
			buffer: Ho,
			video: Yo,
			compressed: Go,
			...e.uploadExtensions
		};
		this._uploads = {
			...n,
			cube: qo(n)
		};
	}
	get managedTextures() {
		return Object.values(this._managedTextures.items);
	}
	contextChange(e) {
		this._gpu = e;
	}
	initSource(e) {
		return e._gpuData[this._renderer.uid]?.gpuTexture || this._initSource(e);
	}
	_initSource(e) {
		if (e.autoGenerateMipmaps) {
			let t = Math.max(e.pixelWidth, e.pixelHeight);
			e.mipLevelCount = Math.floor(Math.log2(t)) + 1;
		}
		let t;
		e.sampleCount > 1 ? (t = GPUTextureUsage.RENDER_ATTACHMENT, e.transient && this._renderer.device.extensions.transientAttachment && (t |= GPUTextureUsage.TRANSIENT_ATTACHMENT)) : (t = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST, e.uploadMethodId !== "compressed" && (t |= GPUTextureUsage.RENDER_ATTACHMENT, t |= GPUTextureUsage.COPY_SRC));
		let n = Uo[e.format] || {
			blockBytes: 4,
			blockWidth: 1,
			blockHeight: 1
		}, r = Math.ceil(e.pixelWidth / n.blockWidth) * n.blockWidth, i = Math.ceil(e.pixelHeight / n.blockHeight) * n.blockHeight, a = {
			label: e.label,
			size: {
				width: r,
				height: i,
				depthOrArrayLayers: e.arrayLayerCount
			},
			format: e.format,
			sampleCount: e.sampleCount,
			mipLevelCount: e.mipLevelCount,
			dimension: e.dimension,
			usage: t
		}, o = this._gpu.device.createTexture(a);
		return e._gpuData[this._renderer.uid] = new Zo(o), this._managedTextures.add(e) && (e.on("update", this.onSourceUpdate, this), e.on("resize", this.onSourceResize, this), e.on("updateMipmaps", this.onUpdateMipmaps, this)), this.onSourceUpdate(e), o;
	}
	onSourceUpdate(e) {
		let t = this.getGpuSource(e);
		t && (this._uploads[e.uploadMethodId] && this._uploads[e.uploadMethodId].upload(e, t, this._gpu), e.autoGenerateMipmaps && e.mipLevelCount > 1 && this.onUpdateMipmaps(e));
	}
	onUpdateMipmaps(e) {
		this._mipmapGenerator ||= new Xo(this._gpu.device);
		let t = this.getGpuSource(e);
		this._mipmapGenerator.generateMipmap(t);
	}
	onSourceUnload(e) {
		e.off("update", this.onSourceUpdate, this), e.off("resize", this.onSourceResize, this), e.off("updateMipmaps", this.onUpdateMipmaps, this);
	}
	onSourceResize(e) {
		e._gcLastUsed = this._renderer.gc.now;
		let t = e._gpuData[this._renderer.uid], n = t?.gpuTexture;
		n ? (n.width !== e.pixelWidth || n.height !== e.pixelHeight) && (t.destroy(), this._bindGroupHash[e.uid] = null, e._gpuData[this._renderer.uid] = null, this.initSource(e)) : this.initSource(e);
	}
	_initSampler(e) {
		return this._gpuSamplers[e._resourceId] = this._gpu.device.createSampler(e), this._gpuSamplers[e._resourceId];
	}
	getGpuSampler(e) {
		return this._gpuSamplers[e._resourceId] || this._initSampler(e);
	}
	getGpuSource(e) {
		return e._gcLastUsed = this._renderer.gc.now, e._gpuData[this._renderer.uid]?.gpuTexture || this.initSource(e);
	}
	getTextureBindGroup(e) {
		return this._bindGroupHash[e.uid] || this._createTextureBindGroup(e);
	}
	_createTextureBindGroup(e) {
		let t = e.source;
		return this._bindGroupHash[e.uid] = new y({
			0: t,
			1: t.style,
			2: new S({ uTextureMatrix: {
				type: "mat3x3<f32>",
				value: e.textureMatrix.mapCoord
			} })
		}), this._bindGroupHash[e.uid];
	}
	getTextureView(e) {
		let t = e.source;
		t._gcLastUsed = this._renderer.gc.now;
		let n = t._gpuData[this._renderer.uid];
		return n ||= (this.initSource(t), t._gpuData[this._renderer.uid]), n.textureView || (n.textureView = n.gpuTexture.createView({ dimension: t.viewDimension })), n.textureView;
	}
	generateCanvas(e) {
		let t = this._renderer, n = t.gpu.device.createCommandEncoder(), r = b.get().createCanvas();
		r.width = e.source.pixelWidth, r.height = e.source.pixelHeight;
		let i = r.getContext("webgpu");
		return i.configure({
			device: t.gpu.device,
			usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC,
			format: b.get().getNavigator().gpu.getPreferredCanvasFormat(),
			alphaMode: "premultiplied"
		}), n.copyTextureToTexture({
			texture: t.texture.getGpuSource(e.source),
			origin: {
				x: 0,
				y: 0
			}
		}, { texture: i.getCurrentTexture() }, {
			width: r.width,
			height: r.height
		}), t.gpu.device.queue.submit([n.finish()]), r;
	}
	getPixels(e) {
		let t = this.generateCanvas(e), n = Ye.getOptimalCanvasAndContext(t.width, t.height), r = n.context;
		r.drawImage(t, 0, 0);
		let { width: i, height: a } = t, o = r.getImageData(0, 0, i, a), s = new Uint8ClampedArray(o.data.buffer);
		return Ye.returnCanvasAndContext(n), {
			pixels: s,
			width: i,
			height: a
		};
	}
	destroy() {
		this._managedTextures.destroy();
		for (let e of Object.keys(this._bindGroupHash)) {
			let t = Number(e);
			this._bindGroupHash[t]?.destroy();
		}
		this._renderer = null, this._gpu = null, this._mipmapGenerator = null, this._gpuSamplers = null, this._bindGroupHash = null;
	}
};
Qo.extension = {
	type: [k.WebGPUSystem],
	name: "texture"
}, Qo.uploadExtensions = /* @__PURE__ */ Object.create(null);
var $o = Qo;
e.handleByMap(k.TextureUploaderWebGPU, $o.uploadExtensions);
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/graphics/gpu/GpuGraphicsAdaptor.mjs
var es = class {
	constructor() {
		this._maxTextures = 0;
	}
	contextChange(e) {
		let t = new S({
			uTransformMatrix: {
				value: new a(),
				type: "mat3x3<f32>"
			},
			uColor: {
				value: new Float32Array([
					1,
					1,
					1,
					1
				]),
				type: "vec4<f32>"
			},
			uRound: {
				value: 0,
				type: "f32"
			}
		});
		this._maxTextures = e.limits.maxBatchableTextures;
		let n = ze({
			name: "graphics",
			bits: [
				Re,
				We(this._maxTextures),
				it,
				Ve
			]
		});
		this.shader = new p({
			gpuProgram: n,
			resources: { localUniforms: t }
		});
	}
	execute(e, t) {
		let n = t.context, r = n.customShader || this.shader, i = e.renderer, { batcher: a, instructions: o } = i.graphicsContext.getContextRenderData(n), s = i.encoder;
		s.setGeometry(a.geometry, r.gpuProgram);
		let c = i.globalUniforms.bindGroup;
		s.setBindGroup(0, c, r.gpuProgram);
		let l = i.renderPipes.uniformBatch.getUniformBindGroup(r.resources.localUniforms, !0);
		s.setBindGroup(2, l, r.gpuProgram);
		let u = o.instructions, d = null;
		for (let t = 0; t < o.instructionSize; t++) {
			let n = u[t];
			if (n.topology !== d && (d = n.topology, s.setPipelineFromGeometryProgramAndState(a.geometry, r.gpuProgram, e.state, n.topology)), r.groups[1] = n.bindGroup, !n.gpuBindGroup) {
				let e = n.textures;
				n.bindGroup = Ie(e.textures, e.count, this._maxTextures), n.gpuBindGroup = i.bindGroup.getBindGroup(n.bindGroup, r.gpuProgram, 1);
			}
			s.setBindGroup(1, n.bindGroup, r.gpuProgram), s.renderPassEncoder.drawIndexed(n.size, 1, n.start);
		}
	}
	destroy() {
		this.shader.destroy(!0), this.shader = null;
	}
};
es.extension = {
	type: [k.WebGPUPipesAdaptor],
	name: "graphics"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/scene/mesh/gpu/GpuMeshAdapter.mjs
var ts = class {
	init() {
		let e = ze({
			name: "mesh",
			bits: [
				Qe,
				tt,
				Ve
			]
		});
		this._shader = new p({
			gpuProgram: e,
			resources: {
				uTexture: D.EMPTY._source,
				uSampler: D.EMPTY._source.style,
				textureUniforms: { uTextureMatrix: {
					type: "mat3x3<f32>",
					value: new a()
				} }
			}
		});
	}
	execute(e, t) {
		let n = e.renderer, r = t._shader;
		if (!r) r = this._shader, r.groups[2] = n.texture.getTextureBindGroup(t.texture);
		else if (!r.gpuProgram) {
			T("Mesh shader has no gpuProgram", t.shader);
			return;
		}
		let i = r.gpuProgram;
		if (i.autoAssignGlobalUniforms && (r.groups[0] = n.globalUniforms.bindGroup), i.autoAssignLocalUniforms) {
			let t = e.localUniforms;
			r.groups[1] = n.renderPipes.uniformBatch.getUniformBindGroup(t, !0);
		}
		n.encoder.draw({
			geometry: t._geometry,
			shader: r,
			state: t.state
		});
	}
	destroy() {
		this._shader.destroy(!0), this._shader = null;
	}
};
ts.extension = {
	type: [k.WebGPUPipesAdaptor],
	name: "mesh"
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/rendering/renderers/gpu/WebGPURenderer.mjs
var ns = /* @__PURE__ */ c({ WebGPURenderer: () => ls }), rs = [
	...Ce,
	jo,
	wo,
	Co,
	To,
	bo,
	$o,
	zo,
	Bo,
	Vo,
	Io,
	So,
	Eo,
	vo
], is = [...be, Mo], as = [
	ei,
	ts,
	es
], os = [], ss = [], cs = [];
e.handleByNamedList(k.WebGPUSystem, os), e.handleByNamedList(k.WebGPUPipes, ss), e.handleByNamedList(k.WebGPUPipesAdaptor, cs), e.add(...rs, ...is, ...as);
var ls = class extends Se {
	constructor() {
		let e = {
			name: "webgpu",
			type: l.WEBGPU,
			systems: os,
			renderPipes: ss,
			renderPipeAdaptors: cs
		};
		super(e);
	}
}, us = /* @__PURE__ */ c({ BitmapFont: () => ds }), ds = class extends zr {
	constructor(e, t) {
		super();
		let { textures: i, data: a } = e;
		Object.keys(a.pages).forEach((e) => {
			let t = a.pages[parseInt(e, 10)], n = i[t.id];
			this.pages.push({ texture: n });
		}), Object.keys(a.chars).forEach((e) => {
			let t = a.chars[e], { frame: o, source: s, rotate: c } = i[t.page], l = r.transformRectCoords(t, o, c, new n()), u = new D({
				frame: l,
				orig: new n(0, 0, t.width, t.height),
				source: s,
				rotate: c
			});
			this.chars[e] = {
				id: e.codePointAt(0),
				xOffset: t.xOffset,
				yOffset: t.yOffset,
				xAdvance: t.xAdvance,
				kerning: t.kerning ?? {},
				texture: u
			};
		}), this.baseRenderedFontSize = a.fontSize, this.baseMeasurementFontSize = a.fontSize, this.fontMetrics = {
			ascent: 0,
			descent: 0,
			fontSize: a.fontSize
		}, this.baseLineOffset = a.baseLineOffset, this.lineHeight = a.lineHeight, this.fontFamily = a.fontFamily, this.distanceField = a.distanceField ?? {
			type: "none",
			range: 0
		}, this.url = t;
	}
	destroy() {
		super.destroy();
		for (let e = 0; e < this.pages.length; e++) {
			let { texture: t } = this.pages[e];
			t.destroy(!0);
		}
		this.pages = null;
	}
	static install(e) {
		Jr.install(e);
	}
	static uninstall(e) {
		Jr.uninstall(e);
	}
};
//#endregion
//#region node_modules/.pnpm/pixi.js@8.19.0/node_modules/pixi.js/lib/index.mjs
e.add(lt, ut);
//#endregion
//#region src/arena/pet-texture.ts
var fs = /^#[0-9a-f]{6}$/i, ps = /* @__PURE__ */ new Set([
	"none",
	"bandana",
	"visor",
	"crown",
	"headphones",
	"cape"
]), ms = /* @__PURE__ */ new Set([
	"focused",
	"happy",
	"fierce",
	"sleepy"
]);
function hs(e, t = "#38bdf8") {
	let n = e || {};
	return {
		name: String(n.name || "").slice(0, 24),
		species: String(n.species || "emberrat").replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "emberrat",
		color: fs.test(n.color || "") ? n.color : t,
		accent: fs.test(n.accent || "") ? n.accent : "#ffffff",
		trail: [
			"none",
			"dust",
			"spark",
			"rainbow"
		].includes(n.trail || "") ? n.trail : "none",
		accessory: ps.has(n.accessory) ? n.accessory : "none",
		expression: ms.has(n.expression) ? n.expression : "focused"
	};
}
function gs(e) {
	let t = 2166136261;
	for (let n of e) t = Math.imul(t ^ n.charCodeAt(0), 16777619);
	return t >>> 0;
}
function _s(e, t) {
	let n = hs(e, t), r = gs(n.species) % 4, i = r === 0 ? "<path d=\"M10 13V5h8v8M46 13V5h8v8\"/>" : r === 1 ? "<path d=\"M8 14 14 4l8 10M42 14l8-10 6 10\"/>" : r === 2 ? "<path d=\"M12 13 8 7h12M44 13l12-6-4 10\"/>" : "", a = n.expression === "sleepy" ? "<path d=\"M20 25h7M37 25h7\"/>" : n.expression === "happy" ? "<path d=\"m20 24 4 3 4-3m8 0 4 3 4-3\"/>" : "<rect x=\"21\" y=\"23\" width=\"6\" height=\"6\"/><rect x=\"37\" y=\"23\" width=\"6\" height=\"6\"/>", o = n.expression === "fierce" ? "<path d=\"m26 36 6-3 6 3\"/>" : "<path d=\"M27 34h10\"/>", s = n.accessory === "crown" ? "<path fill=\"" + n.accent + "\" d=\"M20 13V4l6 6 6-8 6 8 6-6v9z\"/>" : n.accessory === "visor" ? "<rect fill=\"" + n.accent + "\" x=\"17\" y=\"20\" width=\"30\" height=\"8\"/>" : n.accessory === "bandana" ? "<path fill=\"" + n.accent + "\" d=\"M12 37h40v6H38l-6 8-6-8H12z\"/>" : n.accessory === "cape" ? "<path fill=\"" + n.accent + "\" d=\"M10 34 2 58h28l2-20z\"/>" : n.accessory === "headphones" ? "<path fill=\"none\" stroke=\"" + n.accent + "\" stroke-width=\"5\" d=\"M14 28a18 18 0 0 1 36 0v10M11 28h7v12h-7m35-12h7v12h-7\"/>" : "";
	return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" shape-rendering="crispEdges"><g fill="${n.color}">${i}<rect x="12" y="12" width="40" height="34" rx="4"/><rect x="18" y="43" width="10" height="14"/><rect x="38" y="43" width="10" height="14"/></g><g fill="${n.accent}" stroke="${n.accent}" stroke-width="3">${a}${o}</g>${s}</svg>`;
}
function vs(e, t) {
	return `data:image/svg+xml,${encodeURIComponent(_s(e, t))}`;
}
function ys(e, t, n) {
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
function bs(e, t) {
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
function xs(e, t, n) {
	let r = Math.max(1, n), i = Math.max(0, Math.min(r - 1, t));
	return e.laneTop + e.laneHeight * ((i + .5) / r);
}
function Ss(e, t) {
	let n = Math.max(0, Math.min(1, t));
	return e.trackLeft + e.trackWidth * n;
}
//#endregion
//#region src/arena/pixi-stage.ts
var Cs = 594991, ws = 1451599, Ts = 9157887, Es = 12118271, Ds = class {
	app = new bt();
	scenery = new A({ label: "scenery" });
	course = new A({ label: "course" });
	actors = new A({ label: "racers" });
	effects = new A({ label: "effects" });
	overlay = new A({ label: "overlay" });
	#e = new U({ label: "sky" });
	#t = new U({ label: "track" });
	#n = new U({ label: "lane-lines" });
	#r = new U({ label: "finish-line" });
	#i = new U({ label: "speed-lines" });
	#a = new U({ label: "leaderboard-panel" });
	#o = new Rr({
		text: "",
		style: {
			fill: 16777215,
			fontFamily: "monospace",
			fontSize: 12,
			lineHeight: 16
		}
	});
	#s = new Rr({
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
	#l = bs(1280, 720);
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
		this.#u = e, this.#d.clear(), this.actors.removeChildren(), await Promise.all(e.map(async (e) => {
			let t = new A({ label: `racer-${e.id}` });
			t.eventMode = "none";
			let n = hs(e.pet, e.color), r = new U({ label: `trail-${n.trail}` }), i = new U().ellipse(0, 13, 22, 7).fill({
				color: 0,
				alpha: .34
			}), a = await Pn.load(vs(n, e.color));
			a.source.scaleMode = "nearest";
			let o = new M(a);
			o.label = `pet-${n.species}`, o.anchor.set(.5, .72), o.width = 58, o.height = 58, t.addChild(r, i, o), this.#d.set(e.id, {
				root: t,
				sprite: o,
				trail: r,
				trailKind: n.trail,
				accent: this.#_(n.accent)
			}), this.actors.addChild(t);
		})), this.#p();
	}
	render(e) {
		this.#f = e;
		let t = e.state === "running" ? Math.min(1, e.heat / 3) : 0;
		this.#m(e.elapsedMs, t), this.#h(e);
		for (let t of e.racers) {
			let n = this.#d.get(t.id);
			if (!n) continue;
			let r = ys(t.reaction, t.finished, e.state), i = Math.sin(e.elapsedMs * (r === "surge" ? .035 : .022) + t.lane);
			n.root.x = Ss(this.#l, t.progress), n.root.y = xs(this.#l, t.lane, this.#u.length), n.root.scale.set(this.#l.actorScale * (t.leading ? 1.08 : 1)), n.root.rotation = r === "stumble" ? -.18 : r === "jump" ? i * .1 : i * .035, n.root.alpha = e.state === "idle" ? .9 : 1, n.sprite.y = r === "run" || r === "surge" ? -Math.abs(i) * (r === "surge" ? 8 : 4) : r === "jump" ? -14 : r === "win" ? -Math.abs(i) * 10 : 0, n.sprite.scale.x = r === "stumble" ? 1.14 : r === "surge" ? 1.12 : 1, n.sprite.scale.y = r === "stumble" ? .78 : r === "jump" ? 1.12 : 1, this.#g(n, e.elapsedMs, r !== "idle");
		}
		let n = e.state === "running" ? t * Math.sin(e.elapsedMs * .055) * 2.2 : 0;
		this.course.y = n, this.actors.y = -n * .35;
	}
	resize() {
		this.app.resize(), this.#l = bs(this.app.screen.width, this.app.screen.height), this.#p(), this.#f && this.render(this.#f);
	}
	destroy() {
		this.#d.clear(), this.#u = [], this.#f = null, this.app.destroy(!0, { children: !0 }), this.#c = null;
	}
	#p() {
		let e = this.#l;
		this.#e.clear().rect(0, 0, e.width, e.height).fill(Cs), this.#t.clear().rect(0, e.laneTop, e.width, e.laneHeight).fill(ws), this.#n.clear();
		let t = Math.max(1, this.#u.length);
		for (let n = 1; n < t; n++) {
			let r = e.laneTop + e.laneHeight * (n / t);
			this.#n.moveTo(0, r).lineTo(e.width, r).stroke({
				color: Ts,
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
				color: Es,
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
		let t = Number.parseInt(e.replace("#", ""), 16);
		return Number.isFinite(t) ? t : 3718648;
	}
};
//#endregion
//#region src/arena/runtime.ts
async function Os(e, t) {
	if (!e) return null;
	let n = Array.from(e.children), r = new Map(n.map((e) => [e, e.style.visibility])), i = document.createElement("div");
	i.className = "arena-pixi-host", Object.assign(i.style, {
		position: "absolute",
		inset: "0",
		zIndex: "8",
		overflow: "hidden",
		pointerEvents: "none"
	}), getComputedStyle(e).position === "static" && (e.style.position = "relative"), e.appendChild(i);
	let a = new Ds();
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
export { Os as createArenaRenderer };

//# sourceMappingURL=pixi-runtime.js.map
