"use strict";

const LDAPConnection = require("./ldapconnection.js");

const connection = {};

module.exports = async function findLdapConnection(name, settings) {
    if (!connection[name] && settings.directory[name]) {
        connection[name] = new LDAPConnection(settings.directory[name]);
    }
    return connection[name];
};
