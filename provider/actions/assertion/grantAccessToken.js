"use strict";

// TODO Specify session support
// TODO back channel logout flow

/**
 * NOTE 1
 * The TA cannot request specific claims using the claims parameter. Normally,
 * The TA will request the entire claim set.
 *
 * A proxy app cannot request specific claims either because it cannot
 * request anything else than the access and the refresh token.
 *
 * However, a RP may request specific claim sets by extending
 * the scope parameter.
 *
 * Important: A RP may extend the scope to request information to
 * be included into the id_token. An app can only request offline access.
 *
 * Offline access is implied with assertion tokens it the RP supports it.
 *
 * Proxy apps access this feature through the trust agent.
 */

const debug = require("debug")("ldap-oidc:jwt-assertion");
// const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");
// const instance = require("oidc-provider/lib/helpers/weak_cache");

module.exports = function factory(provider) {
    return async function grantAccessToken(ctx, next) {
    // FIXME set all relevant information during the preceeding steps
        debug("grant access token");
        const { AccessToken, IdToken, RefreshToken } = provider;

        const account = ctx.oidc.assertion_grant.sub;

        let refreshToken;
        let accessToken;

        if (!ctx.oidc.assertion_grant.useJwt) {
            const at = new AccessToken({
                accountId: account.accountId, // becomes sub
                clientId: ctx.oidc.client.clientId, // becomes aud
                grantId: ctx.oidc.uuid,             // internal use
                scope: ctx.oidc.params.scope        // scope passed via parameters
            });

            accessToken = await at.save();
        }
        else {
            accessToken = ctx.oidc.assertion_grant.body.x_jwt;
        }

        const expiresIn = AccessToken.expiresIn;
        const nonce = String(Math.random());

        const grantPresent = ctx.oidc.client.grantTypes.includes("refresh_token");

        // offline access is implied with assertions, since no direct interaction
        // is possible.
        // Offline access is only excluded, if the RP does not support it.

        if (grantPresent) {
            const rt = new RefreshToken({
                accountId: account.accountId,
                // acr: ctx.oidc.assertion_grant.acr,
                // amr: ctx.oidc.assertion_grant.amr,
                authTime: ctx.oidc.assertion_grant.authTime,
                claims: ctx.oidc.assertion_grant.claims,
                clientId: ctx.oidc.client.clientId,
                grantId: ctx.oidc.uuid,
                nonce: nonce,
                scope: ctx.oidc.params.scope
            });

            refreshToken = await rt.save();
        }

        // verify that an id token is actually requested. Currently we always issue
        // the id_token

        const token = new IdToken(Object.assign({}, await Promise.resolve(account.claims()), {
            // acr: ctx.oidc.assertion_grant.acr,
            // amr: ctx.oidc.assertion_grant.amr,
            auth_time: ctx.oidc.assertion_grant.authTime,
        }), ctx.oidc.client.sectorIdentifier);

        token.scope = ctx.oidc.assertion_grant.scope.join(" ");

        token.set("nonce", String(Math.random()));
        token.set("at_hash", accessToken);

        // Back channel logout is unclear in many aspects, so sessions are not supported.
        // token.set("sid", ctx.oidc.assertion_grant.sid);

        ctx.body = {
            access_token: accessToken,
            expires_in: expiresIn,
            token_type: "Bearer",
        };

        if (refreshToken) {
            token.set("rt_hash", refreshToken);
            ctx.body.refresh_token = refreshToken;
        }

        if (token) {
            ctx.body.id_token = await token.sign(ctx.oidc.client);
        }

        await next();
    };
};
