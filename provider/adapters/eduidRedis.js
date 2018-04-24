"use strict";

// The redis adapter are used for short living information.
// e.g. "Session", "AccessToken", "AuthorizationCode", "RefreshToken",
// "InitialAccessToken", "RegistrationAccessToken"

// Additionally, we use an internal Interaction adapter for passing the partly
// results between the interaction steps

// This infomration does not change very often.

const Redis = require("ioredis"); // eslint-disable-line import/no-unresolved
const _ = require("lodash"); // its OK, because node-oidc-provider uses LD alot

// add all classes here that have deep object structures, so we need to
// JSON process them when setting or getting them from redis.
const DumpObjectClasses = [
    "Client",
    "Session",
    "Interaction",
    "ConfirmationKeys"
];

function grantKeyFor(id) {
    return `grant:${id}`;
}

class RedisAdapter {
    constructor(name, source, config) {
        this.expose = () => {}; // would be used for debug

        this.name   = name;
        this.client = source;

        // This is a list of objects that need special treatment
        // (if no redisJSON is installed) -- which is currently unsupported
        if (DumpObjectClasses.indexOf(name) >= 0) {
            this.dump = true;
        }
    }

    key(id) {
        return `${this.name}:${id}`;
    }

    async destroy(id) {
        this.expose(`redis destroy ${id}`);

        const key = this.key(id);

        const grantId = await this.client.hget(key, "grantId");
        const tokens = await this.client.lrange(grantKeyFor(grantId), 0, -1);

        await Promise.all(_.map(tokens, token => this.client.del(token)));
        this.client.del(key);
    }

    consume(id) {
        this.expose(`redis consume ${id}`);

        return this.client.hset(this.key(id), "consumed", Math.floor(Date.now() / 1000));
    }

    async find(id) {
        this.expose(`redis find ${id}`);

        let data = await this.client.hgetall(this.key(id));

        if (_.isEmpty(data)) {
            this.expose("redis find: not found");

            data = {destroyed: true};
        }
        else if (data.dump !== undefined) {
            this.expose("redis find: json data");

            return JSON.parse(data.dump);
        }
        this.expose(`redis find: return ${id}`);

        return data;
    }

    upsert(id, payload, expiresIn) {
        this.expose(`redis upsert ${id}`);

        const key = this.key(id);
        let toStore = payload;

    // Clients are not simple objects where value is always a string
    // redis does only allow string values =>
    // work around it to keep the adapter interface simple
        if (this.dump) {
            toStore = { dump: JSON.stringify(payload) };
        }

        const multi = this.client.multi();

        multi.hmset(key, toStore);

        if (expiresIn) {
            multi.expire(key, expiresIn);
        }

        if (toStore.grantId) {
            const grantKey = grantKeyFor(toStore.grantId);

            multi.rpush(grantKey, key);
        }

        return multi.exec();
    }
}

function setConnection(config) {
  return new Redis(config.url, {
      keyPrefix: `${config.prefix}:`
  });
};

module.exports = RedisAdapter;
module.exports.connection = setConnection;
