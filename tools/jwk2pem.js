"use strict";

const jose = require("node-jose");
const fs   = require("fs");

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
const keyId   = process.argv[3];

async function handleData(data) {
    const keystore = await jose.JWK.asKeyStore(data);

    if (keyId) {
        return keystore.get(keyId, {kty: "RSA"});
    }

    return keystore.get({kty: "RSA"});
}

fs.readFile(keyFile, function (err, data ) {
    // debug("hello %o", data.toString());
    if (err) {
        process.exit(1);
    }

    handleData(data.toString())
        .then((key) => key.toPEM())
        .then((pem) => process.stdout.write(pem))
        .then(()    => process.exit(0))
        .catch(()   => process.exit(1));
});
