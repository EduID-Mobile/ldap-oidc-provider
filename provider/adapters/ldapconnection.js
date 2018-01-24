"use strict";

const ldap     = require("ldapjs");

const LdapErrors = {
    options: "NoLDAPOptionsProvided",
    url: "NoLDAPServerOption",
    port: "NoLDAPPortOption",
    password: "NoLDAPPassword",
    base: "NoLDAPBaseDN",
    bind: "NoLDAPBindDN",
    connection: "NoConnection",
    notFound: "NotFound"
};


const AttrTransformators = [];

/**
 * The LDAPAdapter is a support class to access an LDAP directory for
 * the OIDC provider.
 *
 * The directory is expected to provide user information, service information,
 * and authenticate users.
 *
 * The LDAPAdapter handles two connection types:
 * - persistent root connection
 * - singleton authentication connection
 *
 * The root connection is used for all requests of the adapter that
 * need to query the directory. This includes verifying user accounts as well as
 * identifying the cryptographic keys of services.
 *
 * The LDAPAdapter allows a Array-based query syntax that resembles the
 * brace-style syntax of LDAP.
 * A few rules are to be considered.
 * - keep Literals as is.
 * - braces become Arrays.
 * - braces around literals are optional
 * - empty literals are ignored.
 * - empty arrays are ignored.
 * - empty conditions for the boolean operators ```and``` (&), ```or``` (|)
 *   and ```not``` (!) are ignored.
 *
 * This means that you can translate the following query
 *
 * ```
 * (&(objectClass=organizationalPerson)(mail=foo@example.com))
 * ```
 *
 * into the following Array syntax:
 *
 * ```
 * ["&", ["objectClass=organizationalPerson"], ["mail=foo@example.com"]]
 * ```
 *
 * or slightly simpler
 *
 * ```
 * ["&", "objectClass=organizationalPerson", "mail=foo@example.com"]
 * ```
 */
class LDAPAdapter {
    static addAttributeHandler(operator) {
        if (AttrTransformators.indexOf(operator) < 0) {
            AttrTransformators.push(operator);
        }
    }

    addAttributeHandler(operator) {
        if (this.localTransformators.indexOf(operator) < 0) {
            this.localTransformators.push(operator);
        }
    }

    constructor(opts, connection = null) {
        if (!opts) {
            throw LdapErrors.options;
        }

        [
            "url",
            "bind",
            "password"
        ].forEach((e) => {
            if (!opts[e]) {
                throw LdapErrors[e];
            }
        });
        this.localTransformators = [];
        this.wait = [];
        this.opts = {};
        Object.keys(opts).map(k => this.opts[k] = opts[k]);

        if (connection) {
            this.rootConnection = connection;
        }
    }

    async connect(userdn = null, passwd = null) {
        if (this.rootConnection && !userdn && !passwd) {
            return this.rootConnection;
        }

        if (!this.rootConnection) {
            if (this.connectAttempt) {
                return null;
            }
            this.connectAttempt = true;
        }

        if (!this.opts) {
            throw LdapErrors.options;
        }

        const cliOpts = {
            url: this.opts.url
        };

        if (userdn === null) {
            userdn = this.opts.bind;
        }

        if (passwd === null) {
            passwd = this.opts.password;
        }

        const connection = ldap.createClient(cliOpts);

        await new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
            connection.bind(userdn, passwd, (err) => {
                if (err) {
                    // the adapters MUST NOT throw errors, because this removes
                    // the control from the koa framwork, which then will
                    // raise a server error.
                    // console.log(err); // eslint-disable-line no-console
                    // reject(err);
                    resolve(null);
                }
                else {
                    resolve(connection);
                }
            });
        });

        if (!this.rootConnection) {
            this.rootConnection = connection;
            delete this.connectAttempt;
            await Promise.all(this.wait.map((f) => f()));
            delete this.wait;
        }

        return connection;
    }

    // This little method allows to write LDAP Style filters in JSON notation.
    // ["&", "foo=bar", "!foo=bar", ["|", "bar=foo", "mail=bar@foo.com"]];
    buildFilter(filterObj) {
        if (!filterObj) {
            filterObj = [];
        }

        if (!(filterObj instanceof Array)) {
            filterObj = [filterObj];
        }

        const op = filterObj.shift();

        // and/or handling
        if (op === "&" || op === "|") {
            const qs = filterObj.map((e) => {
                if (e && e.length) {
                    return this.buildFilter(e);
                }
                return "";
            }).filter((e) => e.length);

            if (qs.length > 1) {
                return `(${op}${qs.join("")})`;
            }

            if (qs.length === 1) {
                return qs[0];
            }
            return ""; // operator without filters
        }

        // not operator
        if (op === "!") {
             // not has only one filter
            const e = filterObj.shift();

            if (e && e.length) {
                return `(${op}${this.buildFilter(e)})`;
            }
            return ""; // operator without filter
        }

        if (op instanceof Array) {
            // always process arrays
            return this.buildFilter(op);
        }

        // pass literals
        return op ? `(${op})` : "";
    }

    async raw_find(filterArray, baseDN = null, scope = "sub") {
        if (!this.rootConnection) {
            const p = new Promise((resolve) =>
                this.wait.push(
                    () => resolve(this.raw_find(filterArray, baseDN, scope))
                )
            );

            this.connect(); // we silently ignore the connection promise
            return p;
        }


        if (!baseDN) {
            baseDN = this.opts.base;
        }

        if (!baseDN) {
            throw LdapErrors.base;
        }

        let filter = `${this.buildFilter(filterArray)}`;

        if (!(filter && filter.length)) {
            filter = "objectClass=*";
        }

        return new Promise((resolve, reject) => {
            this.rootConnection.search(baseDN,
                                       {
                                           filter,
                                           scope: scope
                                       },
                                       (err, res) => {
                                           if (err) {
                                               reject(err);
                                           }
                                           else {
                                               var resset = [];

                                               res.on("searchEntry", entry => resset.push(entry.object));
                                               res.on("end", () => resolve(resset));
                                           }
                                       });
        });
    }

    async find(filterArray, baseDN = null, scope = "sub") {
        const result = await this.raw_find(filterArray, baseDN, scope);

        await Promise.all(
            result.map(
                (record) => this.runTransformators(record)
            )
        );

        return result;
        // return result.map(record => this.splitUrls(record));
    }

    async runTransformators(record) {
        await Promise.all(
            AttrTransformators.map(
                (t) => t(record)
            )
        );
        await Promise.all(
            this.localTransformators.map(
                (t) => t(record)
            )
        );
    }

    async findBase(baseDN = null) {
        return this.find([], baseDN, "base");
    }

    // find and bind functions return a promise that returns a new LDAP
    // connector

    async findAndBind(filter, password, scope = "sub") {
        // use the raw result of raw_find() instead of the transformed result of find().
        const resultset = await this.raw_find(filter, this.opts.base, scope);

        if (resultset.length && resultset[0]) {
            const entry = resultset[0];
            const userConnection = await this.connect(entry.dn, password);

            return this.cloneWithConnection(userConnection, {base: entry.dn});
        }

        return null;
    }

    cloneWithConnection(connection, opts = null) {
        let newOpts = {};

        if (connection) {
            Object.keys(this.opts).map(o => newOpts[o] = this.opts[o]);
            if (opts) {
                Object.keys(opts).map(o => newOpts[o] = opts[o]);
            }

            return new LDAPAdapter(newOpts, connection);
        }

        return null;
    }
}

module.exports = LDAPAdapter;
