"use strict";
const ld = require("lodash");
const debug = require("debug")("ldap-oidc:jwt-assertion");

const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");
const JWT = require("oidc-provider/lib/helpers/jwt");

const compose = require("koa-compose");

module.exports = function jwtAssertionGrantTypeFactory(provider) {
    const AccessToken = provider.AccessToken;

    return compose([
        async function(ctx, next) {
            debug("parameter check");

            const {params} = ctx.oidc;
            const missing = ld.difference(["assertion", "scope"], ld.keys(ld.omitBy(params, ld.isUndefined)));

            if (!ld.isEmpty(missing)) {
                debug("scope or assertion is missing");
                debug("%O", params);
                ctx.throw(new InvalidRequestError(`missing required parameter(s) ${missing.join(",")}`));
            }
            await next();
        },
        async function(ctx, next) {
            debug("scope validation");

            const {params} = ctx.oidc;
            const scopes = params.scope.split(" ");

            if (!scopes.includes("openid")) {
                debug("openid scope is missing");
                ctx.throw(new InvalidRequestError("openid is required scope"));
            }

            await next();
        },
        async function assertionJWTGrantType(ctx, next) {
            debug("assertion handling");
            await next();
        },
        async function grantAccessToken(ctx, next) {
            debug("grant access token");
            const at = new AccessToken({
                accountId: "foo",
                clientId: ctx.oidc.client.clientId,
                grantId: ctx.oidc.uuid,
            });

            const accessToken = await at.save();
            const expiresIn = AccessToken.expiresIn;

            ctx.body = {
                access_token: accessToken,
                expires_in: expiresIn,
                token_type: "Bearer",
            };

            await next();
        },
        async function debugVerifyContext(ctx, next) {
            debug("verify context");
            debug("%O", ctx);
            await next();
        }
    ]);
};
