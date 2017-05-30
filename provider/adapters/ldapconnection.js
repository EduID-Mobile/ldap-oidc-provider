"use strict";

const ldap     = require("ldapjs");

const LdapErrors = {
    options: "NoLDAPOptionsProvided",
    url: "NoLDAPServerOption",
    port: "NoLDAPPortOption",
    rootDN: "NoLDAPRootDN",
    rootPassword: "NoLDAPRootPassword",
    baseDN: "NoLDAPBaseDN",
    userDN: "NoLDAPUserDN",
    serviceDN: "NoLDAPServiceDN",
    queryFilter: "EmptyQueryFilter",
    connection: "NoConnection",
    notFound: "NotFound"
};

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

        this.opts = opts;
        if (connection) {
            this.rootConnection = connection;
        }
    }

    connect(userdn = null, passwd = null) {
        if (!this.opts) {
            throw LdapErrors.options;
        }

        const cliOpts = {
            url: this.opts.url
        };

        if (userdn === null) {
            userdn = this.opts.bind;
            passwd = this.opts.password;
        }

        var connection = ldap.createClient(cliOpts);

        return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
            connection.bind(userdn, passwd, (err) => {
                if (err) {
                    // the adapters MUST NOT throw errors, because this removes
                    // the control from the koa framwork, which then will
                    // raise a server error.
                    console.log(err); // eslint-disable-line no-console
                    // reject(err);
                    resolve(null);
                }
                else {
                    resolve(connection);
                }
            });
        });
    }

    // This little method allows to write LDAP Style filters in JSON notation.
    // ["&", "foo=bar", "!foo=bar", ["|", "bar=foo", "mail=bar@foo.com"]];
    buildFilter(filterObj) {
        let op = filterObj.shift();

        // and/or handling
        if (op === "&" || op === "|") {
            let qs = filterObj.map((e) => {
                if (e instanceof Array) {
                    e = this.buildFilter(e);
                }
                if (e.length) {
                    return `(${e})`;
                }
                return "";
            });

            if (qs.length) {
                return op + qs.join("");
            }
            return ""; // operator without filters
        }

        // not operator
        if (op === "!") {
             // not has only one filter
            let e = filterObj.shift();

            if (e instanceof Array) {
                e = this.buildFilter(e);
            }
            if (e.length) {
                return `${op}(${e})`;
            }
            return ""; // operator without filter
        }
        if (op instanceof Array) {
            // always process arrays
            return this.buildFilter(op);
        }

        // pass literals
        return op || "";
    }

    _find(filterArray, baseDN = null, scope = "sub") {
        if (!filterArray) {
            throw LdapErrors.queryFilter;
        }
        
        if (!baseDN) {
            baseDN = this.opts.base;
        }

        let filter = `${this.buildFilter(filterArray)}`;

        if (!(filter && filter.length)) {
            filter = "objectClass=*";
        }

        return new Promise((resolve, reject) => {
            this.rootConnection.search(baseDN,
                                       {
                                           filter: `(${filter})`,
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
        const result = await this._find(filterArray, baseDN, scope)

        return result.map(record => this.splitUrls(record))
            // .then((res) => { console.log(res); return res; });
    }

    splitUrls(obj) {
        let urls = {}, label, url;

        if (!obj.labeledURI) {
            return obj;
        }

        if (typeof obj.labeledURI === "string") {
            obj.labeledURI = [obj.labeledURI];
        }

        if (Array.isArray(obj.labeledURI)) {
            obj.labeledURI.map(u => {
                [url, label] = u.split(" ", 2);

                if (label) {
                    label = label.replace(/[\[\]]/, "");
                    if (!urls[label]) {
                        urls[label] = url;
                    }
                    else {
                        if (!Array.isArray(urls[label])) {
                            urls[label] = [urls[label]];
                        }
                        urls[label].push(url);
                    }
                }
            });
        }
        else {
            urls = obj.labeledURI;
        }

        obj.labeledURI = urls;
        return obj;
    }

    findBase(baseDN = null) {
        return this.find([], baseDN, "base");
    }

    // find and bind functions return a promise that returns a new LDAP
    // connector

    async findAndBind(filter, password) {
        let opt = {};

        const resultset = await this.find(filter, this.opts.base);

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
            Object.keys(this.opts).map(o => { newOpts[o] = this.opts[o]; });
            if (opts) {
                Object.keys(opts).map(o => { newOpts[o] = opts[o]; });
            }
            return new LDAPAdapter(newOpts, connection);
        }

        return null;
    }
}

module.exports = LDAPAdapter;
