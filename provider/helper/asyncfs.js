"use strict";

// this little function Pomisifies the standard File System API.
// It transposes only those functions that have a Sync counterpart.

const fs = require("fs");

module.exports = {};

const sync = [];

Object.keys(fs).map((k) => {
    if (k.indexOf("Sync") > 0) {
        sync.push(k.replace("Sync", ""));
    }
});

Object.keys(fs).map((k) => {
    if (sync.indexOf(k) >= 0) {
        module.exports[k] = async function (...args) {
            return new Promise((resolve, reject) => {
                fs[k](...args, function (err, data) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            })
        };
    }
    else {
        module.exports[k] = fs[k];
    }
});
