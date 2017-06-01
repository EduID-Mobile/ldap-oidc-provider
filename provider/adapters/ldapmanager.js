"use strict";

const LDAPConnection = require("./ldapconnection.js");
const splitLabeledUri = require("../helper/splitLabeledUri");

const connection = {};

LDAPConnection.addAttributeHandler(splitLabeledUri);

module.exports = async function findLdapConnection(name, settings) {
    if (!connection[name] && settings.directory[name]) {
        connection[name] = new LDAPConnection(settings.directory[name]);
        await connection[name].connect();
    }
    return connection[name];
};
