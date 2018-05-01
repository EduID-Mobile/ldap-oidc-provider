"use strict";

const Debug = require("debug");
const log = Debug("ldap-oidc:adapter:factory");
const debug = Debug("dev-ldap-oidc:adapter:factory");

const RedisAdapter   = require("oidc-redis-adapter");
const MemoryAdapter  = require("./memory");
const LdapAdapter    = require("oidc-ldap-adapter");

const CCache = new Map();

async function initAdapters(sources) {
    let connection;

    for (let source in sources) {
        debug(`init ${source} with connection type ${sources[source].type}`);
        switch (sources[source].type) {
                case "ldap":
                    try {
                        connection = await LdapAdapter.connection(sources[source]);
                    }
                    catch(err) {
                        log(`ldap failure ${source}: ${err.message}`);
                    }
                    break;
                case "redis":
                    try {
                        connection = RedisAdapter.connection(sources[source]);
                    }
                    catch(err) {
                        log(`redis failure ${source}: ${err.message}`);
                    }
                    break;
                default:
                    break;
        }
        CCache.set(source, connection);
    }
}

module.exports = function AdapterFactory(sources, configuration) {
  // connection cache
    const Cache = new Map();

  // init data sources

    initAdapters(sources).then(() => {});

    return function getAdapter(name) {
        if (Cache.has(name)) {
            return Cache.get(name);
        }

        if (configuration[name] &&
        configuration[name].source &&
        CCache.has(configuration[name].source)) {

            log(`init ${name}`);
            const src = CCache.get(configuration[name].source);
            let adapter;

            switch (sources[configuration[name].source].type) {
                    case "ldap":
                        adapter = new LdapAdapter(name, src, configuration[name]);
                        break;
                    case "redis":
                        adapter = new RedisAdapter(name, src, configuration[name]);
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
