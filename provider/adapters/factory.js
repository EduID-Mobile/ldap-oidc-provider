"use strict";

const RedisAdapter   = require("./eduidRedis");
const LdapAdapter    = require("./ldap");
const cfg = require("../../configuration/settings");

module.exports = function AdapterFactory() {
    let ldapTypes = Object.keys(cfg.directoryOrganisation);

    return function (name) {
        if (ldapTypes.indexOf(name) >= 0) {
            // new LDAP Adapter
            return new LdapAdapter(name);
        }
        // handle everything else via Redis
        return new RedisAdapter(name);
    };
};
