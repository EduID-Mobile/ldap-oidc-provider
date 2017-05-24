"use strict";

const RedisAdapter   = require("./adapters/eduidRedis.js");
const LdapAdapter    = require("./adapters/ldap.js");
const cfg = require("../eduid_settings");

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
