"use strict";
/* eslint-disable */

const { expect } = require("chai");

const KeyLoader = require("../provider/helper/keyloader");

describe("KeyLoader", function() {
    it("loads", () => {
        expect(KeyLoader).to.be.a("function");
    });

    it("init", () => {
        const kl = new KeyLoader();
        expect(kl).to.be.an("object");
        expect(kl.ks).to.be.an("object");

        const json = kl.ks.toJSON();
        expect(json).to.have.keys("keys");
        expect(json.keys).to.be.empty;
    });

    it("check file good", (done) => {
        // note we test against the mocha context and thus the path is at the
        // project root
        const fnGood = "configuration/settings.js";
        const kl = new KeyLoader();

        kl.chkFile(fnGood)
            .then(res => {
                expect(res).to.be.equal(fnGood)
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it("check file bad", (done) => {
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

    it("check file with directory", (done) => {
        // note we test against the mocha context and thus the path is at the
        // project root
        const fnBad = "configuration/keys";
        const kl = new KeyLoader();

        kl.chkFile(fnBad)
            .then(res => {
                done("should not read");
            })
            .catch(err => {
                expect(err.message).to.be.equal("NOTAFILE");
                done();
            });
    });

    it("check directory good", (done) => {
        // note we test against the mocha context and thus the path is at the
        // project root
        const fnGood = "configuration/keys";
        const kl = new KeyLoader();

        kl.chkDir(fnGood)
            .then(res => {
                expect(res).to.be.equal(fnGood);
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it("check directory with a file", (done) => {
        // note we test against the mocha context and thus the path is at the
        // project root
        const fnBad = "configuration/settings.js";
        const kl = new KeyLoader();

        kl.chkDir(fnBad)
            .then(res => {
                done("should fail");
            })
            .catch(err => {
                expect(err.message).to.be.equal("NOTAFOLDER");
                done();
            });
    });

    it("check directory with bad name", (done) => {
        // note we test against the mocha context and thus the path is at the
        // project root
        const fnBad = "configuration/bad";
        const kl = new KeyLoader();

        kl.chkDir(fnBad)
            .then(res => {
                done("should fail");
            })
            .catch(err => {
                expect(err.message).to.be.not.empty;
                done();
            });
    });

    it("parse jwk good", (done) => {
        const goodJWK = '{"kty": "RSA"}';
        const kl = new KeyLoader();

        kl.parseJWK(goodJWK)
            .then(res => {
                expect(res).to.be.an("object");
                expect(res).to.have.keys("kty");
                expect(res.kty).to.be.equal("RSA");
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it("parse jwks good", (done) => {
        const goodJWK = '{"keys": []}';
        const kl = new KeyLoader();

        kl.parseJWK(goodJWK)
            .then(res => {
                expect(res).to.be.an("object");
                expect(res).to.have.keys("keys");
                expect(res.keys).to.be.empty;
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it("parse jwk bad", (done) => {
        const badJWK = 'foobar';
        const kl = new KeyLoader();

        kl.parseJWK(badJWK)
            .then(res => {
                done("should fail");
            })
            .catch(err => {
                expect(err).to.be.equal("foobar");
                done();
            });
    });

    it("load file", (done) => {
        const fn = "test/helper/loadFile.helper";
        const kl = new KeyLoader();

        kl.loadFile(fn)
            .then(res => {
                expect(res).to.be.equal("test ok\n");
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it("load folder", (done) => {
        const fn = "test/helper";
        const kl = new KeyLoader();

        kl.readDir(fn)
            .then(res => {
                expect(res).to.be.an("array");
                expect(res).to.have.lengthOf(1);
                expect(res[0]).to.be.equal(`${fn}/loadFile.helper`);
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it("load jwk key atomic", (done) => {
        const fn = "configuration/integrity.jwk";
        const kl = new KeyLoader();

        kl.loadKey(fn)
            .then(() => {
                const json = kl.keys;
                expect(json).to.be.an("object");
                expect(json).to.have.keys("keys");
                expect(json.keys).to.be.an("array");
                expect(json.keys).to.have.lengthOf(1);
                expect(json.keys[0]).to.be.an("object");
                expect(json.keys[0]).to.have.keys("kty", "k", "alg", "kid");
                expect(json.keys[0].kty).to.be.equal("oct");
                done();
            })
            .catch((err) => {
                done(err);
            });
    });

    it("load jwk key store single", (done) => {
        const fn = "configuration/integrity.jwks";
        const kl = new KeyLoader();

        kl.loadKey(fn)
            .then(() => {
                const json = kl.keys;
                expect(json).to.be.an("object");
                expect(json).to.have.keys("keys");
                expect(json.keys).to.be.an("array");
                expect(json.keys).to.have.lengthOf(1);
                expect(json.keys[0]).to.be.an("object");
                expect(json.keys[0]).to.have.keys("kty", "k", "alg", "kid");
                expect(json.keys[0].kty).to.be.equal("oct");
                done();
            })
            .catch((err) => {
                done(err)
            });
    });

    it("load jwk key store multi", (done) => {
        const fn = "configuration/keys/example.jwks";
        const kl = new KeyLoader();

        kl.loadKey(fn)
            .then(() => {
                const json = kl.keys;
                expect(json).to.be.an("object");
                expect(json).to.have.keys("keys");
                expect(json.keys).to.be.an("array");
                expect(json.keys).to.have.lengthOf(5);
                expect(json.keys[0]).to.be.an("object");
                expect(json.keys[0]).to.have.keys("kty", "d", "use", "kid", "dp", "dq", "e", "n", "p", "q", "qi");
                expect(json.keys[0].kty).to.be.equal("RSA");
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it("load jwk from key directory multi keys", (done) => {
        const fn = "configuration/keys";
        const kl = new KeyLoader();

        kl.loadKeyDir(fn)
            .then(() => {
                const json = kl.keys;
                expect(json).to.be.an("object");
                expect(json).to.have.keys("keys");
                expect(json.keys).to.be.an("array");
                expect(json.keys).to.have.lengthOf(5);
                expect(json.keys[0]).to.be.an("object");
                expect(json.keys[0]).to.have.keys("kty", "d", "use", "kid", "dp", "dq", "e", "n", "p", "q", "qi");
                expect(json.keys[0].kty).to.be.equal("RSA");
                done();
            })
            .catch((err) => {
                done(err)
            });
    });
});
