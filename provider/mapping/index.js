"use strict";

const userMapping = require("./user.js");
const clientMapping = require("./client.js");

module.exports = function getMapping(name) {
    name = name.toLowerCase();

    if (["user", "account"].indexOf(name) >= 0) {
        return userMapping;
    }

    if (["client", "clientcredentials"].indexOf(name) >= 0) {
        return clientMapping;
    }

    return null;
};
