'use strict';

module.exports = () => {
    let o = {},
        get = (key, defaultValue) => {
            let v = o[key];
            if (typeof v !== 'undefined') {
                return v;
            }
            if (defaultValue) {
                return defaultValue;
            }
            return v;
        },
        set = (key, value) => {
            o[key] = value;
            return value;
        };
    return {get: get, set: set};
};
