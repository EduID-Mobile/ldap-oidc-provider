"use strict";

/**
 * The LDAP Client Adapter handles the different requests related to the client
 * Information. This covers information for the following adapter types:
 *
 * -   Client
 * -   ClientCredentials
 *
 * Both adapters actually work the same on LDAP, because the client credentials
 * are stored with the Client's Metadata. Given the design of oidc-provider,
 * the adapter will do two requests on the same information.
 */

const getMapping = require("../mapping");
const mapClaims = require("../mapping/map_claims");
const findConnection = require("./ldapmanager");

// these are oidc-provider specific and are not optional for the mapping
const forceArray = [
    "redirect_uris",
    "post_logout_redirect_uris",
    "request_uris",
    "response_types",
    "default_acr_values",
    "grant_types",
    "request_uris"
];

class LdapClientAdapter {

  /**
   *
   * Creates an instance of MyAdapter for an oidc-provider model.
   *
   * @constructor
   * @param {string} name Name of the oidc-provider model. One of "Session", "AccessToken",
   * "AuthorizationCode", "RefreshToken", "ClientCredentials" or "Client", "InitialAccessToken",
   * "RegistrationAccessToken"
   *
   */
    constructor(name, cfg) {
        this.log = cfg.log;
        this.name = name;
        this.org  = cfg.directoryOrganisation[name];
        this.ldap = findConnection(this.org.source, cfg);
        this.mapping = getMapping(name);
    }

    verifyResultSet(result) {
          // intuitively, we would let the promise fail.
          // OIDC-provider requires a resolved Promise to handle the not found
          // promise internally.
          // a rejected Promise will lead that the action handler will run
          // into the generic error handling and yield a 500 error.

        return result && result.length ? result[0] : null;
    }

    transposeAttributes(result) {
        return mapClaims(this.mapping, result, forceArray);
    }

  /**
   * Return previously stored instance of an oidc-client.
   *
   * @return {Promise} Promise fulfilled with either Object (when found and not dropped yet due to
   * expiration) or falsy value when not found anymore. Rejected with error when encountered.
   * @param {string} id Identifier of oidc-provider model
   *
   */
    find(id) {
        // let cid = "cn";

        if (!(this.org.id && this.org.id.length)) {
            return Promise.resolve(null);
        }
        let baseDN = null;

        if (this.org.base) {
            baseDN = this.org.base;
        }

        return this.ldap
            .find(["&", `objectClass=${this.org.class}`, `${this.org.id}=${id}`], baseDN)
            .then(res => this.verifyResultSet(res))
            .then(obj => this.transposeAttributes(obj))
            .catch(err => {
                this.log(`${id} not found ${err.message}`);
                return Promise.reject(err);
            });
    }

    upsert(id, payload, expiresIn) { // eslint-disable-line no-unused-vars
      // noop!
      // dynamic configuration is not supported
        Promise.reject("NotSupported");
    }

    consume(id) { // eslint-disable-line no-unused-vars
      // noop!
      // makes no sense for clients
        Promise.reject("NotSupported");
    }

    destroy(id) { // eslint-disable-line no-unused-vars
      // noop!
      // all eduid services are configured via the federation management and not
      // via dynamic client registration.
        Promise.reject("NotSupported");
    }
}

module.exports = LdapClientAdapter;
