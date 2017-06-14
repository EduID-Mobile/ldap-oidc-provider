"use strict";

/**
 * The promisify function transposes all methods of the passed object.
 *
 * This module uses ES6 Proxy Objects to transpose only the functions that are
 * actually used.
 *
 * This module handles only get traps and leaves everything else with the
 * original object.
 */
module.exports = function Promisify(object) {
    const proxyMethods = {};
    const proxyTraps = {
        get: function (target, property) {
            if (property in object &&
                typeof object[property] === "function") {

                // Create promisified function once
                if (!(property in proxyMethods)) {
                    // check for a callback parameter in the function's signature
                    const regex = /function [^\(]*\(([^\)]*callback[^\)]*)\)/;
                    const result = object[property].toString().match(regex);

                    if (result) {
                        // Don't assume that callbacks are always the last parameter.
                        // Extract the position of the callback parameter in the function's signature.
                        // This happens outside, so it is run only once.
                        const cID = result[1].split(",").map((p) => p.trim()).indexOf("callback");

                        // Create a proxy method
                        return proxyMethods[property] = function (...fargs) {
                            return new Promise((resolve, reject) => {
                                // Insert the callback function at the expected position.
                                // This needs to run for every call.
                                fargs.splice(cID, 0, function (err, data) {
                                    if (err) {
                                        reject(err);
                                    }
                                    else {
                                        resolve(data);
                                    }
                                });

                                // Call the original function
                                object[property](...fargs);
                            });
                        };
                    }
                    else {
                        // other API functions are just forwarded
                        return proxyMethods[property] = object[property];
                    }
                }

                // return the cached promisified function
                return proxyMethods[property];
            }

            // all other properties are direcly forwarded
            return object[property];
        }
    };

    return new Proxy(object, proxyTraps);
};
