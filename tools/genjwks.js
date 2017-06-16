"use strict";

/**
 * creates a new key store with keys of the provided type
 *
 * Full private key information will get transformed.
 *
 * SYNOPSIS
 *
 * node genjwks -s keysize -t rsa -c 2
 *
 * NOTE larget key sizes need longer to run.
 */

const jose = require("node-jose");
const param = require("../provider/helper/optionparser.js");

param.options({
    "size:": ["-s", "--size"],
    "type:": ["-t", "--type"],
    "count:": ["-n", "-c", "--count"]
});

param.parse(process.argv);

const keystore = jose.JWK.createKeyStore();

let type = "rsa";
let size = 2048;
let count = 1;

if (param.opts.type) {
    type = param.opts.type;
}
if (type === "oct") {
    size = 256;
}
if (param.opts.size) {
    size = param.opts.size;
}

if (param.opts.count) {
    count = param.opts.count;
}

// NOTE: this cannot be done with Promise.all(), as one would expect
(async function gen(cnt) {
    if (cnt) {
        await keystore.generate(type, size);

        // await keystore.add(key);
        await gen(cnt - 1);
    }
})(count)
    .then(() => process.stdout.write(JSON.stringify(keystore.toJSON(true))));
