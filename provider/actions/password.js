"use strict";

module.exports = function passwordGrantTypeFactory(provider) {

    return async function passwordGrantType(ctx, next) {
        // FIXME EXAMPLE CODE STOLEN FROM node-oidc-provider
        if (ctx.oidc.params.username === "foo" && ctx.oidc.params.password === "bar") {
            const AccessToken = provider.AccessToken;
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
        }
        else {
            ctx.body = {
                error: "invalid_grant",
                error_description: "invalid credentials provided",
            };
            ctx.status = 400;
        }

        await next();
    };
};
