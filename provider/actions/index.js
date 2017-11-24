"use strict";

const debug = require("debug")("ldap-oidc:grant-type-factory");

module.exports = function grantTypeFactory(grant_type_handler, settings) {
    debug(`init grant type ${grant_type_handler}`);
    const factory = require(`./${grant_type_handler}`);

    return factory(settings);
};
