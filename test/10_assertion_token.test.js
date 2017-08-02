"use strict";

const Debug = require("debug");

Debug.enable("ldap-oidc:*,oidc-provider:*");

// start the actual code
const url = require("url");
const chai = require("chai");
const chaihttp = require("chai-http");
const kl = require("../provider/helper/keyloader");

const settings = require("../provider/configurator");
// const JWT = require("oidc-provider/lib/helpers/jwt.js");
// const epochTime = require("oidc-provider/lib/helpers/epoch_time.js");

chai.use(chaihttp);

const { expect } = chai;

describe("Assertion Token", function () {
    const jwks = new kl();
    const clientId = "oidcCLIENT";
    const clientPwd = "test4321";
    const grantType = "urn:ietf:params:oauth:grant-type:jwt-bearer";

    var tokenEndPoint;
    var tEP_host;
    var tEP_path;

    before(async function() {
        await settings.loadConfiguration("test/helper/provider.json");
        await settings.initProvider();
        await jwks.loadKey("test/helper/pemkeys/private.pem");

        // we want to populate the client
        const cliDb  = settings.adapter("Client");

        // insert a client
        const client = {
            client_id: clientId,
            client_secret: clientPwd,
            grant_types: ["refresh_token", "authorization_code", grantType],
            redirect_uris: ["http://localhost:3001"],
        };

        cliDb.upsert(clientId, client);
    });

    // it("jwt", async function() {
    //     const result = await JWT.sign({cnf: "foo", iss: "me"},jwks.keys.keys[0], "RS256" );
    //
    //     console.log(result);
    // });

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

    it("post assertion with client auth", async function() {
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
            console.log(err);
            expect(err).to.be.null;
        }
        // console.log(result);
        expect(result).to.have.status(200);
        expect(result).to.be.json;
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
});
