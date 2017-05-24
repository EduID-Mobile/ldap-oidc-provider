"use strict";

const Settings = require("../eduid_settings.js");
const LDAPConnection = require("./ldapconnection.js");

const connection = {};

module.exports = function findLdapConnection(name) {
    if (!connection[name] && Settings.directory[name]) {
        connection[name] = new LDAPConnection(Settings.directory[name]);
    }
    return connection[name];
};
