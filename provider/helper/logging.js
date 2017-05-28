"use strict";

module.exports = function LoggingFactory(cfg) {
    return function log(message) {
        if (cfg.logging) {
            console.log(message); // eslint-disable-line
        }
    };
};
