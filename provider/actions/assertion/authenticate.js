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

            if (claims.x_crd) {
                if (typeof claims.x_crd !== "string") {
                    debug("invalid x_crd claim for password authentication");
                    ctx.throw(new InvalidRequestError("invalid assertion provided"));
                }

                const sub = claims.sub;
                const pwd = claims.x_crd;

                debug("try to login %s, %s", sub, pwd);
                // debug("settings %O", settings.accountByLogin.toString());

                try {
                    const user = await settings.accountByLogin(sub, pwd);

                    if (!user) {
                        throw "no user";
                    }

                    ctx.oidc.assertion_grant.sub = user;
                }
                catch (error) {
                    debug("authentication failed %O", error);
                    ctx.throw(new InvalidRequestError("invalid assertion provided"));
                }
                debug("complete request ... %O", ctx.oidc.assertion_grant.sub);
            }

            const sessionInfo = {
                azp: claims.azp,
                kid: claims.cnf.jwk.kid,
                key: claims.cnf.jwk,
                iss: claims.iss,
                sub: claims.sub,
                auth_time: now
            };

            debug("upsert session info %O", sessionInfo);
            await settings.adapter("ConfirmationKeys").upsert(sessionInfo.kid, sessionInfo);
            ctx.oidc.assertion_grant.auth_time = now;
        }

        await next();
    };
};
