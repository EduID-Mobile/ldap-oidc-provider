"use strict";

const LDAPConnection = require("./ldapconnection.js");
const splitLabeledUri = require("../helper/splitLabeledUri");

const connection = {};

LDAPConnection.addAttributeHandler(splitLabeledUri);

module.exports = function LdapManager(settings) {
    const directory = settings.ldap.connection;

    return function (name) {
        if (!connection[name] && directory[name]) {
            connection[name] = new LDAPConnection(directory[name]);
        }
        return connection[name];
    };
};
