"use strict";

const Debug = require("debug");
const debug = Debug("ldap-oidc:adapter:factory");

const RedisAdapter   = require("oidc-redis-adapter");
const MemoryAdapter  = require("./memory");
const LdapAdapter    = require("oidc-ldap-adapter");

module.exports = function AdapterFactory(sources, configuration) {
  // connection cache
    const Cache = new Map();
    const CCache = new Map();

  // init data sources
    for (let source in sources) {
        debug(`init ${source} with connection type ${sources[source].type}`);
        switch (sources[source].type) {
                case "ldap":
                    CCache.set(source, new LdapAdapter.connection(sources[source]));
                    break;
                case "redis":
                    CCache.set(source, new RedisAdapter.connection(sources[source]));
                    break;
                default:
                    break;
        }
    }

    return function getAdapter(name) {
        if (Cache.has(name)) {
            return Cache.get(name);
        }

        if (configuration[name] &&
        configuration[name].source &&
        CCache.has(configuration[name].source)) {

            debug(`init ${name}`);
            const src = CCache.get(configuration[name].source);
            let adapter;

            switch (sources[configuration[name].source].type) {
                    case "ldap":
                        adapter = new LdapAdapter(name, src, configuration[name].options);
                        break;
                    case "redis":
                        adapter = new RedisAdapter(name, src, configuration[name].options);
                        break;
                    default:
                        adapter = new MemoryAdapter(name);
                        break;
            }

            Cache.set(name, adapter);
        }

        debug("return adapter");
        return Cache.get(name);
    };
};
