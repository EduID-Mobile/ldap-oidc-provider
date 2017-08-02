"use strict";

const ld = require("lodash");
const debug = require("debug")("ldap-oidc:jwt-assertion");

const { InvalidRequestError } = require("oidc-provider/lib/helpers/errors");

const instance = require("oidc-provider/lib/helpers/weak_cache");
const JWT = require("oidc-provider/lib/helpers/jwt");

const compose = require("koa-compose");

const { JWK: { asKeyStore } } = require("node-jose");

module.exports = function jwtAssertionGrantTypeFactory(provider) {
    const AccessToken = provider.AccessToken;

    return compose([
        async function(ctx, next) {
            debug("parameter check");

            const {params} = ctx.oidc;
            const missing = ld.difference(["assertion", "scope"], ld.keys(ld.omitBy(params, ld.isUndefined)));

            if (!ld.isEmpty(missing)) {
                debug("scope or assertion is missing");
                // debug("%O", params);
                ctx.throw(new InvalidRequestError(`missing required parameter(s) ${missing.join(",")}`));
            }

            ctx.oidc.assertion_grant = {};

            await next();
        },
        async function(ctx, next) {
            debug("scope validation");

            const {params} = ctx.oidc;

            ctx.oidc.assertion_grant.scopes = params.scope.split(" ");

            if (!ctx.oidc.assertion_grant.scopes.includes("openid")) {
                debug("openid scope is missing");
                ctx.throw(new InvalidRequestError("openid is required scope"));
            }

            await next();
        },
        async function decryptAssertion(ctx, next) {
            debug("decrypt assertion");
            const {params} = ctx.oidc;

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
                // ctx.throw(new InvalidRequestError("unencrypted assertion not accepted"));
                debug("received unencrypted assertion");
                ctx.oidc.assertion_grant.payload = params.assertion;
            }

            await next();
        },
        async function verifyAssertionPayload(ctx, next) {
            debug("verify assertion payload");
            if (ctx.oidc.assertion_grant.payload.split(".").length !== 3) {
                debug("unsupported assertion payload");
                ctx.throw(new InvalidRequestError("invalid assertion provided"));
            }
            // debug("good assertion payload");

            const jwt = ctx.oidc.assertion_grant.payload;
            // get the issuer jwk

            // debug(jwt);

            let assIssuer;

            try {
                const decoded = await JWT.decode(jwt);

                if (!(decoded.payload && decoded.payload.iss)) {
                    debug("missing issuer");
                    ctx.throw(new InvalidRequestError("missing assertion issuer"));
                }

                // debug("jwt decoded ");
                assIssuer = decoded.payload.iss;
                ctx.oidc.assertion_grant.body = decoded.payload;
                ctx.oidc.assertion_grant.issuer = assIssuer;
            }
            catch (err) {
                debug("bad assertion payload");
                debug(err);
                ctx.throw(new InvalidRequestError("bad assertion payload"));
            }

            // issuer is a client id
            const client = await provider.Client.find(String(assIssuer));

            // FIXME the issuer is a bit more complex with a trust agent
            if (!client) {
                debug("assertion client not found");
                ctx.throw(new InvalidRequestError("unknown assertion issuer"));
            }
            // IMPORTANT: need to process the client's keystore before handing
            // it to the verify()-method
            client.jwks = await asKeyStore(client.jwks);

            try {
                // TODO verify audience (despite the package being encrypted
                // for us)
                const isverified = await JWT.verify(jwt, client.jwks);

                if (!isverified) {
                    // debug("not verified");
                    throw "not verified";
                }
            }
            catch (err) {
                debug("verification error");
                debug(err);
                ctx.throw(new InvalidRequestError("assertion issuer mismatch"));
            }

            ctx.oidc.assertion_grant.client = client;

            await next();
        },
        async function handleAssertion(ctx, next) {
            debug("handle assertion");

            debug("%O", ctx.oidc.assertion_grant.body);

            // we will link the middleware for different assertions
            // process ctx.oidc.assertion_grant.body

            await next();
        },
        async function grantAccessToken(ctx, next) {
            // FIXME set all relevant information during the preceeding steps

            debug("grant access token");

            const account = ctx.oidc.assertion_grant.account;

            const at = new AccessToken({
                accountId: account.accountId,
                clientId: ctx.oidc.client.clientId,
                grantId: ctx.oidc.uuid,
                claims: ctx.oidc.assertion_grant.claims,
                scope: ctx.oidc.assertion_grant.scopes.join(" ")
            });

            const accessToken = await at.save();
            const expiresIn = AccessToken.expiresIn;

            let refreshToken;
            const grantPresent = ctx.oidc.client.grantTypes.includes("refresh_token");
            const shouldIssue = instance(provider).configuration("features.alwaysIssueRefresh") || ctx.oidc.assertion_grant.scopes.includes("offline_access");

            if (grantPresent && shouldIssue) {
                const rt = new RefreshToken({
                    accountId: account.accountId,
                  // FIXME
                    acr: ctx.oidc.assertion_grant.acr,
                    amr: ctx.oidc.assertion_grant.amr,
                    authTime: ctx.oidc.assertion_grant.authTime,
                    claims: ctx.oidc.assertion_grant.claims,
                    clientId: ctx.oidc.client.clientId,
                    grantId: ctx.oidc.uuid,
                    nonce: ctx.oidc.assertion_grant.nonce,
                    scope: ctx.oidc.assertion_grant.scopes.join(" "),
                });
            }

            // FIXME
            const token = new IdToken(Object.assign({}, await Promise.resolve(account.claims()), {
                acr: ctx.oidc.assertion_grant.acr,
                amr: ctx.oidc.assertion_grant.amr,
                auth_time: ctx.oidc.assertion_grant.authTime,
            }), ctx.oidc.client.sectorIdentifier);

            token.scope =  ctx.oidc.assertion_grant.scopes.join(" ");
            token.mask = get(ctx.oidc.assertion_grant.claims, "id_token", {});

            token.set("nonce", ctx.oidc.assertion_grant.nonce);
            token.set("at_hash", accessToken);
            token.set("rt_hash", refreshToken);
            token.set("sid", ctx.oidc.assertion_grant.sid);

            ctx.body = {
                access_token: accessToken,
                expires_in: expiresIn,
                token_type: "Bearer",
            };

            await next();
        },
        async function issueIdToken(ctx, next) {
            debug("issue id token");

            const token = new IdToken(Object.assign({}, await Promise.resolve(account.claims()), {
                acr: ctx.oidc.assertion_grant.acr,
                amr: ctx.oidc.assertion_grant.amr,
                auth_time: ctx.oidc.assertion_grant.authTime,
            }), ctx.oidc.client.sectorIdentifier);

            token.scope =  ctx.oidc.assertion_grant.scopes.join(" ");
            token.mask = get(ctx.oidc.assertion_grant.claims, "id_token", {});

            token.set("nonce", ctx.oidc.assertion_grant.nonce);
            token.set("at_hash", accessToken);
            token.set("rt_hash", refreshToken);
            token.set("sid", ctx.oidc.assertion_grant.sid);

            await next();
        },
        async function debugAssertionContext(ctx, next) {
            debug("verify context");
            debug("%O", ctx);
            await next();
        }
    ]);
};
