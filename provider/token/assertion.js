"use strict";

/**
 * Implementation of a jwt bearer assertion
 */
const compose = require('koa-compose');
const paramsMiddleware = require('node-oidc-provider/shared/get_params');

const stack = require('../actions/assertion');

const grant_type = "urn:ietf:params:oauth:grant-type:jwt-bearer";


const getParams = paramsMiddleware(["grant_type", "assertion"]]);

function assertionGrantTypeFactory(provider) {
    return compose([
        getParams,
        stack.verifyAssertion(provider),
        stack.checkClient(provider),
    ]);
}
