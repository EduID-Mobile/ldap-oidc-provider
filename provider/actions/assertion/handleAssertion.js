"use strict";

const debug = require("debug")("ldap-oidc:jwt-assertion");
const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");

module.exports = function factory(provider, settings) { // eslint-disable-line
    return async function handleAssertion(ctx, next) {
        debug("handle assertion");

        debug("%O", ctx.oidc.assertion_grant.payload);

    // we will link the middleware for different assertions
    // process ctx.oidc.assertion_grant.body
    // const account = ctx.oidc.assertion_grant.body.sub;

    // the assertion middleware should work as following:
    // * run all validators
        const body = ctx.oidc.assertion_grant.body;

        // await settings.getAssertionValidators(Object.keys(body))(ctx, next);
        await next();
    };
};
