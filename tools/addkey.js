/**
 * Reads a JWK and adds it to a JWKS and prints the JWKS.
 *
 * SYNOPSIS: node addkey.js [keyfile [jwksfile]]
 *
 * If both parameters are omitted the script prints an empty JWKS.
 *
 * If a keyfile is given without a JWKS, the script loads the key and adds
 * it to a new JWKS and prints it.
 *
 * If a jwksfile is given, the key in keyfile is added to the provided JWKS and
 * prints the extended JWKS.
 *
 * The script will not overwrite any existing files.
 *
 * The script tries to load JWK, PEM, X509, PKIX, SPKI, and PKCS8 key files.
 *
 * On errors, the script silently quits without output.
 *
 * For pretty printing the output can be piped to json_pp or similar tools.
 */

const fs = require("fs");
const { JWK } = require("node-jose");

const keyFile   = process.argv[2];
const jwksfile  = process.argv[3];

var keystore;

if (!keyFile) {
    keystore = JWK.createKeyStore();

    process.stdout.write(JSON.stringify(keystore.toJSON()));
    process.exit(0);
}

async function readKeystore(ks) {
    keystore = await JWK.asKeyStore(ks);
}

async function readKey(key) {
    try {
        await keystore.add(key);
    }
    catch (err) {
        try {
            await keystore.add(key, "pem");
        }
        catch (err) {
            try {
                await keystore.add(key, "pkcs8");
            }
            catch (err) {
                try {
                    await keystore.add(key, "x509");
                }
                catch (err) {
                    try {
                        await keystore.add(key, "pkix");
                    }
                    catch (err) {
                        await keystore.add(key, "spki");
                    }
                }
            }
        }
    }
}

function loadKey() {
    fs.readFile(keyFile, function (err, data ) {
        // debug("hello %o", data.toString());
        if (err) {
            process.exit(1);
        }

        readKey(data.toString())
            .then(() => keystore.toJSON())
            .then((json) => process.stdout.write(JSON.stringify(json)))
            .then(()    => process.exit(0))
            // .catch((err) => console.log(err))
            .catch(()   => process.exit(1));
    });
}

function loadKeystore() {
    fs.readFile(jwksfile, function (err, data ) {
        // debug("hello %o", data.toString());
        if (err) {
            process.exit(1);
        }

        readKeystore(data.toString())
            .then(()    => loadKey())
            // .catch((err) => console.log(err))
            .catch(()   => process.exit(1));
    });
}


if (jwksfile) {
    loadKeystore();
}
else {
    keystore = JWK.createKeyStore();
    loadKey();
}
