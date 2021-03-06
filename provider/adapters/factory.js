"use strict";

const Debug = require("debug");
const debug = require("debug")("ldap-oidc:adapter-factory");
const RedisAdapter   = require("./eduidRedis");
const LdapAdapter    = require("./ldap");
const MemoryAdapter  = require("./memory");
const getMapping = require("../mapping");

const LdapManager = require("./ldapmanager");

module.exports = function AdapterFactory(cfg) {
    const ldapTypes = cfg.ldap && cfg.ldap.organization ? Object.keys(cfg.ldap.organization) : [];
    const findConnection = LdapManager(cfg);

    return function getAdapter(name) {
        debug(`get adapter for ${name}`);

        if (name === "ClientCredentials") {
            // use the same configuration for client and ClientCredentials adapters
            name = "Client";
        }

        if (ldapTypes.indexOf(name) >= 0) {
            debug("handle via LDAP");
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
            cfg.memory_db.organization.indexOf(name) >= 0) {
            // memory_db is for testing only
            debug("handle via memory");
            return new MemoryAdapter(name);
        }

        // handle everything else via Redis
        debug(`handle ${name} via redis`);
        return new RedisAdapter(name, cfg);
    };
};
