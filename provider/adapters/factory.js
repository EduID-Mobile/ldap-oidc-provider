"use strict";

const RedisAdapter   = require("./eduidRedis");
const LdapAdapter    = require("./ldap");
const getMapping = require("../mapping");

const LdapManager = require("./ldapmanager");

module.exports = function AdapterFactory(cfg) {
    const ldapTypes = Object.keys(cfg.directoryOrganisation);
    const findConnection = LdapManager(cfg);

    return function getAdapter(name) {
        if (name === "ClientCredentials") {
            // use the same configuration for client and ClientCredentials adapters
            name = "Client";
        }

        if (ldapTypes.indexOf(name) >= 0) {
            // new LDAP Adapter
            const adapter = new LdapAdapter(name);

            const org = cfg.directoryOrganisation[name];

            adapter.mapping(getMapping(name));
            adapter.organization(org);
            adapter.connection(findConnection(org.source));

            return adapter;
        }

        // handle everything else via Redis
        return new RedisAdapter(name, cfg);
    };
};
