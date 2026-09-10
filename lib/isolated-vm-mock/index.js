'use strict';

class Reference {
  constructor(val) {
    this._val = val;
  }
  getSync(key) {
    if (this._val == null) return undefined;
    const v = this._val[key];
    if (typeof v === 'function') {
      return v.bind(this._val);
    }
    if (typeof v === 'object' && v !== null) {
      return new Reference(v);
    }
    return v;
  }
  setSync(key, val) {
    if (this._val != null) {
      this._val[key] = val instanceof Reference ? val._val : val;
    }
  }
  deleteSync(key) {
    if (this._val != null) {
      delete this._val[key];
    }
  }
  copySync() {
    return this._val;
  }
  derefInto() {
    return this._val;
  }
}

class Context {
  constructor() {
    const globalObj = {};
    this.global = new Reference(globalObj);
    this.global.setSync('global', globalObj);
  }
  evalClosureSync(code, args = []) {
    try {
      const argNames = args.map((_, i) => '$' + i);
      const fn = new Function(...argNames, code);
      return fn(...args);
    } catch (err) {
      return JSON.stringify(null);
    }
  }
  evalSync(code) {
    try {
      return eval(code);
    } catch (err) {
      return null;
    }
  }
}

class Isolate {
  constructor(options = {}) {
    this.options = options;
  }
  createContextSync() {
    return new Context();
  }
  dispose() {}
}

const ivm = {
  Isolate,
  Reference,
  Context,
};

module.exports = Object.assign(ivm, { ivm });
