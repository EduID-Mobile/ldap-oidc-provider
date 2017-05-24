"use strict";

/**
 * converts a pem to a JWK.
 *
 * Full private key information will get transformed.
 *
 * SYNOPSIS
 *
 * node pem2jwk keyname
 */

const jose = require("node-jose");
const fs = require("fs");

const key = process.argv[2];
const keystore = jose.JWK.createKeyStore();

fs.readFile(key, function (err, data ) {
    if (!err) {
        keystore
            .add(data, "pem")
            .then((result) => {
                // open write stream:
                process.stdout.write(JSON.stringify(result.toJSON(true)));
                process.exit(0);
            });
    }
    else {
        process.exit(1);
    }
});
