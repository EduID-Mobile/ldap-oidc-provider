"use strict";

const debug = require("debug")("ldap-oidc:jwt-assertion-authz");
const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");
const JWT = require("oidc-provider/lib/helpers/jwt");

module.exports = function factory(provider, settings) { // eslint-disable-line
    return async function authorize(ctx, next) {
        debug("authorize if necessary");
        if (ctx.oidc.assertion_grant.authz) {
            debug("authorize");

            const claims = ctx.oidc.assertion_grant.body;

            if (ctx.oidc.client.clientId !== claims.iss) {
                if (Array.isArray(ctx.oidc.client.redirect_uri) &&
                   ctx.oidc.client.redirect_uri.indexOf(claims.azp))  {
                    debug("authorizing client does not match the authorized party");
                    ctx.throw(new InvalidRequestError("invalid assertion request"));
                }
                else if (ctx.oidc.client.redirect_uri !== claims.azp) {
                    debug("authorizing client does not match the authorized party");
                    ctx.throw(new InvalidRequestError("invalid assertion request"));
                }
            }

            if (claims.x_jwt) {
                let decoded;

                try {
                    decoded = JWT.decode(claims.x_jwt);
                }
                catch (error) {
                    debug("x_jwt claim is an invalid compact serialization");
                    ctx.throw(new InvalidRequestError("invalid assertion provided"));
                }

                if (!decoded) {
                    debug("x_jwt claim is invalid");
                    ctx.throw(new InvalidRequestError("invalid assertion provided"));
                }

                if (decoded.payload.sub) {
                    debug("x_jwt.sub claim MUST NOT be present");
                    ctx.throw(new InvalidRequestError("invalid assertion provided"));
                }

                if (decoded.payload.aud) {
                    debug("x_jwt.aud claim MUST NOT be present");
                    ctx.throw(new InvalidRequestError("invalid assertion provided"));
                }

                if (!decoded.payload.iss) {
                    debug("x_jwt.iss claim MUST be present");
                    ctx.throw(new InvalidRequestError("invalid assertion provided"));
                }

                // TODO verify if the iss is an registered app (optional, configurable)
                // TODO if the jwt is signed, then verify if the signature matches the iss/kid combination (optional)

                // NOTE: additional multi-factor auth information might be present in the x_crd claim
            }
        }
        await next();
    };
};
