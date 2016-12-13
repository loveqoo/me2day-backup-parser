'use strict';

class Parameter {
    constructor(o = {}) {
        this.o = o;
        this.initCalled = false;
    }

    set(key, value) {
        this.o[key] = value;
    }

    init(f) {
        if (this.initCalled) {
            return;
        }
        (typeof f === 'function') && f.call(null, this.o);
    }

    assign(obj) {
        for (let key of Object.keys(this.o)) {
            obj[key] = this.o[key];
        }
    }
}

module.exports = Parameter;