(function(){

var $ = new (function() {
	var   global = window
		, doc = document
		, loaded = false
		, $ = this;
	
	this.$$ = function(q, el) {
		if (!el) el = doc;
		return el.querySelectorAll(q);
	};

	this.$ = function(q, el) {
		if (!el) el = doc;
		return el.querySelector(q);
	};

	var onReadyCallbacks = [];
	this.onReady = function(f) {
		if (loaded) f.call(global);
		else onReadyCallbacks.push(f);
		return $;
	}
	document.addEventListener("DOMContentLoaded", function() {
		loaded = true;
		for (var i = 0, l = onReadyCallbacks.length; i < l; i++) {
			onReadyCallbacks[i].call(global);
		}
		onReadyCallbacks = null;
	}, false);
	
	this.signal = function(n, d) {
		var e = doc.createEvent("Event");
		e.initEvent(n, true, false);
		e.signalData = d;
		doc.dispatchEvent(e);
		return $;
	};
	
	this.create = function(n, a, c, p, xns) {
		var r = (xns && doc.createElementNS ? doc.createElementNS(xns, n) : doc.createElement(n));
		if (a) {
			for (var i in a) {
				if (!a.hasOwnProperty(i)) continue;
				var curAttr = a[i];
				var ns = i.split(/:/);
				var ns0 = ns[0];
				if (ns.length == 1) {
					if (ns0 == "class") {
						cnl = curAttr.split();
						var l = cnl.length;
						if (l > 0) r.className = cnl[0];
						for (var j = 1; j < l; j++) {
							r.className = [r.className, " ", cnl[j]].join("");
						}
					} else r.setAttribute(ns0, curAttr);
				} else {
					if (ns0 == "svg") {
						ns0 = "http://www.w3.org/2000/svg";
					} else if (ns0 == "xlink") {
						ns0 = "http://www.w3.org/1999/xlink";
					} else if (ns0 == "xhtml") {
						ns0 = "http://www.w3.org/1999/xhtml";
					}
					if (r.setAttributeNS) r.setAttributeNS(ns0, ns[1], curAttr);
					else r.setAttribute(i, curAttr);
				}
			}
		}
		if (c) {
			for (var i = 0, l = c.length; i < l; i++) {
				r.appendChild(c[i]);
			}
		}
		if (p) {
			for (var i in p) {
				if (!p.hasOwnProperty(i)) continue;
				r[i] = p[i];
			}
		}
		return r;
	};
	
	this.emptyNode = function(n) {
		if (!n) return $;
		while (n.childNodes[0]) {
			n.removeChild(n.childNodes[0]);
		}
		return $;
	};
	
	this.isAncestor = function(p, c) {
		var pp = c.parentNode;
		while (pp && pp != p) {
			pp = pp.parentNode;
		}
		if (pp == p) return true;
		return false;
	};
	
	this.isDecendent = function(c, p) {
		var cl = p.children;
		for (var i = 0, l = cl.length; i < l; i++) {
			var cli = cl[i];
			if (cli == c) return true;
			if (this.isDecendent(c, cli)) return true;
		}
		return false;
	};
	
	this.isArray = function(obj) {
		return (Object.prototype.toString.call(obj) === "[object Array]") || (obj && obj.push && obj.splice && obj.length !== undefined);
	}

	this.extend = function() {
		var target = arguments[0] || {},
			i = 1,
			length = arguments.length,
			deep = false,
			options;
		if (typeof target === "boolean") {
			deep = target;
			target = arguments[1] || {};
			i = 2;
		}
		if (typeof target !== "object" && typeof target !== "function") target = {};

		for (; i < length; i++)
			if ((options = arguments[i]) != null) {
				if (this.isArray(options)) {
					if (!this.isArray(target)) target = [];
					for (var j = 0, l = options.length; j < l; j++) {
						var src = target[j], copy = options[j];
						if (target === copy) continue;
						if (deep && copy && typeof copy === "object" && !copy.nodeType)
							target[j] = this.extend(
								deep, 
								src || {},
								copy
							);
						else if (copy !== undefined) target[j] = copy;
					}
				} else
					for (var name in options) {
						if (!options.hasOwnProperty(name)) continue;
						var src = target[name], copy = options[name];
						if (target === copy) continue;
						if (deep && copy && typeof copy === "object" && !copy.nodeType)
							target[name] = this.extend(
								deep, 
								src || {},
								copy
							);
						else if (copy !== undefined) target[name] = copy;
					}
			}
		return target;
	};
	
	this.parseXML = function(s, d) {
		parser = new DOMParser();
		var x = parser.parseFromString(s, "text/xml");
		x = d.importNode(x.documentElement, true);
		this.addScriptFromXml(x);
		return x;
	};

	this.globalEval = function(s) {
		if (global.execScript) global.execScript(s);
		else global.eval ? global.eval.call(global, s) : eval.call(global, s);
		return $;
	};

	this.addScriptFromXml = function(t) {
		for (var i = 0; i < t.childNodes.length; i++) {
			if (t.childNodes[i].nodeType != 1) {
				continue;
			}
			if (t.childNodes[i].nodeName.toLowerCase() == "script") {
				var an = t.childNodes[i].getAttributeNode("src");
				if (an && an.specified) {
					var s = document.createElement("script");
					s.type = "text/javascript";
					s.src = t.childNodes[i].getAttribute("src");
					document.getElementsByTagName("head")[0].appendChild(s);
				} else this.globalEval(t.childNodes[i].textContent);
			} else {
				this.addScriptFromXml(t.childNodes[i]);
			}
		}
		return $;
	};

	var scriptRegex = /<script\s+type="text\/javascript"[\s\S.]*?>([\s\S.]+?)<\/script>/gim;
	this.extractScriptFromHtml = function(s) {
		var m,
			r = [];
		while (m = scriptRegex.exec(s)) {
			r.push(m[1]);
		}
		return r.join(";");
	};

	var DelayPrototype = function() {
		/* States:
		 * *    0: Waiting
		 * *    1: Resolved
		 * *    2: Error
		 * */
		this._state = 0;
		this._result = undefined;
		this._reason = "Unknown";
		this.on = function(type, cb, pass) {
			switch(type.toLowerCase()) {
				case "success":
					this._scb.push([cb, pass]);
				if (this._state == 1) cb.call(global, this._result, pass);
				break;
				case "error":
					this._ecb.push([cb, pass]);
				if (this._state == 2) cb.call(global, this._reason, pass);
				break;
				case "progress":
					this._pcb.push([cb, pass]);
				break;
				case "finish":
					this._fcb.push([cb, pass]);
				break;
			}
			return this;
		};
		this.notOn = function(type, cb) {
			var m = null;
			switch(type.toLowerCase()) {
				case "success":
					m = this._scb;
				break;
				case "error":
					m = this._ecb;
				break;
				case "progress":
					m = this._pcb;
				break;
				case "finish":
					m = this._fcb;
				break;
			}
			if (m) {
				for (var i = 0, l = m.length; i < l; i++) {
					if (m[i][0] == cb) {
						m.splice(i, 1);
						break;
					}
				}
			}
			return this;
		};
		this.cancel = function() {
			if (typeof this._ccb === "function") this._ccb();
			this.error("Canceled");
			return this;
		};
		this.resolve = function(value) {
			this._result = value;
			this._state = 1;
			var s = this._scb;
			for (var i = 0, l = s.length; i < l; i++) {
				var si = s[i];
				si[0].call(global, value, si[1], this.data);
			}
			return this.finish();
		};
		this.finish = function() {
			var s = this._fcb;
			for (var i = 0, l = s.length; i < l; i++) {
				var si = s[i];
				si[0].call(global, this, si[1], this.data);
			}
			return this;
		};
		this.error = function(reason) {
			this._result = undefined;
			this._state = 2;
			this._reason = reason;
			var s = this._ecb;
			for (var i = 0, l = s.length; i < l; i++) {
				var si = s[i];
				si[0].call(global, reason, si[1], this.data);
			}
			return this.finish();
		};
		this.progress = function(data) {
			this._result = undefined;
			this._state = 0;
			var s = this._pcb;
			for (var i = 0, l = s.length; i < l; i++) {
				var si = s[i];
				si[0].call(global, data, si[1], this.data);
			}
			return this;
		};
		this.get = function() {
			if (this._state == 1) {
				return this._result;
			} else {
				if (this._state == 2) throw "In Error State";
				else throw "Not Resolved";
			}
		};
		this.isResolved = function() {
			if (this._state == 1) return true;
			return false;
		};
		this.setData = function(key, value) {
			this.data[key] = value;
			return this;
		};
		this.getData = function(key) {
			return this.data[key];
		};
	};

	this.Delay = function(ccb) {
		this._scb = [];
		this._ecb = [];
		this._pcb = [];
		this._fcb = [];
		this._ccb = ccb;
		this.data = {};
	};

	this.Delay.prototype = new DelayPrototype();
	
	this.EventTarget = function() {
		var t = this;
		var te = t.__GregEvents__ = {};

		t.on = function(type, callback, pass) {
			var tte = te;
			if (!(type in tte)) tte[type] = [];
			var tet = tte[type];
			var i = tet.length;
			while (i--) {
				if (callback == tet[i].callback) return this;
			}
			tet.push({callback: callback, pass: pass});
			return this;
		};
		t.notOn = function(type, callback) {
			var tte = te;
			if (!(type in tte)) return this;
			var tet = tte[type];
			var i = tet.length;
			while (i--) {
				if (callback == tet[i].callback) {
					tet.splice(i, 1);
					if (tet.length == 0) delete tte[type];
					return this;
				}
			}
			return this;
		};
		t.fire = function(event) {
			if (typeof event !== "object") return this;
			var tte = te;
			var type = event.type;
			if (!type || !(type in tte)) return this;
			var tet = tte[type];
			for (var i = 0, l = tet.length; i < l; i++) {
				var teti = tet[i];
				teti.callback.call(t, event, teti.pass);
			}
			return this;
		};
	}
	
	this.queryStringify = function(data) {
		var s = [];
		var add = function(k, v){
			s.push([encodeURIComponent(k), '=', encodeURIComponent(v)].join(""));
		};
		if (this.isArray(data)) {
			for (var key in data) {
				if (!data.hasOwnProperty(key)) continue;
				add(data[key].name, data[key].value);
			}
		} else {
			for (var j in data) {
				if (!data.hasOwnProperty(j)) continue;
				var dj = data[j];
				if (this.isArray(dj)) {
					for (var i = 0, l = dj.length; i < l; i++) {
						add(j, dj[i]);
					}
				} else add(j, typeof dj === "function" ? dj() : dj);
			}
		}
		return s.join("&").replace(/%20/g, "+");
	};
	
	this.parseQueryString = function(data) {
		var queryString = {};
		var vars = q.split(/&/);
		for (var i = 0, l = vars.length; i < l; i++) {
			var pair = vars[i].split("=");
			var name = decodeURIComponent(pair[0]);
			var value = decodeURIComponent(pair[1]);
			if (typeof(queryString[name]) === "undefined") {
				queryString[name] = value;
			} else if (typeof(queryString[name]) === "string") {
				var arr = [queryString[name], value];
				queryString[name] = arr;
			} else {
				queryString[name].push(value);
			}
		} 
		return queryString;
	};
	
	this.formData = function(form) {
		var r = {};
		var add = function(n, v) {
			if (n in r) {
				if (r.hasOwnProperty(n)) {
					if (this.isArray(r[n])) {
						r[n].push(v);
					} else r[n] = [r[n], v];
				}
			} else r[n] = v;
		}
		for (var i in {"input":1,"select":1,"textarea":1}) {
			var items = $.$$(i, form);
			for (var j = 0, l = items.length; j < l; j++) {
				var t = items[j];
				if (t.name && t.name != "" && !t.disabled) {
					switch (i) {
						case "input":
							if (t.type == "radio" || t.type == "checkbox") {
								if (t.checked !== undefined && t.checked) add(t.name, t.value);
							} else if (t.value != undefined && t.value != null) {
								add(t.name, t.value);
							}
							break;
						case "select":
							if (t.selectedIndex != -1) {
								add(t.name, t.value);
							}
							break;
						case "textarea":
							if (t.value != undefined && t.value != null) {
								add(t.name, t.value);
							}
							break;
					}
				}
			}
		}
		return r;
	};
	
	var isHTTPSuccess = function(xhr) {
		try {
			return !xhr.status && location.protocol == "file:" ||
				(xhr.status >= 200 && xhr.status < 300) || xhr.status == 304;
		} catch(e){}
		return false;
	};
	
	var responseToData = function(xhr, ct) {
		if (typeof ct !== "string") {
			try {
				ct = xhr.getResponseHeader("content-type");
			} catch (e){};
		}
		var d = null;
		if (ct.match(/html/)) {
			var nd = document.createElement("div");
			var text = xhr.responseText.trim();
			nd.innerHTML = text;
			if (nd.childNodes.length > 1) {
				d = nd;
			} else if (nd.childNodes.length == 1) {
				d = nd.childNodes[0];
			}
			$.addScriptFromXml(d);
		} else if (ct.match(/json/)) {
			d = JSON.parse(xhr.responseText);
		} else if (ct.match(/xml/)) {
			d = xhr.responseXML.documentElement;
			$.addScriptFromXml(d);
		} else {
			d = xhr.responseText;
		}
		return d;
	};
	
	this.send = function(oo) {
		var t = this;
		var o = t.extend({}, {
			method: "GET",
			url: "",
			async: true,
			user: "",
			password: "",
			timeout: 0,
			cache: true,
			contentType: "",
			responseContentType: "html",
			headers: {},
			data: null,
			processData: true,
			queryData: {},
			withCredentials: true,
			overrideMimeType: null
		}, oo);
		
		var r = null;
		if (o.async) r = new t.Delay();
		if (o.url === "") {
			if (o.async) r.error("No URL specified");
			return r;
		}
		o.method = o.method.toUpperCase();
		var headers = o.headers;
		
		if (!headers["Content-Type"]) {
			switch (o.contentType) {
				case "text":
					headers["Content-Type"] = "text/plain;charset=UTF-8";
					break;
				case "xml":
					headers["Content-Type"] = "text/xml;charset=UTF-8";
					break;
				case "json":
					headers["Content-Type"] = "application/json;charset=UTF-8";
					break;
				default:
					if (o.contentType == "") {
						if (o.method == "POST") {
							headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
						}
					} else {
						headers["Content-Type"] = o.contentType;
					}
					break;
			}
		}
		
		if (!headers["Accept"]) {
			headers["Accept"] = "text/html,application/xhtml+xml,application/xml,application/json,*/*";
		}
		
		var queryData = o.queryData,
			url = o.url;
		if (typeof queryData !== "string") queryData = t.queryStringify(queryData);
		if (queryData != "") url = [url, (url.match(/\?/) ? "&" : "?"), queryData].join("");
		if (!o.cache) url = [url, (url.match(/\?/) === null ? "?" : "&"), (new Date()).getTime()].join("");
		var data = o.data;
		if (headers["Content-Type"] && data && o.processData && typeof data !== "string") {
			if (typeof data === "object" && headers["Content-Type"].match(/^application\/json/)) {
				data = JSON.stringify(data);
			} else if (typeof data === "object" && headers["Content-Type"].match(/^application\/x-www-form-urlencoded/)) {
				data = t.queryStringify(data);
			}
		}
		o.queryData = queryData;
		o.url = url;
		o.data = data;
		
		var xhr = new XMLHttpRequest();
		
		if (!xhr.abort) {
			xhr.abort = function() {
				xhr.onreadystatechange = null;
				if (r) r.error({xhr: xhr, options: o, status: 0, statusText: "Aborted"});
			};
		}
		
		function oldAndSyncHandler(o) {
			if (this.readyState == 4) {
				if (isHTTPSuccess(this)) {
					var d = responseToData(this, o.responseContentType);
					if (r) r.resolve({data: d, xhr: this, options: o});
					else return d;
				} else {
					if (r) r.error({xhr: this, options: o, status: this.status, statusText: this.statusText});
					else return null;
				}
			} else {
				if (r) r.progress({data: "progress", options: o, xhr: this});
			}
		}
		
		if (r) {
			r.setData("xhr", xhr);
			
			try {
				xhr.addEventListener("progress", function(e) {
					if (e.lengthComputable) r.progress({data: e.loaded / e.total, options: o, xhr: this});
					else r.progress({data: "progress", options: o, xhr: this});
				}, false);
			} catch(e) {};
			try {
				xhr.addEventListener("abort", function(e) {
					r.error({xhr: this, options: o, status: 0, statusText: "Aborted"});
				}, false);
			} catch(e) {};
			try {
				xhr.addEventListener("error", function(e) {
					r.error({xhr: this, options: o, status: this.status, statusText: this.statusText});
				}, false);
			} catch(e) {};
			try {
				xhr.addEventListener("stalled", function(e) {
					r.progress({data: "stalled", options: o, xhr: this});
				}, false);
			} catch(e) {};
			try {
				xhr.addEventListener("suspend", function(e) {
					r.progress({data: "suspend", options: o, xhr: this});
				}, false);
			} catch(e) {};
			try {
				xhr.addEventListener("load", function(e) {
					if (isHTTPSuccess(this)) {
						d = responseToData(this, o.responseContentType);
						r.resolve({data: d, xhr: this, options: o});
					} else {
						r.error({xhr: this, options: o, status: this.status, statusText: this.statusText});
					}
				}, false);
			} catch(e) {};
		} else {
			xhr.onreadystatechange = function() {
				oldAndSyncHandler.call(xhr, o);
			};
		}
		
		xhr.open(o.method, url, o.async, o.user, o.password);
		if (typeof xhr.withCredentials !== "undefined") xhr.withCredentials = o.withCredentials;
		xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
		for (var h in headers) {
			if (!headers.hasOwnProperty(h)) continue;
			xhr.setRequestHeader(h, headers[h]);
		}
		
		if (o.overrideMimeType) xhr.overrideMimeType(o.overrideMimeType);
		xhr.timeout = o.timeout;
		xhr.send(data);
		if (!o.async) return oldAndSyncHandler.call(xhr, o);
		else return r;
	}
	
	this.get = function(url, data, responseContentType, options) {
		var t = this;
		return t.send(t.extend({
			url: url,
			method: "GET",
			queryData: data,
			responseContentType: responseContentType
		}, options));
	};
	
	this.post = function(url, data, contentType, responseContentType, options) {
		var t = this;
		return t.send(t.extend({
			url: url,
			method: "POST",
			data: data,
			contentType: contentType,
			responseContentType: responseContentType
		}, options));
	};
	
	this.json = function(url, data, options) {
		var t = this;
		return t.send(t.extend({
			url: url,
			method: "POST",
			contentType: "json",
			data: data,
			responseContentType: "json"
		}, options));
	};
	
	this.jsonrpc = function(url, method, params, options) {
		var t = this;
		return t.send(t.extend({
			url: url,
			method: "POST",
			contentType: "json",
			data: {
				id: "_" + (new Date()).getTime(),
				method: method,
				params: params
			},
			responseContentType: "json"
		}, options));
	};
	
	this.CacheManager = function(type, version) {
		if (typeof version === "undefined") throw "Invalid Version";
		this.backend = global[[type, "Storage"].join("")] ?
			global[[type, "Storage"].join("")] : 
			new (function() {
				var storage = {};
				var storageLength = 0;
				Object.defineProperty(this, "length", {
					get: function() {
						return storageLength;
					}
				});
				this.key = function(index) {
					var c = 0;
					for (var i in storage) {
						if (!storage.hasOwnProperty(i)) continue;
						if (c++ == index) return i;
					}
					return null;
				};
				this.setItem = function(key, value) {
					if (!(key in storage)) storageLength++;
					storage[key] = value;
				};
				this.getItem = function(key) {
					if (!(key in storage)) return null;
					return storage[key];
				};
				this.removeItem = function(key) {
					delete storage[key];
					storageLength--;
				};
				this.clear = function() {
					storage = {};
					storageLength = 0;
				};
			})();
		
		this.get = function(key) {
			var data = this.backend.getItem(key);
			if (data && (data = JSON.parse(data)) && data.c !== version) {
				this.remove(key);
				return undefined;
			}
			return data ? data.v : undefined;
		};
		
		this.set = function(key, value, priority) {
			if (typeof priority === "undefined") priority = 1;
			try {
				this.backend.setItem(key, JSON.stringify({c: version, v: value, p: priority}));
			} catch (e) {
				var p = 1;
				while (true) {
					for (var i = this.backend.length - 1; i >= 0; i--) {
						var item = null;
						var k = this.backend.key(i);
						if (item = this.backend.getItem(k)) {
							try {
								item = JSON.parse(item);
							} catch (ee) {
								item = null;
							}
							if (item && item.p && item.p == p) {
								this.backend.removeItem(k);
							}
						}
					}
					try {
						this.backend.setItem(key, JSON.stringify({c: version, v: value, p: priority}));
						return true;
					} catch (ee) {
						if (p++ >= priority) {
							return null;
						}
					}
				}
			}
			return true;
		};
		
		this.remove = function(key) {
			this.backend.removeItem(key);
		};
		
		this.clear = function() {
			this.backend.clear();
		}
	}
	
	var hashListeners = {};
	var hashListenersCount = 0;
	var currentHash = "";
	var currentHashPaths = [];
	
	function onHashChange() {
		if (global.location.hash != currentHash) {
			currentHash = global.location.hash;
			var paths = currentHash.replace(/^#/, "").split(/\//);
			var checkedPaths = [];
			for (var i = 0, l = paths.length; i < l; i++) {
				var path = paths[i];
				if (currentHashPaths.indexOf(path) === -1) {
					for (reg in hashListeners) {
						if (!hashListeners.hasOwnProperty(reg)) continue;
						var r = new RegExp(reg),
							m = null;
						if ((m = r.exec(path))) {
							currentHashPaths.push(path);
							hashListeners[reg].call(global, m);
						}
					}
				}
			}
			for (var i = currentHashPaths.length - 1; i >= 0; i--) {
				if (paths.indexOf(currentHashPaths[i]) === -1) {
					currentHashPaths.splice(i, 1);
				}
			}
		}
	}
	
	this.onHash = function(path, func) {
		if (!hashListeners[path]) hashListenersCount++;
		hashListeners[path] = func;
		if (hashListenersCount == 1) {
			global.addEventListener("hashchange", onHashChange, false);
		}
		onHashChange();
		return $;
	}
	
	this.notOnHash = function(path) {
		if (hashListeners[path]) hashListenersCount--;
		delete hashListeners[path];
		if (hashListenersCount == 0) global.removeEventListener("hashchange", onHashChange, false);
		return $;
	}
	
	var cacheManager = null;
	this.cacheVersion = 1;

	function checkCache() {
		if (cacheManager === null) cacheManager = new $.CacheManager("local", $.cacheVersion);
	}
	
	this.ui = new (function($) {
		function imageFromSize(size) {
			var i = new Image();
			i.width = size;
			i.height = size;
			return i;
		}
		
		var t = this;
		t.loaderImageSmall = imageFromSize(16);
		t.loaderImageMedium = imageFromSize(32);
		t.loaderImageLarge = imageFromSize(64);
		
		t.replaceWithURL = function(container, url, cache, cachePriority, interrupt) {
			return t.actWithURL("replace", container, url, cache, cachePriority, interrupt);
		};

		t.appendURL = function(container, url, cache, cachePriority, interrupt) {
			return t.actWithURL("append", container, url, cache, cachePriority, interrupt);
		};
		
		t.prependURL = function(container, url, cache, cachePriority, interrupt) {
			return t.actWithURL("prepend", container, url, cache, cachePriority, interrupt);
		};

		t.actWithURL = function(action, container, url, cache, cachePriority, interrupt) {
			if (typeof cache === "undefined") cache = true;
			if (typeof cachePriority === "undefined") cachePriority = 1;
			if (typeof interrupt === "undefined") interrupt = false;

			var delay = new $.Delay();
			taskManager.add({type:"url", value: url}, interrupt, cache)
			.on("success", function(d) {
				switch (action) {
					case "replace":
						container.innerHTML = d;
						break;
					case "append":
						var div = document.createElement("div");
						div.innerHTML = d;
						while (div.children.length > 0) {
							container.appendChild(div.children[0]);
						}
						break;
					case "prepend":
						var div = document.createElement("div");
						div.innerHTML = d;
						for (var i = div.children.length - 1; i >= 0; i--) {
							container.insertBefore(div.children[i], container.firstChild);
						}
						break;
				}
				delay.resolve(d);
			})
			.on("error", function(d) {
				delay.error(d);
			});
			return delay;
		};
	})(this);
	
})();

Greg = $;

})();

(function($){

	function Plan(pData) {
		this.id = pData.id;
		this.name = pData.name;
		this.description = pData.description;
		//this.db = new (cradle.Connection)(pData.db.url, pData.db.port).database(this.id);
		this.locales = pData.locales ? pData.locales.slice(0) : ['en_CA'];
		this.locale = this.locales[0];
	}
	
	Plan.get = function(pUrl) {
		var delay = new $.Delay();
		
		var req = $.json('/plans/' + pUrl + '/api', {
			o: 'p', //plan
			m: 'get'
		}).on('success', function(d) {
			d = d.data;
			var plan = new Plan({
				id: d.id,
				name: d.name,
				description: d.description,
				locales: d.locales
			});
			delay.resolve(plan);
		}).on('error', function(d) {
			delay.error(d);
		});
		
		return delay;
	}
	
	Plan.prototype.getNode = function(pId) {
		return $.json('/plans/' + this.id + '/api', {
			o: 'p', //plan
			m: 'getNode',
			id: pId
		});
	}
	
	Plan.prototype.searchByType = function(pType) {
		return $.json('/plans/' + this.id + '/api', {
			o: 'p', //plan
			m: 'searchByType',
			type: pType
		});
	}
	
	Plan.prototype.searchByTitle = function(pTitle) {
		return $.json('/plans/' + this.id + '/api', {
			o: 'p', //plan
			m: 'searchByTitle',
			title: pTitle
		});
	}
	
	Plan.prototype.searchByTitleInType = function(pType, pTitle) {
		return $.json('/plans/' + this.id + '/api', {
			o: 'p', //plan
			m: 'searchByTitleInType',
			type: pType,
			title: pTitle
		});
	}

	function PlanNode(pPlan, pType, pTitle) {
		this.plan = pPlan;
		this.type = pType;
		this.titles = {};
		this.titles[pPlan.locale] = pTitle;
		this.children = [];
		this.data = null;
	}
	
	PlanNode.prototype.__defineGetter__('title', function() {
		return this.titles[this.plan.locale];
	});
	
	PlanNode.prototype.__defineSetter__('title', function(pVal) {
		return this.titles[this.plan.locale] = pVal;
	});
	
	PlanNode.prototype.save = function() {
	
	}

	PlanNode.prototype.remove = function() {
	
	}

	NoPlan = function(pPlanUrl, pContainer) {
		var self = this;
		this.plan = null;
		this.container = pContainer;
		
		this.nodes = {};
		this.currentNode = null;
		
		Plan.get(pPlanUrl)
		.on('success', function(d) {
			self.plan = d;
		})
		.on('error', function(d) {
			console.error(d);
		});
	};

})(Greg);