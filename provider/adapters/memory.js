"use strict";
/**
 * MemoryAdapter stolen from node-oidc-provider.
 * extended by findLogin() and bindLogin()
 */
const debug = require("debug")("ldap-oidc:memory_db");
const LRU = require("lru-cache");
const epochTime = require("oidc-provider/lib/helpers/epoch_time");

const storage = new LRU({});

function grantKeyFor(id) {
    return `grant:${id}`;
}

class MemoryAdapter {
    constructor(name) {
        this.name = name;
    }

    key(id) {
        return `${this.name}:${id}`;
    }

    destroy(id) {
        const key = this.key(id);
        const grantId = storage.get(key) && storage.get(key).grantId;

        storage.del(key);

        if (grantId) {
            const grantKey = grantKeyFor(grantId);

            storage.get(grantKey).forEach(token => storage.del(token));
        }

        return Promise.resolve();
    }

    consume(id) {
        storage.get(this.key(id)).consumed = epochTime();
        return Promise.resolve();
    }

    async findByKey(value, key) {
        if (!(key && value && key.length && value.length)) {
            throw new Error("Missing Key or Value");
        }
        return [storage.values().find((object) => object[key] === value)];
    }

    async findByLogin(login) {
        return this.findByKey(login, "login");
    }

    async findAndBind(login, credentials) {
        debug("find and bind");
        return [storage.values().find((object) => object["login"] === login && object["password"] === credentials)];
    }

    async find(id) {
        return storage.get(this.key(id));
    }

    upsert(id, payload, expiresIn) {
        const key = this.key(id);

        const { grantId } = payload;

        if (grantId) {
            const grantKey = grantKeyFor(grantId);
            const grant = storage.get(grantKey);

            if (!grant) {
                storage.set(grantKey, [key]);
            }
            else {
                grant.push(key);
            }
        }

        storage.set(key, payload, expiresIn * 1000);

        return Promise.resolve();
    }

    static connect(provider) { // eslint-disable-line no-unused-vars
    // noop
    }
}

module.exports = MemoryAdapter;
