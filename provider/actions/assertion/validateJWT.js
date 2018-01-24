"use strict";


const Debug = require("debug");

const debug = Debug("ldap-oidc:validate-jwt");

const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");
const JWT = require("oidc-provider/lib/helpers/jwt");
const {
    parse,
    JWK: { asKeyStore, isKeyStore },
    JWS: { createSign, createVerify },
    // JWE: { createEncrypt, createDecrypt },
 } = require("node-jose");

module.exports = function factory(provider, settings) { // eslint-disable-line
    async function validateJwtWithKey(ctx, jwt, jwks) {
        debug("validate JWT with a Key");
        const origJwt = parse(ctx.oidc.assertion_grant.jwt);

        if (!jwks) {
            debug("no key to validate");
            ctx.throw(new InvalidRequestError("invalid assertion"));
        }

        try {
            debug("validate keystore");
            const keyStore = await asKeyStore(jwks);

            // const isValid = await JWT.verify(jwt, keyStore, {});
            debug("validate jwt");
            const isValid = await origJwt.perform(keyStore);

            if (!isValid) {
                throw new Error("not validated");
            }
        }
        catch (err) {
            debug("invalid assertion signature %O", err);
            ctx.throw(new InvalidRequestError("invalid assertion"));
        }
    }

    async function validateClient(ctx, iss) {
        const client = await provider.Client.find(String(iss));

        if (!client) {
            debug("client not found");
            ctx.throw(new InvalidRequestError("invalid assertion client"));
        }

        return client;
    }

    async function validateAuthz(ctx, jwt) {
        debug("AUTHZ");
        const kid = jwt.payload.cnf.kid;
        const iss = jwt.payload.iss;

        // adapter function crashes because settings is undefined
        const cnfKey = await settings.adapter("ConfirmationKeys").find(kid);

        if (!(cnfKey && cnfKey.azp && cnfKey.azp === iss)) {
            debug("assertion confirmation issuer not found");
            ctx.throw(new InvalidRequestError("unknown assertion issuer"));
        }

        debug("%O", cnfKey);
        await validateClient(ctx, cnfKey.iss);
        await validateJwtWithKey(ctx, jwt, [cnfKey.key]);

        if (cnfKey.sub !== jwt.payload.sub) {
            debug("mismatching sub entries for assertion and cnf key");
            ctx.throw(new InvalidRequestError("unknown assertion user"));
        }

        ctx.oidc.assertion_grant.auth_time = cnfKey.auth_time;
    }

    async function validateAuthn(ctx, jwt) {
        debug("AUTHN");
        const kid = jwt.header.kid;
        const iss = jwt.payload.iss;

        const client = await validateClient(ctx, iss);

        if (!client) {
            debug("AuthN client not found");
            ctx.throw(new InvalidRequestError("unknown assertion client"));
        }

        if (!client.jwks) {
            debug("AuthN client has no key set");
            ctx.throw(new InvalidRequestError("bad assertion client"));
        }

        if (!(client.jwks.keys && client.jwks.keys.length)) {
            debug("AuthN client has no keys");
            ctx.throw(new InvalidRequestError("bad assertion client"));
        }

        debug(`kid == ${kid}`);
        debug("client %O", client);

        let key = client.jwks.keys.find((k) => k.kid === kid);

        if (!key) {
            debug("Cannot find key for ${kid}");
            ctx.throw(new InvalidRequestError("bad assertion client key"));
        }

        await validateJwtWithKey(ctx, jwt, [key]);
    }

    return async function validateJWT(ctx, next) {
        debug("validate JWT");

        const jwt = ctx.oidc.assertion_grant.payload;
        const kid = jwt.header.kid;

        if (typeof jwt.payload.cnf === "object" &&
            jwt.payload.cnf.kid &&
            jwt.payload.cnf.kid === kid) {

            await validateAuthz(ctx, jwt);
            ctx.oidc.assertion_grant.authn = false;
        }
        else {
            await validateAuthn(ctx, jwt);
            ctx.oidc.assertion_grant.authn = true;
        }

        ctx.oidc.assertion_grant.authz = !ctx.oidc.assertion_grant.authn;

        await next();
    };
};
