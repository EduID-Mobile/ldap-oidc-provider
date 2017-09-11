"use strict";

const debug = require("debug")("ldap-oidc:jwt-assertion");
// const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");

module.exports = function factory() { // eslint-disable-line
    return async function startSession(ctx, next) {
        debug("start session (disabled)");
        // assertions are not tied to sessions. Instead they should use the
        // rfc7009 revocation endpoint.

        await next();
    };
};
