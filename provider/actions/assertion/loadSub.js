"use strict";

const debug = require("debug")("ldap-oidc:jwt-assertion-loadsub");
const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");

module.exports = function factory(provider, settings) { // eslint-disable-line
    return async function loadSub(ctx, next) {
        debug("load sub");
        const claims = ctx.oidc.assertion_grant.body;

        if (!ctx.oidc.assertion_grant.sub) {
            debug("subject missing");

            const user = await settings.accountById(claims.sub);

            if (!user) {
                debug("sub not found");
                ctx.throw(new InvalidRequestError("invalid assertion request"));
            }

            ctx.oidc.assertion_grant.sub = user;
        }

        await next();
    };
};
