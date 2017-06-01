"use strict";

const RedisAdapter   = require("./eduidRedis");
const LdapAdapter    = require("./ldap");
const getMapping = require("../mapping");

const findConnection = require("./ldapmanager");

module.exports = function AdapterFactory(cfg) {
    let ldapTypes = Object.keys(cfg.directoryOrganisation);

    return function getAdapter(name) {
        if (name === "ClientCredentials") {
            // use the same configuration for client and ClientCredentials adapters
            name = "Client";
        }

        if (ldapTypes.indexOf(name) >= 0) {
            // new LDAP Adapter
            cfg.log(`init ldap adapter for ${name}`);
            const org = cfg.directoryOrganisation[name];
            const adapter = new LdapAdapter(name);

            adapter.mapping(getMapping(name));
            adapter.connection(findConnection(org.source, cfg));
            adapter.organization(org);

            return adapter;
        }
        // handle everything else via Redis
        cfg.log(`init redis adapter for ${name}`);
        return new RedisAdapter(name, cfg);
    };
};
