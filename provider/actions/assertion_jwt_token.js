"use strict";

const compose = require("koa-compose");
const stack = require("./assertion/");

// we should have a factory for the settings, too.
module.exports = function settingsfactory(settings) {
    return function jwtAssertionGrantTypeFactory(provider) {
        return compose([
            stack.parameterCheck(provider),
            stack.scopeValidation(provider),
            stack.decryptAssertion(provider),
            stack.verifyJWT(),
            stack.validateJWT(provider, settings),
            stack.authenticate(provider, settings),
            stack.authorize(provider, settings),
            stack.loadSub(provider, settings),
            // stack.startSession(provider, settings),
            //stack.handleAssertion(provider),
            stack.grantAccessToken(provider),
            stack.debugAssertionContext(provider)
        ]);
    };
};
