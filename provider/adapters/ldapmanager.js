"use strict";

const Settings = require("../../configuration/settings.js");
const LDAPConnection = require("./ldapconnection.js");

const connection = {};

module.exports = function findLdapConnection(name) {
    if (name !== "redis" && !connection[name] && Settings.directory[name]) {
        connection[name] = new LDAPConnection(Settings.directory[name]);
    }
    return connection[name];
};
