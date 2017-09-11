"use strict";

const debug = require("debug")("ldap-oidc:jwt-assertion");
const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");
const JWT = require("oidc-provider/lib/helpers/jwt");
const { JWK: { asKeyStore } } = require("node-jose");

module.exports = function factory(provider, settings) { // eslint-disable-line
    return async function verifyAssertionPayload(ctx, next) {
        debug("verify assertion payload");
        // * verify valid JWS format
        // * check presence of kid
        // * verify aud
        // * verify expiration (iat + exp)
        // * check cnf presence
        // * validate cnf type
        // * check kid ?= cnf.kid
        // * find issuer info
        // * kid != cnf.kid: verify x_jwt
        // * verify iss
        // * verify sub

        // two payload formats are possible.
        // Case 1: compact serialization MUST contain a cnf matching the iss and sub
        //         the signature MUST match the cnf if kid cnf
        //         the signature MUST match the iss key if full cnf key is present
        // Case 2: json serialization MUST contain a cnf matching the iss and sub
        //         the JWS MUST be always signed with both the iss and the cnf key
        if (ctx.oidc.assertion_grant.payload.split(".").length !== 3) {
            debug("unsupported assertion payload");
            ctx.throw(new InvalidRequestError("invalid assertion provided"));
        }
    // debug("good assertion payload");

        const jwt = ctx.oidc.assertion_grant.payload;
    // get the issuer jwk
    // debug(jwt);
        let assIssuer;

        try {
            const decoded = await JWT.decode(jwt);

            if (!(decoded.payload && decoded.payload.iss)) {
                debug("missing issuer");
                ctx.throw(new InvalidRequestError("missing assertion issuer"));
            }

        // debug("jwt decoded ");
            assIssuer = decoded.payload.iss;
            ctx.oidc.assertion_grant.body = decoded.payload;
            ctx.oidc.assertion_grant.issuer = assIssuer;
        }
        catch (err) {
            debug("bad assertion payload");
            debug(err);
            ctx.throw(new InvalidRequestError("bad assertion payload"));
        }

    // issuer is a client id
        const client = await provider.Client.find(String(assIssuer));

        if (!client) {
            debug("assertion client not found");
            ctx.throw(new InvalidRequestError("unknown assertion issuer"));
        }

        // verify the cnf key
        const cnf =  ctx.oidc.assertion_grant.body.cnf;

        // If the cnf claim contains a key references
        if (typeof cnf === "object" && cnf.hasOwnProperty("kid")) {
            // The kid MUST match the iss-sub tuple.
            // => find the cnf kid in the key store
            const cnfKey = await settings.adapter("ConfirmationKeys").find(cnf.kid);

            if (!cnfKey) {
                debug("invalid cnf claim");
                ctx.throw(new InvalidRequestError("invalid cnf claim"));
            }
            // => verify the iss and sub
            if (cnfKey.iss !== assIssuer ||
                cnfKey.sub !== ctx.oidc.assertion_grant.body.sub) {
                debug("cnf claim mismatch");
                ctx.throw(new InvalidRequestError("mismatching cnf claim"));
            }

            // the assertion MUST be signed with the kid
            const jwks = await asKeyStore(cnfKey.jwks);

            try {
            // TODO verify audience (despite the package being encrypted
            // for us)
                const isverified = await JWT.verify(jwt, jwks);

                if (!isverified) {
                // debug("not verified");
                    throw "not verified";
                }
            }
            catch (err) {
                debug("cnf verification error");
                debug(err);
                ctx.throw(new InvalidRequestError("assertion cnf mismatch"));
            }
        }
        else {
            // all assertions without cnf-key references must be signed by
            // the client.

        // IMPORTANT: need to process the client's keystore before handing
        // it to the verify()-method

        // if the JWT is presented in JSON serialisation, then the JWS MUST be signed with the client keys
            client.jwks = await asKeyStore(client.jwks);

            try {
            // TODO verify audience (despite the package being encrypted
            // for us)
                const isverified = await JWT.verify(jwt, client.jwks);

                if (!isverified) {
                // debug("not verified");
                    throw "not verified";
                }
            }
            catch (err) {
                debug("iss verification error");
                debug(err);
                ctx.throw(new InvalidRequestError("assertion issuer mismatch"));
            }
        }

        ctx.oidc.assertion_grant.client = client;

        await next();
    };
};
