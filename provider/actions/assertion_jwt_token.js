"use strict";

const debug = require("debug")("ldap-oidc:jwt-assertion");

module.exports = function jwtAssertionGrantTypeFactory(provider) {

    return async function assertionJWTGrantType(ctx, next) {
        // FIXME Dummy always approves
        debug("%O", ctx);

        await next();
    };

    // return compose([
    //     parseBody,
    //     getParams,
    //     rejectDupes
    // ]);
};
