"use strict";

module.exports = function grantTypeFactory(grant_type_handler) {
    return require(`./${grant_type_handler}`);
};
