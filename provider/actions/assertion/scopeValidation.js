"use strict";

const debug = require("debug")("ldap-oidc:jwt-assertion-scope-validation");
const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");

module.exports = function factory(provider) { // eslint-disable-line
    return async function scopeValidation(ctx, next) {
        debug("scope validation");

        const {params} = ctx.oidc;

        ctx.oidc.assertion_grant.scopes = params.scope.split(" ");

        if (!ctx.oidc.assertion_grant.scopes.includes("openid")) {
            debug("openid scope is missing");
            ctx.throw(new InvalidRequestError("openid is required scope"));
        }

        await next();
    };
};
