"use strict";

const debug = require("debug")("ldap-oidc:jwt-assertion");
const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");
const instance = require("oidc-provider/lib/helpers/weak_cache");

const JWT = require("oidc-provider/lib/helpers/jwt");

module.exports = function factory(provider) {
    return async function decryptAssertion(ctx, next) {
        debug("decrypt assertion");
        const { params } = ctx.oidc;

        if (params.assertion.split(".").length === 5) {
            // decrypt using the provider's key store
            try {
                debug("Provider Keystore: %O", instance(provider).keystore );
                const envelope = await JWT.decrypt(params.assertion, instance(provider).keystore);

                ctx.oidc.assertion_grant.payload = envelope.payload.toString();
                // debug("decrypted payload:");
                // debug(envelope.payload.toString().split(".").length);
            }
            catch (err) {
                debug("failed to decrypt assertion");
                //debug(err);
                // FIXME verify error
                ctx.throw(new InvalidRequestError("invalid assertion audience"));
            }
        }
        else {
            debug("received unencrypted assertion");
            ctx.oidc.assertion_grant.payload = params.assertion;
            // ctx.throw(new InvalidRequestError("unencrypted assertion not accepted"));
        }

        await next();
    };
};
