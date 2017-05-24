"use strict";

/**
 * This file initializes the provider and tears up the system.
 */
const Provider = require("oidc-provider");
const path = require("path");
const _ = require("lodash");
const bodyParser = require("koa-body");
const querystring = require("querystring");
const Router = require("koa-router");
const render = require("koa-ejs");

const EduIdConfigurator = require("./configurator.js");

// the defaults are the unaltered settings as provided by oidc-provider.
const eduIdDefaults = require("./settings.js");

// the cfg contains the configuration for the eduid frontend of oidc-provider.
const eduIdConfig   = require("./eduid_settings.js");

let settings = new EduIdConfigurator(eduIdConfig, eduIdDefaults);

const port   = settings.port || 3000;

// via LDAP Roles
// the clients MUST be dynamic
const clients = []; // returns nothing
// const clients = eduIdDefaults.clients; // returns nothing

const provider = new Provider(settings.issuerUrl, settings.config);

// keystore and integrity refer to our local store
// actually there is only one key for integrity and encryption
// provider.initialize(settings.getKeystores());
provider.initialize({
    clients,
    keystore: { keys: settings.certificates },   // TODO use proxy
    integrity: { keys: settings.integrityKeys }, // TODO use proxy
}).then(() => {
    render(provider.app, {
        cache: false,
        layout: "_layout",
        root: path.join(__dirname, "views"),
    });

    // more extra keys? where are they used?
    provider.app.keys = ["some secret key", "and also the old one"];

    provider.app.proxy = true;

    _.set(settings.config, "cookies.short.secure", true);
    _.set(settings.config, "cookies.long.secure", true);

    // The OIDC provider sits normally behind a SSL termination. While
    // this is recognised by app.proxy = true, we simply ignore the case
    // that people may arrive without encryption, because they should not.
    //
    // provider.app.middleware.unshift(function* ensureSecure(next) {
    //     if (this.secure) {
    //         yield next;
    //     }
    //     else if (this.method === "GET" || this.method === "HEAD") {
    //         this.redirect(this.href.replace(/^http:\/\//i, "https://"));
    //     }
    //     else {
    //         this.body = {
    //             error: "invalid_request",
    //             error_description: "do yourself a favor and use https",
    //         };
    //         this.status = 400;
    //     }
    // });

    // const router = new Router();
    const router = new Router();
    // const router = Router;

    router.get("/interaction/:grant", function* renderInteraction(next) {
        const cookie = provider.interactionDetails(this.req);
        const client = yield provider.Client.find(cookie.params.client_id);

        if (cookie.interaction.error === "login_required") {
            yield this.render("login", {
                client,
                cookie,
                title: "Sign-in",
                debug: querystring.stringify(cookie.params, ",<br/>", " = ", {
                    encodeURIComponent: value => value,
                }),
                interaction: querystring.stringify(cookie.interaction, ",<br/>", " = ", {
                    encodeURIComponent: value => value,
                }),
                baseuri: eduIdConfig.urls.interaction,
            });
        }
        else {
            yield this.render("interaction", {
                client,
                cookie,
                title: "Authorize",
                debug: querystring.stringify(cookie.params, ",<br/>", " = ", {
                    encodeURIComponent: value => value,
                }),
                interaction: querystring.stringify(cookie.interaction, ",<br/>", " = ", {
                    encodeURIComponent: value => value,
                }),
                baseuri: eduIdConfig.urls.interaction,
            });
        }

        yield next;
    });

    const body = new bodyParser();
    // const body = bodyParser();
    // const body = bodyParser;

    router.post("/interaction/:grant/confirm", body, function *handleConfirmation(next) {
        const cookie = provider.interactionDetails(this.req);
        const adapter = settings.config.adapter("Interaction");

        let result = yield adapter.find(cookie.uuid);

        // there is no previous interaction result that we need to expand
        if (!result) {
            result = {};
        }

        result.consent = {};

        const reqScopes = cookie.params.scope.split(" ");

        // only grant the scopes that are consented

        result.consent.scope = reqScopes.join(" ");
        // consume the interaction cache
        adapter.destroy(cookie.uuid);

        provider.interactionFinished(this.req, this.res, result);
        yield next;
    });

    router.post("/interaction/:grant/login", body, function *handleLogin(next) {
        const account = yield settings.accountByLogin(this.request.body.login,
                                                      this.request.body.password);

        const cookie = provider.interactionDetails(this.req);
        const client = yield provider.Client.find(cookie.params.client_id);

        if (!account.accountId) {
            // login failed
            yield this.render("login", {
                client,
                cookie,
                title: "Sign-in",
                debug: querystring.stringify(cookie.params, ",<br/>", " = ", {
                    encodeURIComponent: value => value,
                }),
                interaction: querystring.stringify(cookie.interaction, ",<br/>", " = ", {
                    encodeURIComponent: value => value,
                }),
                baseuri: eduIdConfig.urls.interaction,
            });
        }
        else {
            // login succeeded
            // store the account info
            const result = {
                login: {
                    account: account.accountId,
                    acr: settings.getAcr(),
                    amr: ["pwd"],
                    remember: !!this.request.body.remember,
                    ts: Math.floor(Date.now() / 1000),
                },
            };

            const adapter = settings.config.adapter("Interaction");

            adapter.upsert(cookie.uuid, result);

            // now we need to verify whether the user has stored a confirmation.

            // TODO check whether the user already consented using the service
            // only if NO consent or an explicity reset request has been made,
            // we show the consent interaction

            yield this.render("interaction", {
                client,
                cookie,
                title: "Authorize",
                debug: querystring.stringify(cookie.params, ",<br/>", " = ", {
                    encodeURIComponent: value => value,
                }),
                interaction: querystring.stringify(cookie.interaction, ",<br/>", " = ", {
                    encodeURIComponent: value => value,
                }),
                baseuri: eduIdConfig.urls.interaction,
            });

            yield next;
        }
            // we should consider the defaultACR it is set for the client
            // const cookie = provider.interactionDetails(this.req);
            // const client = yield provider.Client.find(cookie.params.client_id);

            // const result = {
            //     login: {
            //         account: account.accountId,
            //         acr: settings.getAcr(),
            //         amr: ["pwd"],
            //         remember: !!this.request.body.remember,
            //         ts: Math.floor(Date.now() / 1000),
            //     },
            //     consent: {},
            // };
            //
            // provider.interactionFinished(this.req, this.res, result);
        // }
    });

    provider.app.use(router.routes());
})
    .then(() => provider.app.listen(port))
    .catch((err) => {
        console.error(err); // eslint-disable-line no-console
        process.exit(1);
    });
