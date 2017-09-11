"use strict";

module.exports = function grantTypeFactory(grant_type_handler, settings) {
    const factory = require(`./${grant_type_handler}`);

    return factory(settings);
};
