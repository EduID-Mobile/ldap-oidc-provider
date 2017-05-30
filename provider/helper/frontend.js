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

    router.get("/interaction/:grant", async (ctxt, next) => {
        settings.log("call get interaction grant route");
        const cookie = provider.interactionDetails(ctxt.req);
        const client = await provider.Client.find(cookie.params.client_id);

        settings.log("client found");

        if (cookie.interaction.error === "login_required") {
            settings.log("core interaction grant: login required");
            await ctxt.render("login", {
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
            await ctxt.render("interaction", {
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

        await next();
    });

    const body = new bodyParser();
    // const body = bodyParser();
    // const body = bodyParser;

    router.post("/interaction/:grant/confirm", body, async (ctxt, next) => {
        const cookie = provider.interactionDetails(ctxt.req);
        const adapter = settings.config.adapter("Interaction");

        settings.log("call post interaction grant confirm route");

        let result = await adapter.find(cookie.uuid);

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

        provider.interactionFinished(ctxt.req, ctxt.res, result);
        settings.log("interaction completed, continue");
        await next();
    });

    router.post("/interaction/:grant/login", body, async (ctxt, next) => {
        settings.log("call post interaction grant login route");
        const cookie = provider.interactionDetails(ctxt.req);
        const client = await provider.Client.find(cookie.params.client_id);

        const account = await settings.accountByLogin(ctxt.request.body.login,
                                ctxt.request.body.password);

        if (!account.accountId) {
            // login failed
            settings.log("login failed, render login view");
            await ctxt.render("login", {
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
                    remember: !!ctxt.request.body.remember,
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
            await ctxt.render("interaction", {
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
            await next();

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
};
