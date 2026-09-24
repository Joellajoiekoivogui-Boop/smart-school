/*
 * Compléments pour les anciens navigateurs (iOS 12.0–12.1, Android Chrome < 71).
 * Chargé avant l'application ; ne fait rien sur les navigateurs récents.
 */
(function () {
  var g = typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this;
  if (typeof g.globalThis === 'undefined') {
    try { Object.defineProperty(g, 'globalThis', { value: g, writable: true, configurable: true }); } catch (e) { g.globalThis = g; }
  }
  if (typeof g.queueMicrotask !== 'function') {
    g.queueMicrotask = function (cb) { Promise.resolve().then(cb).catch(function (e) { setTimeout(function () { throw e; }); }); };
  }
  if (typeof g.AbortController === 'undefined') {
    var AbortSignal = function () { this.aborted = false; this.reason = undefined; this.onabort = null; this._l = []; };
    AbortSignal.prototype.addEventListener = function (t, fn) { if (t === 'abort') this._l.push(fn); };
    AbortSignal.prototype.removeEventListener = function (t, fn) { this._l = this._l.filter(function (x) { return x !== fn; }); };
    AbortSignal.prototype.throwIfAborted = function () { if (this.aborted) throw this.reason; };
    AbortSignal.prototype.dispatchEvent = function (ev) {
      if (typeof this.onabort === 'function') this.onabort(ev);
      this._l.slice().forEach(function (fn) { fn(ev); });
      return true;
    };
    var AbortController = function () { this.signal = new AbortSignal(); };
    AbortController.prototype.abort = function (reason) {
      if (this.signal.aborted) return;
      this.signal.aborted = true;
      this.signal.reason = reason !== undefined ? reason : new Error('AbortError');
      this.signal.dispatchEvent({ type: 'abort', target: this.signal });
    };
    g.AbortController = AbortController;
    g.AbortSignal = AbortSignal;
  }
  // IntersectionObserver (iOS < 12.2) : considère tout élément observé comme
  // visible, ce qui déclenche simplement les animations d'apparition.
  if (typeof g.IntersectionObserver === 'undefined') {
    var IO = function (cb) { this._cb = cb; this._t = []; };
    IO.prototype.observe = function (el) {
      var obs = this;
      obs._t.push(el);
      setTimeout(function () {
        if (obs._t.indexOf(el) === -1) return;
        var r = el.getBoundingClientRect();
        obs._cb([{ target: el, isIntersecting: true, intersectionRatio: 1, boundingClientRect: r, intersectionRect: r, rootBounds: null, time: Date.now() }], obs);
      }, 30);
    };
    IO.prototype.unobserve = function (el) { this._t = this._t.filter(function (x) { return x !== el; }); };
    IO.prototype.disconnect = function () { this._t = []; };
    IO.prototype.takeRecords = function () { return []; };
    g.IntersectionObserver = IO;
  }
  // ResizeObserver (iOS < 13.1) : version inerte, suffisante pour l'interface.
  if (typeof g.ResizeObserver === 'undefined') {
    var RO = function () {};
    RO.prototype.observe = function () {};
    RO.prototype.unobserve = function () {};
    RO.prototype.disconnect = function () {};
    g.ResizeObserver = RO;
  }
})();
