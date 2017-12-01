"use strict";

// NOTE USE addkey.js!

/**
 * converts a list of pem keys to a JWKS.
 *
 * Full private key information will get transformed.
 *
 * SYNOPSIS
 *
 * node pem2jwks keyname [keyname...]
 */

const jose = require("node-jose");
const fs = require("fs");

const keyFiles = process.argv.splice(2);
const keystore = jose.JWK.createKeyStore();

function readKey(k) {
    return new Promise((success, fail) => {
        fs.readFile(k, (err, data) => {
            if (err) {
                fail(err);
            }
            else {
                success(data);
            }
        });
    });
}

function addKey(k) {
    return keystore.add(k, "pem");
}

// wait until all keys are read and have been added to the keystore, then
// print the entire keystore.
//
// If one fails, then the entire process is canceled and an error message
// is printed.
Promise
    .all(keyFiles.map(kf => readKey(kf).then(addKey)))
    .then(() => process.stdout.write(JSON.stringify(keystore.toJSON(true))))
    .catch((err) => {
        console.log(err.message);
        process.exit(1);
    });
