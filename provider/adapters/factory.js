"use strict";

const log = require("debug")("ldap-oidc:adapter-factory");
const RedisAdapter   = require("./eduidRedis");
const LdapAdapter    = require("./ldap");
const MemoryAdapter  = require("oidc-provider/lib/adapters/memory_adapter.js");
const getMapping = require("../mapping");

const LdapManager = require("./ldapmanager");

module.exports = function AdapterFactory(cfg) {
    const ldapTypes = cfg.ldap && cfg.ldap.organization ? Object.keys(cfg.ldap.organization) : {};
    const findConnection = LdapManager(cfg);

    return function getAdapter(name) {
        log(`get adapter for ${name}`);

        if (name === "ClientCredentials") {
            // use the same configuration for client and ClientCredentials adapters
            name = "Client";
        }

        if (ldapTypes.indexOf(name) >= 0) {
            log("handle via LDAP");
            const adapter = new LdapAdapter(name);

            const org = cfg.ldap.organization[name];

            const mapping = cfg.mapping[name.toLowerCase()] || getMapping(name);

            adapter.transform(mapping);
            adapter.organization(org);
            adapter.connection(findConnection(org.source));

            return adapter;
        }

        if (cfg.memory_db &&
            cfg.memory_db.organization &&
            cfg.memory_db.configuration.indexOf(name)) {
            // memory_db is for testing only
            return new MemoryAdapter(name);
        }

        // handle everything else via Redis
        { log("handle via redis"); }
        return new RedisAdapter(name, cfg);
    };
};
