"use strict";
/* eslint-disable */

const { expect } = require("chai");

const KeyLoader = require("../provider/helper/keyloader");

describe("KeyLoader", function() {
    it("loads", function() {
        expect(KeyLoader).to.be.a("function");
    });

    it("init", function() {
        const kl = new KeyLoader();
        expect(kl).to.be.an("object");
        expect(kl.ks).to.be.an("object");

        const json = kl.ks.toJSON();
        expect(json).to.have.keys("keys");
        expect(json.keys).to.be.empty;
    });

    it("check file good", async function() {
        // note we test against the mocha context and thus the path is at the
        // project root
        const fnGood = "configuration/settings.js";
        const kl = new KeyLoader();

        const res = await kl.chkFile(fnGood)
        expect(res).to.be.equal(fnGood)
    });

    it("check file bad", function(done) {
        // note we test against the mocha context and thus the path is at the
        // project root
        const fnBad = "configuration/bad.js";
        const kl = new KeyLoader();

        kl.chkFile(fnBad)
            .then(res => {
                done("should not read");
            })
            .catch(err => {
                expect(err.message).to.be.not.empty;
                done();
            });
    });

    it("check file with directory", async function() {
        // note we test against the mocha context and thus the path is at the
        // project root
        const fnBad = "configuration/keys";
        const kl = new KeyLoader();
        let key;
        try {
            key = await kl.chkFile(fnBad);
        }
        catch(err) {
            expect(err.message).to.be.equal("NOTAFILE");
        }

        expect(key).to.be.undefined;
    });

    it("check directory good", async function() {
        // note we test against the mocha context and thus the path is at the
        // project root
        const fnGood = "configuration/keys";
        const kl = new KeyLoader();

        const result = await kl.chkDir(fnGood);

        expect(result).to.be.equal(fnGood);
    });

    it("check directory with a file", async function() {
        // note we test against the mocha context and thus the path is at the
        // project root
        const fnBad = "configuration/settings.js";
        const kl = new KeyLoader();

        let result;
        try {
            result = await kl.chkDir(fnBad);
        }
        catch (err) {
            expect(err.message).to.be.equal("NOTAFOLDER");
        }
        expect(result).to.be.undefined;
    });

    it("check directory with bad name", async function() {
        // note we test against the mocha context and thus the path is at the
        // project root
        const fnBad = "configuration/bad";
        const kl = new KeyLoader();
        let result;
        try {
            result = await kl.chkDir(fnBad);
        }
        catch (err) {
            expect(err.message).to.be.not.empty;
        }
        expect(result).to.be.undefined;
    });

    it("parse jwk good", async function() {
        const goodJWK = '{"kty": "RSA"}';
        const kl = new KeyLoader();

        const res = await kl.parseJWK(goodJWK)
        expect(res).to.be.an("object");
        expect(res).to.have.keys("kty");
        expect(res.kty).to.be.equal("RSA");
    });

    it("parse jwks good", async function() {
        const goodJWK = '{"keys": []}';
        const kl = new KeyLoader();

        const res = await kl.parseJWK(goodJWK)
        expect(res).to.be.an("object");
        expect(res).to.have.keys("keys");
        expect(res.keys).to.be.empty;
    });

    it("parse jwk bad", async function() {
        const badJWK = 'foobar';
        const kl = new KeyLoader();

        let res;
        try {
            res = await kl.parseJWK(badJWK);
        }
        catch (err) {
            expect(err).to.be.equal(badJWK);
        }
        expect(res).to.be.undefined;
    });

    it("load file", async function() {
        const fn = "test/helper/file/loadFile.helper";
        const kl = new KeyLoader();

        const res = await kl.loadFile(fn);

        expect(res).to.be.equal("test ok\n");
    });

    it("load folder", async function() {
        const fn = "test/helper/file";
        const kl = new KeyLoader();

        const res = await kl.readDir(fn)

        expect(res).to.be.an("array");
        expect(res).to.have.lengthOf(1);
        expect(res[0]).to.be.equal(`${fn}/loadFile.helper`);
    });

    it("load jwk key atomic", async function() {
        const fn = "configuration/integrity.jwk";
        const kl = new KeyLoader();

        await kl.loadKey(fn);

        const json = kl.keys;
        expect(json).to.be.an("object");
        expect(json).to.have.keys("keys");
        expect(json.keys).to.be.an("array");
        expect(json.keys).to.have.lengthOf(1);
        expect(json.keys[0]).to.be.an("object");
        expect(json.keys[0]).to.have.keys("kty", "k", "alg", "kid");
        expect(json.keys[0].kty).to.be.equal("oct");
    });

    it("load pem key atomic", async function() {
        const fn = "test/helper/pemkeys/private.pem";
        const kl = new KeyLoader();

        await kl.loadKey(fn);
        const json = kl.keys;
        expect(json).to.be.an("object");
        expect(json).to.have.keys("keys");
        expect(json.keys).to.be.an("array");
        expect(json.keys).to.have.lengthOf(1);
        expect(json.keys[0]).to.be.an("object");
        expect(json.keys[0]).to.have.keys("kty", "d", "kid", "dp", "dq", "e", "n", "p", "q", "qi");
        expect(json.keys[0].kty).to.be.equal("RSA");
    });

    it("load jwk key store single", async function() {
        const fn = "configuration/integrity.jwks";
        const kl = new KeyLoader();

        await kl.loadKey(fn);
        const json = kl.keys;
        expect(json).to.be.an("object");
        expect(json).to.have.keys("keys");
        expect(json.keys).to.be.an("array");
        expect(json.keys).to.have.lengthOf(1);
        expect(json.keys[0]).to.be.an("object");
        expect(json.keys[0]).to.have.keys("kty", "k", "alg", "kid");
        expect(json.keys[0].kty).to.be.equal("oct");
    });

    it("load jwk key store multi", async function() {
        const fn = "configuration/keys/example.jwks";
        const kl = new KeyLoader();

        await kl.loadKey(fn)
        const json = kl.keys;
        expect(json).to.be.an("object");
        expect(json).to.have.keys("keys");
        expect(json.keys).to.be.an("array");
        expect(json.keys).to.have.lengthOf(5);
        expect(json.keys[0]).to.be.an("object");
        expect(json.keys[0]).to.have.keys("kty", "d", "use", "kid", "dp", "dq", "e", "n", "p", "q", "qi");
        expect(json.keys[0].kty).to.be.equal("RSA");
    });

    it("load jwk from key directory multi keys", async function() {
        const fn = "configuration/keys";
        const kl = new KeyLoader();

        await kl.loadKeyDir(fn);
        const json = kl.keys;
        expect(json).to.be.an("object");
        expect(json).to.have.keys("keys");
        expect(json.keys).to.be.an("array");
        expect(json.keys).to.have.lengthOf(5);
        expect(json.keys[0]).to.be.an("object");
        // expect(json.keys[0]).to.have.keys("kty", "d", "use", "kid", "dp", "dq", "e", "n", "p", "q", "qi");
        expect(json.keys[0].kty).to.be.equal("RSA");
    });

    it("load pem from key directory multi keys", async function() {
        const fn = "test/helper/pemkeys";
        const kl = new KeyLoader();

        await kl.loadKeyDir(fn);

        const json = kl.keys;
        expect(json).to.be.an("object");
        expect(json).to.have.keys("keys");
        expect(json.keys).to.be.an("array");
        expect(json.keys).to.have.lengthOf(2);
        expect(json.keys[0]).to.be.an("object");
        expect(json.keys[0]).to.have.keys("kty", "kid", "x5t", "e", "n");
        expect(json.keys[0].kty).to.be.equal("RSA");
        expect(json.keys[1]).to.be.an("object");
        expect(json.keys[1]).to.have.keys("kty", "d", "kid", "dp", "dq", "e", "n", "p", "q", "qi");
        expect(json.keys[1].kty).to.be.equal("RSA");
    });
});
