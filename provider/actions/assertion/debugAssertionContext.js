"use strict";

const debug = require("debug")("ldap-oidc:jwt-assertion");

module.exports = function factory(provider) { // eslint-disable-line
    return async function debugAssertionContext(ctx, next) {
        debug("verify context");
        debug("%O", ctx);
        await next();
    };
};
