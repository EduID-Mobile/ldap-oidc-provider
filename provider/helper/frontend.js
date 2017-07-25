"use strict";

/**
 * This file contains the interaction handling definition.
 *
 * the frontend function sets up the koa routes for the interactive components.
 */
const debug = require("debug")("ldap-oidc");
const path = require("path");

const bodyParser = require("koa-body");
const querystring = require("querystring");
const Router = require("koa-router");
const render = require("koa-ejs");

module.exports = function frontend(provider, settings) {
    let viewPath = path.join(path.dirname(__dirname), "views");
    let layoutfile = "_layout";

    if ("views" in settings.customization) {
        if ("path" in settings.customization.views) {
            if (path.isAbsolute(settings.customization.views.path)) {
                viewPath = settings.customization.views.path;
            }
            else {
                viewPath = path.join(settings.referencePath,
                                     settings.customization.views.path);
            }
        }
        if ("layout" in settings.customization.views) {
            layoutfile = settings.customization.views.layout;
        }
    }

    render(provider.app, {
        cache: false,
        layout: layoutfile,
        root: viewPath,
    });

    // more extra keys? where are they used?
    provider.app.keys = settings.keys;

    provider.app.proxy = true;

    const router = new Router();
    // const router = Router;

    router.get("/interaction/:grant", async (ctx, next) => {
        const cookie = await provider.interactionDetails(ctx.req);
        const client = await provider.Client.find(cookie.params.client_id);

        debug(JSON.stringify(cookie.params));

        if (cookie.interaction.error === "login_required") {
            await ctx.render("login", {
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
            await ctx.render("interaction", {
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
        const cookie = await provider.interactionDetails(ctxt.req);
        const adapter = settings.config.adapter("Interaction");

        let result = await adapter.find(cookie.uuid);

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
        await next();
    });

    router.post("/interaction/:grant/login", body, async (ctxt, next) => {
        const cookie = await provider.interactionDetails(ctxt.req);
        const client = await provider.Client.find(cookie.params.client_id);

        const account = await settings.accountByLogin(ctxt.request.body.login,
                                                      ctxt.request.body.password);

        if (!(account && account.accountId)) {
            // login failed
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
    return provider;
};
