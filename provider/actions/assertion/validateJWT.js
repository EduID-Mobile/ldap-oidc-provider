"use strict";


const Debug = require("debug");

const debug = Debug("ldap-oidc:jwt-assertion");

const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");
const JWT = require("oidc-provider/lib/helpers/jwt");
const { JWK: { asKeyStore } } = require("node-jose");

module.exports = function factory(provider, settings) { // eslint-disable-line
    async function validateJwtWithKey(ctx, jwt, jwks) {
        debug("validate JWT with a Key");
        if (!jwks) {
            debug("no key to validate");
            ctx.throw(new InvalidRequestError("invalid assertion"));
        }

        try {
            const keyStore = await asKeyStore(jwks);

            const isValid = await JWT.verify(jwt, keyStore);

            if (!isValid) {
                throw "no validated";
            }
        }
        catch (err) {
            debug("invalid assertion signature");
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

        await validateClient(ctx, cnfKey.iss);
        await validateJwtWithKey(ctx, jwt, cnfKey.key);

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

        debug(`kid == ${kid}`);
        debug("client %O", client);

        await validateJwtWithKey(ctx, jwt, client.jwks.keys[kid]);
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
