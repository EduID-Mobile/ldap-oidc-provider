"use strict";

module.exports = function jwtAssertionGrantTypeFactory(provider) {
    return async function passwordJWTGrantType(ctx, next) {
        // FIXME Dummy always approves
        await next();
    };

    // return compose([
    //     parseBody,
    //     getParams,
    //     rejectDupes
    // ]);
};
