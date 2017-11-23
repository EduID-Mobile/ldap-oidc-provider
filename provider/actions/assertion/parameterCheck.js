"use strict";

const ld = require("lodash");
const debug = require("debug")("ldap-oidc:jwt-assertion-parameter-check");
const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");
// const instance = require("oidc-provider/lib/helpers/weak_cache");

module.exports = function factory(provider) { // eslint-disable-line
    return async function parameterCheck(ctx, next) {
        debug("parameter check");

        const { params } = ctx.oidc;
        const missing = ld.difference(["assertion", "scope"],
                                      ld.keys(ld.omitBy(params, ld.isUndefined)));

        if (!ld.isEmpty(missing)) {
            debug("scope or assertion is missing");
            // debug("%O", params);
            ctx.throw(new InvalidRequestError(`missing required parameter(s) ${missing.join(",")}`));
        }

        ctx.oidc.assertion_grant = {};

        // handle the scope correctly
        ctx.oidc.assertion_grant.scope = params.scope.split(" ");

        await next();
    };
};
