"use strict";

/**
 * This file contains the interaction handling definition.
 *
 * the frontend function sets up the koa routes for the interactive components.
 */

const path = require("path");

const bodyParser = require("koa-body");
const querystring = require("querystring");
const Router = require("koa-router");
const render = require("koa-ejs");

module.exports = function frontend(provider, settings) {
    settings.log("setup front end");

    render(provider.app, {
        cache: false,
        layout: "_layout",
        root: path.join(path.dirname(__dirname), "views"),
    });

    // more extra keys? where are they used?
    provider.app.keys = settings.keys;

    provider.app.proxy = true;

    const router = new Router();
    // const router = Router;

    settings.log("add get interaction grant route");

    router.get("/interaction/:grant", function* renderInteraction(next) {
        settings.log("call get interaction grant route");
        const cookie = provider.interactionDetails(this.req);
        const client = yield provider.Client.find(cookie.params.client_id);

        settings.log("client found");

        if (cookie.interaction.error === "login_required") {
            settings.log("core interaction grant: login required");
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
                baseuri: settings.urls.interaction,
            });
        }
        else {
            settings.log("core interaction grant: confirmation required");
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
                baseuri: settings.urls.interaction,
            });
        }

        yield next;
    });

    const body = new bodyParser();
    // const body = bodyParser();
    // const body = bodyParser;

    settings.log("add post interaction grant confirm route");
    router.post("/interaction/:grant/confirm", body, function *handleConfirmation(next) {
        const cookie = provider.interactionDetails(this.req);
        const adapter = settings.config.adapter("Interaction");

        settings.log("call post interaction grant confirm route");

        let result = yield adapter.find(cookie.uuid);

        settings.log("found authorization session");

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
        settings.log("interaction completed, continue");
        yield next;
    });

    settings.log("add post interaction grant login route");

    router.post("/interaction/:grant/login", body, function *handleLogin(next) {
        const account = yield settings.accountByLogin(this.request.body.login,
                                                      this.request.body.password);

        const cookie = provider.interactionDetails(this.req);
        const client = yield provider.Client.find(cookie.params.client_id);

        settings.log("call post interaction grant login route");

        if (!account.accountId) {
            // login failed
            settings.log("login failed, render login view");
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
                baseuri: settings.urls.interaction,
            });
        }
        else {
            // login succeeded
            // store the account info
            settings.log("login succeeded");
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
            settings.log("render confirmation view");
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
                baseuri: settings.urls.interaction,
            });

            settings.log("interaction completed, continue");
            yield next;

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
        }
    });

    provider.app.use(router.routes());
    settings.log("front end ready");
    return Promise.resolve();
};
