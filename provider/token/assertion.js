"use strict";

/**
 * Implementation of a jwt bearer assertion
 */
var jose = require("node-jose");

const grant_type = "urn:ietf:params:oauth:grant-type:jwt-bearer";

function assertionGrantTypeFactory(providerInstance) {
    return function *assertionGrantType(next) {
        // grab the user name and password
        const assertion = this.oidc.params.assertion;

        // we use a JWT
        // TODO
        // an assertion token is a JWE for the provider.
        // it holds a JWS signed by a client that has a valid key in our
        // data store.
        const AssertionToken = providerInstance.AssertionToken;



        if (this.oidc.params.username === "foo" && this.oidc.params.password === "bar") {
            const AccessToken = providerInstance.AccessToken;
            const at = new AccessToken({
                accountId: "foo",
                clientId: this.oidc.client.clientId,
                grantId: this.oidc.uuid,
            });

            const accessToken = yield at.save();
            const tokenType = "Bearer";
            const expiresIn = AccessToken.expiresIn;

            this.body = {
                access_token: accessToken,
                expires_in: expiresIn,
                token_type: tokenType,
            };
        }
        else {
            this.body = {
                error: "invalid_grant",
                error_description: "invalid credentials provided",
            };
            this.status = 400;
        }

        yield next;
    };
}
