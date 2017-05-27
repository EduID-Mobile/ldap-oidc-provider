"use strict";

const RedisAdapter   = require("./eduidRedis");
const LdapAdapter    = require("./ldap");

module.exports = function AdapterFactory(cfg) {
    let ldapTypes = Object.keys(cfg.directoryOrganisation);

    return function (name) {
        if (name === "ClientCredentials") {
            // use the same configuration for client and ClientCredentials adapters
            name = "Client";
        }

        if (ldapTypes.indexOf(name) >= 0) {
            // new LDAP Adapter
            return new LdapAdapter(name, cfg);
        }
        // handle everything else via Redis
        return new RedisAdapter(name, cfg);
    };
};
