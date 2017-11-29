"use strict";

const Debug = require("debug");

Debug.enable("ldap-oidc:*,oidc-provider:*");

const debug = Debug("ldap-oidc:test");

// start the actual code
const ld = require("lodash");
const url = require("url");
const chai = require("chai");
const jose = require("node-jose");

const { encode, decode } = require("base64url");

const chaihttp = require("chai-http");
const kl = require("../provider/helper/keyloader");

const settings = require("../provider/configurator");
const JWT = require("oidc-provider/lib/helpers/jwt.js");
// const epochTime = require("oidc-provider/lib/helpers/epoch_time.js");

chai.use(chaihttp);

const { expect } = chai;

async function encryptToken(payload, key) {
    if (typeof payload !== "string") {
        payload = JSON.stringify(payload);
    }
    return JWT.encrypt(payload,key, "A128GCM","RSA-OAEP" );
}

async function signToken(payload, key) {
    // debug("sign token for %o", payload);
    return JWT.sign(payload, key, "RS256" );
}

describe("Assertion Token", function () {
    const jwks = new kl();
    const clientId = "oidcCLIENT";
    const clientPwd = "test4321";
    const grantType = "urn:ietf:params:oauth:grant-type:jwt-bearer";

    var tokenEndPoint;
    var tEP_host;
    var tEP_path;
    var enckey, signkey;
    var mykey;
    const keys = [];

    before(async function() {
        await settings.loadConfiguration("test/helper/provider.json");
        await settings.initProvider();
        await jwks.loadKey("test/helper/pemkeys/private.pem");
        const hwk = new kl();

        await hwk.loadKey("test/helper/pemkeys/example.jwks");

        enckey = hwk.keys.keys.find((e) => e.kty === "RSA" && e.use === "enc");
        delete enckey.q;
        delete enckey.p;
        delete enckey.d;
        delete enckey.qi;
        delete enckey.dp;
        delete enckey.dq;

        signkey = hwk.keys.keys.find((e) => e.kty === "RSA" && e.use === "sig");
        delete signkey.q;
        delete signkey.p;
        delete signkey.d;
        delete signkey.qi;
        delete signkey.dp;
        delete signkey.dq;

        // debug(signkey); // used for response
        // debug(enckey);  // used for request
        // debug(jwks.keys); // used by the client

        // duplicate all keys without a use declaration
        jwks.keys.keys.map((k) => {
            keys.push(k);
            if (k.kty === "RSA" && !k.use) {
                k.use = "enc";
                mykey = ld.clone(k);
                k.use = "enc";
                delete k.q;
                delete k.p;
                delete k.d;
                delete k.qi;
                delete k.dp;
                delete k.dq;

                const cK = ld.clone(k);

                cK.kid = cK.kid + "sig";
                cK.use = "sig";
                mykey = ld.clone(cK);

                keys.push(cK);
            }
        });

        // debug(keys); // used by the client

        // we want to populate the client DB
        const cliDb  = settings.adapter("Client");

        // insert a client
        const client = {
            "client_id": clientId,
            "client_secret": clientPwd,
            "grant_types": ["refresh_token", "authorization_code", grantType],
            "redirect_uris": ["http://localhost:3001"],
            "jwks": jwks.keys
        };

        // debug(client);
        cliDb.upsert(clientId, client);

        // insert a dummy client for testing the authorization
        const clientAuthz = {
            "client_id": "authzclient",
            "client_secret": "test1234",
            "grant_types": ["refresh_token", "authorization_code", grantType],
            "redirect_uris": ["http://foobar.com:3001"],
            "jwks": jwks.keys
        };

        // debug(client);
        cliDb.upsert("authzclient", clientAuthz);

        // insert the user
        const userDb  = settings.adapter("Account");

        const user = {
            "sub": "1234567890",
            "login": "phish",
            "password": "foobar",
            "mail": "phish@example.com",
        };

        userDb.upsert(user.sub, user);
    });

    it("verify user account", async function() {
        const userDb  = settings.adapter("Account");

        let user;

        user = await userDb.find("1234567890");

        // debug("find by id user %O", user);

        expect(user).to.be.an.object;
        expect(user.sub).to.be.equal("1234567890");
        expect(user.mail).to.be.equal("phish@example.com");

        user = await userDb.findByLogin("phish");

        // debug("find by login user %O", user);
        expect(user).to.be.an.array;
        expect(user).to.have.length(1);
        expect(user[0].sub).to.be.equal("1234567890");
        expect(user[0].mail).to.be.equal("phish@example.com");

        user = await userDb.findAndBind("phish", "foobar");

        // debug("authenticated user %O", user);
        expect(user).to.be.an.array;
        expect(user[0].sub).to.be.equal("1234567890");
        expect(user[0].mail).to.be.equal("phish@example.com");
    });

    it("jwt", async function() {
        const resultEnc = await encryptToken({cnf: "foo", iss: "me"},enckey);

        // debug("%O", resultEnc);
        expect(resultEnc.split(".")).to.be.an("array").that.has.lengthOf(5);

        const resultSign = await signToken({cnf: "foo", iss: "me"}, jwks.keys.keys[0] );

        // debug("%O", resultSign);
        expect(resultSign.split(".")).to.be.an("array").that.has.lengthOf(3);
        // debug(new Buffer(resultSign.split(".")[0], "base64").toString("ascii"));
        // debug(new Buffer(resultSign.split(".")[1], "base64").toString("ascii"));
    });

    it("check availability", async function() {
        const discovery = "/.well-known/openid-configuration";
        const connection = chai.request("http://localhost:3000");

        let result = await connection.get(discovery).send();

        expect(result).to.have.status(200);
        expect(result).to.be.json;
        expect(result.body).to.include.keys("grant_types_supported");
        expect(result.body.grant_types_supported).to.be.an("array");
        expect(result.body.grant_types_supported).to.include(grantType);

        tokenEndPoint = url.parse(result.body.token_endpoint);
        tEP_host = `${tokenEndPoint.protocol}//${tokenEndPoint.host}`;
        tEP_path = tokenEndPoint.path;
    });

    it("post assertion with client auth bad assertion", async function() {
        const connection = chai.request(tEP_host);

        let result;

        try {
            result = await connection
                .post(tEP_path)
                .auth(clientId, clientPwd)
                .type("form")
                .send({
                    grant_type: grantType,
                    assertion: "foobar",
                    scope: "openid"
                });
        }
        catch (err) {
            // console.log(err);
            expect(err.response).to.have.status(400);
            expect(err.response).to.be.json;
            expect(err.response.body.error_description).to.be.equal("invalid assertion provided");
        }
        // console.log(result);
        expect(result).to.be.undefined;
        // expect(result).to.have.status(200);

    });

// TODO: assertion without cnf
// TODO: assertion with missing claims
// TODO: assertion without cnf.jwk.kid
// TODO: Assertion without cnf.jwk

    it("post assertion with client auth signed assertion", async function() {
        this.timeout(8000);

        const connection = chai.request(tEP_host);
        const type = "RSA";
        const size = 2048;
        const keystore = jose.JWK.createKeyStore();

        let result;

        // create a temporary cnf key
        const cnfKey = await keystore.generate(type, size);

        debug("%O", cnfKey.toJSON());

        const assertion = await signToken({
            iss: clientId,
            aud: "http://localhost:3000",
            sub: "phish",
            x_crd: "foobar",
            azp: "0",
            cnf: {
                jwk: cnfKey.toJSON(),
            }
        }, jwks.keys.keys[0]);

        // debug(assertion);
        try {
            result = await connection
                .post(tEP_path)
                .auth(clientId, clientPwd)
                .type("form")
                .send({
                    grant_type: grantType,
                    assertion: assertion,
                    scope: "openid"
                });
        }
        catch (err) {
            // console.log(err);
            debug("error %O", err.response.text);
            // expect(err.response).to.have.not.status(400);
            // expect(err.response).to.be.json;
            // expect(err.response.body.error_detail).to.be.equal("invalid assertion provided");
        }
        // debug(result.body.id_token.split(".").length);

        expect(result).to.be.defined;
        expect(result).to.have.status(200);
        expect(result).to.be.json;

        // A RFC7800-client can silently ignore the access and refresh token
        // unless we want to log the user out.
        expect(result.body).to.have.keys("access_token",
                                         "id_token",
                                         "refresh_token",
                                         "token_type",
                                         "expires_in");

        // verify the contents of the id token
        // Because we just requested the openid scope, we will receive ONLY
        // the sub of the authorization
        const idToken = JSON.parse(decode(result.body.id_token.split(".")[1]));

        expect(idToken).to.be.defined;
        expect(idToken.sub).to.be.defined;
        expect(idToken.sub).to.be.equal("1234567890");
    });

    it("post assertion with client auth and encrypted assertion", async function() {
        this.timeout(8000);

        const connection = chai.request(tEP_host);

        let result;

        this.timeout(8000);

        const type = "RSA";
        const size = 2048;
        const keystore = jose.JWK.createKeyStore();
        const cnfKey = await keystore.generate(type, size);

        debug("%O", cnfKey.toJSON());

        const assertionPayload = await signToken({
            iss: clientId,
            aud: "http://localhost:3000",
            sub: "phish",
            x_crd: "foobar",
            azp: "1",
            cnf: {
                jwk: cnfKey.toJSON(),
            }
        }, jwks.keys.keys[0]);

        const assertion = await encryptToken(assertionPayload, enckey);

        try {
            result = await connection
                .post(tEP_path)
                .auth(clientId, clientPwd)
                .type("form")
                .send({
                    grant_type: grantType,
                    assertion: assertion,
                    scope: "openid"
                });
        }
        catch (err) {
            // console.log(err);
            debug("error %O", err.response.text);
            // expect(err.response).to.have.not.status(400);
            // expect(err.response).to.be.json;
            // expect(err.response.body.error_detail).to.be.equal("invalid assertion provided");
        }
        // debug(result.body.id_token.split(".").length);

        expect(result).to.be.defined;
        expect(result).to.have.status(200);
        expect(result).to.be.json;

        // A RFC7800-client can silently ignore the access and refresh token
        // unless we want to log the user out.
        expect(result.body).to.have.keys("access_token",
                                         "id_token",
                                         "refresh_token",
                                         "token_type",
                                         "expires_in");

        // verify the contents of the id token
        // Because we just requested the openid scope, we will receive ONLY
        // the sub of the authorization
        const idToken = JSON.parse(decode(result.body.id_token.split(".")[1]));

        expect(idToken).to.be.defined;
        expect(idToken.sub).to.be.defined;
        expect(idToken.sub).to.be.equal("1234567890");
    });


    it("check ConfirmationKeys", async function() {
        const cnfDb  = settings.adapter("ConfirmationKeys");

        expect(cnfDb).to.be.defined;

        const result = await cnfDb.objects();

        debug("%O", result);
        expect(result).to.have.lengthOf(2);

            // the keys are in reverse order in the cache.
        expect(result[0].azp).to.be.equal("1");
        expect(result[1].azp).to.be.equal("0");
        expect(result[0].sub).to.be.equal("1234567890");
        expect(result[1].sub).to.be.equal("1234567890");
        expect(result[0].iss).to.be.equal(clientId);
        expect(result[1].iss).to.be.equal(clientId);
    });


    it("post assertion with client auth and encrypted assertion for different audience", async function() {
        const connection = chai.request(tEP_host);

        let result;

        const assertPayload = await signToken({
            iss: clientId,
            aud: "http://localhost:3000"
        }, jwks.keys.keys[0]);

        const assertion = await encryptToken(assertPayload, jwks.keys.keys[0]);

        // debug(assertion);
        try {
            result = await connection
                .post(tEP_path)
                .auth(clientId, clientPwd)
                .type("form")
                .send({
                    grant_type: grantType,
                    assertion: assertion,
                    scope: "openid"
                });
        }
        catch (err) {
            // console.log(err);

            expect(err.response).to.have.status(400);
            expect(err.response).to.be.json;
            expect(err.response.body.error_description).to.be.equal("invalid assertion audience");
        }
        // console.log(result);
        // expect(result).to.be.undefined;
        expect(result).to.be.undefined;
    });

    it("post assertion without client auth", async function() {
        const connection = chai.request(tEP_host);

        let result;

        try {
            result = await connection
                .post(tEP_path)
                // .auth(clientId, clientPwd)
                .type("form")
                .send({
                    grant_type: grantType,
                    assertion: "foobar",
                    scope: "openid"
                });
        }
        catch (err) {
            // console.log(err);
            expect(err).to.be.not.null;
            expect(err).to.have.status(400);
            expect(err.response.body).to.be.not.null;
            expect(err.response.body.error).to.be.equal("invalid_client");
        }
        expect(result).to.be.undefined;
    });

    it("post assertion without scope", async function() {
        const connection = chai.request(tEP_host);

        let result;

        try {
            result = await connection
                .post(tEP_path)
                .auth(clientId, clientPwd)
                .type("form")
                .send({
                    grant_type: grantType,
                    assertion: "foobar"
                });
        }
        catch (err) {
            // console.log(err);
            expect(err).to.be.not.null;
            expect(err).to.have.status(400);
            expect(err.response.body).to.be.not.null;
            expect(err.response.body.error).to.be.equal("invalid_request");
            expect(err.response.body.error_description).to.be.equal("missing required parameter(s) scope");

        }
        expect(result).to.be.undefined;
    });

    it("authorization", async function() {
        this.timeout(8000);

        const connection = chai.request(tEP_host);

        let result;

        this.timeout(8000);

        const type = "RSA";
        const size = 2048;
        const keystore = jose.JWK.createKeyStore();
        const cnfKey = await keystore.generate(type, size);

        debug("%O", cnfKey.toJSON());

        const assertionPayload = await signToken({
            iss: clientId,
            aud: "http://localhost:3000/",
            sub: "phish",
            x_crd: "foobar",
            azp: "1",
            cnf: {
                jwk: cnfKey.toJSON(),
            }
        }, jwks.keys.keys[0]);

        const assertion = await encryptToken(assertionPayload, enckey);

        try {
            result = await connection
                .post(tEP_path)
                .auth(clientId, clientPwd)
                .type("form")
                .send({
                    grant_type: grantType,
                    assertion: assertion,
                    scope: "openid"
                });
        }
        catch (err) {
            // console.log(err);
            debug("error %O", err.response.text);
            // expect(err.response).to.have.not.status(400);
            // expect(err.response).to.be.json;
            // expect(err.response.body.error_detail).to.be.equal("invalid assertion provided");
        }
        // debug(result.body.id_token.split(".").length);

        expect(result).to.be.defined;
        expect(result).to.have.status(200);
        expect(result).to.be.json;

        // A RFC7800-client can silently ignore the access and refresh token
        // unless we want to log the user out.
        expect(result.body).to.have.keys("access_token",
                                         "id_token",
                                         "refresh_token",
                                         "token_type",
                                         "expires_in");

        const authzCli = "authzclient";
        const authzPwd = "test1234";
        const idToken = JSON.parse(decode(result.body.id_token.split(".")[1]));

        const authzAssertionPayload = await signToken({
            iss: "1",
            aud: "http://localhost:3000",
            sub: idToken.sub,
            azp: "http://foobar.com:3001",
            cnf: {
                kid: cnfKey.kid,
            }
        }, cnfKey);

        const authzAssertion = await encryptToken(authzAssertionPayload, enckey);

        result = null;

        try {
            result = await connection
                .post(tEP_path)
                .auth(authzCli, authzPwd)
                .type("form")
                .send({
                    grant_type: grantType,
                    assertion: authzAssertion,
                    scope: "openid"
                });
        }
        catch (err) {
            // console.log(err);
            debug("error %O", err.response.text);
            // expect(err.response).to.have.not.status(400);
            // expect(err.response).to.be.json;
            // expect(err.response.body.error_detail).to.be.equal("invalid assertion provided");
        }
        // debug(result.body.id_token.split(".").length);

        expect(result).to.be.defined;
        expect(result).to.have.status(200);
        expect(result).to.be.json;

        // A RFC7800-client can silently ignore the access and refresh token
        // unless we want to log the user out.
        expect(result.body).to.have.keys("access_token",
                                         "id_token",
                                         "refresh_token",
                                         "token_type",
                                         "expires_in");
    });
});
