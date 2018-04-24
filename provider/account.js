"use strict";

// This module contains the Adapter for the account information

/**
 * @class Account
 *
 * The Account class handles the account information from the directory.
 */

class Account {
    constructor(userClaims, userid) {
        this.userClaims = userClaims;
        this.accountId = userid;
    }

    /**
     * Returns the OIDC claims for the id-token.
     *
     * This function is used by oidc-provider.
     * The claims method transposes the LDAP object into an id-token object.
     * If this function returns null, no user is set.
     */
    claims() {
        return this.userClaims;
    }
}

module.exports = Account;
