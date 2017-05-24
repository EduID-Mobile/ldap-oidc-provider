"use strict";

/**
 * creates a new RSA JWK.
 *
 * Full private key information will get transformed.
 *
 * SYNOPSIS
 *
 * node mkjwk keysize
 *
 * NOTE larget key sizes need longer to run.
 */

const jose = require("node-jose");
const size = process.argv[2];

const keystore = jose.JWK.createKeyStore();

keystore
    .generate("RSA", size)
    .then((result) => {
        // open write stream:
        process.stdout.write(JSON.stringify(result.toJSON(true)));
        process.exit(0);
    });
