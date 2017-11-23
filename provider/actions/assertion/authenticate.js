"use strict";

const debug = require("debug")("ldap-oidc:jwt-assertion-authn");
const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");
const JWT = require("oidc-provider/lib/helpers/jwt");

module.exports = function factory(provider, settings) {
    return async function authenticate(ctx, next) {
        if (ctx.oidc.assertion_grant.authn) {
            debug("authenticate");

            const claims = ctx.oidc.assertion_grant.body;
            const now = Date.now();

            // debug("%O", claims);
            // debug("%O", claims.cnf);
            // debug(typeof claims.cnf.jwk);

            ctx.oidc.assertion_grant.useJwk = false;

            // verify a cnf key is present
            if (!(claims.cnf && typeof claims.cnf.jwk === "object")) {
                debug("cnf key is incomplete");
                ctx.throw(new InvalidRequestError("invalid assertion provided"));
            }

            if (!claims.cnf.jwk.kid) {
                debug("cnf kid missing");
                ctx.throw(new InvalidRequestError("invalid assertion provided"));
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

                // - verify that x_jwt is an access token from here.
                if (claims.iss !== decoded.payload.aud) {
                    debug("x_jwt mismatches the iss claim");
                    ctx.throw(new InvalidRequestError("invalid assertion provided"));
                }

                if (claims.sub !== decoded.payload.sub) {
                    debug("x_jwt mismatches the sub claim");
                    ctx.throw(new InvalidRequestError("invalid assertion provided"));
                }

                if (claims.aud !== decoded.payload.iss) {
                    debug("x_jwt mismatches the iss claim");
                    ctx.throw(new InvalidRequestError("invalid assertion provided"));
                }
                ctx.oidc.assertion_grant.useJwk = true;
            }

            if (claims.x_crd) {
                if (!claims.x_jwt) {
                    if (typeof claims.x_crd !== "string") {
                        debug("invalid x_crd claim for password authentication");
                        ctx.throw(new InvalidRequestError("invalid assertion provided"));
                    }

                    // if x_crd is present without a jwt try to login the sub using x_crd as password
                    const sub = claims.sub;
                    const pwd = claims.x_crd;

                    try {
                        const user = await settings.accountByLogin(sub, pwd);

                        if (!user) {
                            throw "no user";
                        }

                        ctx.oidc.assertion_grant.sub = user;
                    }
                    catch (error) {
                        debug("authentication failed");
                        ctx.throw(new InvalidRequestError("invalid assertion provided"));
                    }
                }
                // else {
                    // NOTE: multi-factor authentication can be included here
                    // NOTE: multi-factor information could be send via
                    //       push notification to trust agent apps
                // }
            }

            // FIXME ensure that cnf.typ is conforming JWK.

            const sessionInfo = {
                azp: claims.azp,
                kid: claims.cnf.jwk.kid,
                key: claims.cnf.jwk,
                iss: claims.iss,
                sub: claims.sub,
                auth_time: now
            };

            await settings.adapter("ConfirmationKeys").upsert(sessionInfo.kid, sessionInfo);
            ctx.oidc.assertion_grant.auth_time = now;
        }

        await next();
    };
};
