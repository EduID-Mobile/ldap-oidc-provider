"use strict";

const jose = require("node-jose");
const rsa = require("node-jose/lib/algorithms/rsa-util");
const fs = require("fs");
const Debug = require("debug");
const debug = Debug("key2pem");

// Debug.enable("key2pem");

/**
 * converts a key from a keystore into a PEM
 *
 * parameter 1 expects a filename that contains a JWKS
 * optional parameter 2 expects the kid of the key to extract
 *
 * Note: only RSA are extracted, regardless of the kid
 * Note 2: Only the public key part is extracted
 *
 * SYNOPSIS: node jwk2pem.js keystore.jwk [myKId]
 */

const keyFile =  process.argv[2];
const keyId = process.argv[3];

async function handleData(data) {
    const keystore = await jose.JWK.asKeyStore(data);
    let key2;

    debug(keyId);

    if (keyId) {
        debug("with key id " + keyId);
        key2  = keystore.get(keyId, {kty: "RSA"});
    }
    else {
        debug("no key id");
        key2  = keystore.get({kty: "RSA"});
    }
    const pem = rsa.convertToPem(key2.toJSON(), true);

    process.stdout.write(pem);
}

fs.readFile(keyFile, function (err, data ) {
    // debug("hello %o", data.toString());
    if (!err) {
        handleData(data.toString()).then(() => process.exit(0));
    }
    else {
        process.exit(1);
    }
});
