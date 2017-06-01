"use strict";
/* eslint-disable */

const { expect } = require("chai");

const LDAPConnection = require("../provider/adapters/ldapconnection.js");
const splitUrls = require("../provider/helper/splitLabeledUri");

// FIXME create a fake ldap repository that runs locally
const conf = {
    url: "ldap://192.168.56.102:389",
    bind: "cn=oidc,ou=configurations,dc=local,dc=dev",
    base: "ou=users,dc=local,dc=dev",
    password: "oidc"
};

const miniconf = {
    url: "ldap://192.168.56.102:389",
    bind: "cn=oidc,ou=configurations,dc=local,dc=dev",
    password: "oidc"
};

const badconf = [
    {}, {url: "foo"}, {bind: "bar"}, {password: "baz"}, {url:"foo", base: "bar"}, {url:"foo", password: "baz"}, {bind:"bar", password: "baz"}, {url:"foo", base: "bar", bind: "boo"}
];

const nestedBase = "ou=complex,dc=local,dc=dev";

describe("LDAPConnectionQuery", function() {
    it("loads", function() {
        expect(LDAPConnection).to.be.a("function");
    });

    it("no options", function() {
        try {
            const c = new LDAPConnection();
        }
        catch (err) {
            expect(err).is.equal("NoLDAPOptionsProvided");
        }
    });

    it("bad options empty", function() {
        try {
            const c = new LDAPConnection(badconf[0]);
        }
        catch (err) {
            expect(err).is.equal("NoLDAPServerOption");
        }
    });

    it("bad options single URL", function() {
        try {
            const c = new LDAPConnection(badconf[1]);
        }
        catch (err) {
            expect(err).is.equal("NoLDAPBindDN");
        }
    });

    it("bad options single base", function() {
        try {
            const c = new LDAPConnection(badconf[2]);
        }
        catch (err) {
            expect(err).is.equal("NoLDAPServerOption");
        }
    });

    it("bad options single password", function() {
        try {
            const c = new LDAPConnection(badconf[3]);
        }
        catch (err) {
            expect(err).is.equal("NoLDAPServerOption");
        }
    });

    it("bad options double url, base", function() {
        try {
            const c = new LDAPConnection(badconf[4]);
        }
        catch (err) {
            expect(err).is.equal("NoLDAPBindDN");
        }
    });

    it("bad options double url, password", function() {
        try {
            const c = new LDAPConnection(badconf[5]);
        }
        catch (err) {
            expect(err).is.equal("NoLDAPBindDN");
        }
    });

    it("bad options double base, password", function() {
        try {
            const c = new LDAPConnection(badconf[6]);
        }
        catch (err) {
            expect(err).is.equal("NoLDAPServerOption");
        }
    });


    it("bad options tripple", function() {
        try {
            const c = new LDAPConnection(badconf[7]);
        }
        catch (err) {
            expect(err).is.equal("NoLDAPPassword");
        }
    });

    const connection = new LDAPConnection(conf);

    it("connect", async function() {
        await connection.connect();

        expect(connection).to.be.not.null;
        expect(connection.rootConnection).is.not.null;

    });

    it("find full auto", async function() {
        const result = await connection.find();

        expect(result).to.be.an("array");
        expect(result).is.lengthOf(2);
        expect(result[0].ou).is.equal("users");

        expect(result[0].ou).is.equal("users");
        expect(result[1]).to.be.an("object");
        expect(result[1].uid).is.not.null;

    });

    it("find full auto on mini conf", async function() {
        const c2 = new LDAPConnection(miniconf);

        await c2.connect();
        let result;
        try {
            result = await c2.find();
        }
        catch (err) {
            expect(err).is.equal("NoLDAPBaseDN");
        }
        expect(result).to.be.undefined;

    });

    it("find sub class", async function() {
        const result = await connection.find("objectClass=inetOrgPerson");
        expect(result).to.be.an("array");
        expect(result).is.lengthOf(1);
        expect(result[0]).to.be.an("object");
        expect(result[0].uid).is.equal("1234567890");
    });

    it("find sub attribute", async function() {
        const result = await connection.find("mail=p@foobar.com");

        expect(result).to.be.an("array");
        expect(result).is.lengthOf(1);
        expect(result[0]).to.be.an("object");
        expect(result[0].uid).is.equal("1234567890");
    });

    it("find base", async function() {
        const result = await connection.find(null, null, "base");

        expect(result).to.be.an("array");
        expect(result).is.lengthOf(1);
        expect(result[0]).to.be.an("object");
        expect(result[0].ou).is.equal("users");
    });

    it("find base", async function() {
        const result = await connection.findBase();

        expect(result).to.be.an("array");
        expect(result).is.lengthOf(1);
        expect(result[0]).to.be.an("object");
        expect(result[0].ou).is.equal("users");
    });

    it("find one", async function() {
        const result = await connection.find(null, null, "one")
        expect(result).to.be.an("array");
        expect(result).is.lengthOf(1);
        expect(result[0]).to.be.an("object");
        expect(result[0].uid).is.equal("1234567890");
    });

    it("find sub different base", async function() {
        const result = await connection.find(null, nestedBase);
        expect(result).to.be.an("array");
        expect(result).is.lengthOf(4);
        expect(result[0].ou).is.equal("complex");
    });

    it("find sub different base on mini conf", async function() {
        const c2 = new LDAPConnection(miniconf);

        await c2.connect();
        const result = await c2.find([], nestedBase);
        expect(result).to.be.an("array");
        expect(result).is.lengthOf(4);
        expect(result[0].ou).is.equal("complex");
    });

    it("find base different base", async function() {
        const result = await connection.find(null, nestedBase, "base");

        expect(result).to.be.an("array");
        expect(result).is.lengthOf(1);
        expect(result[0].ou).is.equal("complex");
    });

    it("find one different base", async function() {
        const result = await connection.find(null, nestedBase, "one");

        expect(result).to.be.an("array");
        expect(result).is.lengthOf(2);
        expect(result[0]).to.be.an("object");
        expect(result[0].ou).is.equal("nested");
        expect(result[1].uid).is.equal("1234567890-1");
        expect(result[1]).to.be.an("object");
    });

    it("connect", async function() {
        const c2 = new LDAPConnection(conf);
        const [entry] = await connection.find(["objectClass=inetOrgPerson"]);

        c2.opts.base = entry.dn;
        const c3 = await c2.connect(entry.dn, "foobar");

        expect(c3).is.not.undefined;
        const result = await c2.findBase();

        expect(result).to.be.an("array");
        expect(result).is.lengthOf(1);
        expect(result[0]).to.be.an("object");
        expect(result[0].uid).is.equal("1234567890");
    });

    it("clone connection", async function() {
        let e;
        const [entry] = await connection.find(["objectClass=inetOrgPerson"]);
        const ldap = await connection.connect(entry.dn, "foobar");
        const c2 = connection.cloneWithConnection(ldap);
        expect(c2).to.be.an.instanceof(LDAPConnection);
        const result = await c2.findBase();
        expect(result).to.be.an("array");
        expect(result).is.lengthOf(1);
        expect(result[0]).to.be.an("object");
        expect(result[0]).to.have.keys("ou", "objectClass", "controls", "dn");
        expect(result[0].ou).is.equal("users");
    });

    it("clone connection with different base", async function() {
        const [entry] = await connection.find(["objectClass=inetOrgPerson"]);
        const e = {base:entry.dn};
        const ldap = await connection.connect(entry.dn, "foobar");
        const c2 = connection.cloneWithConnection(ldap, e);
        const result = await c2.findBase();

        expect(result).to.be.an("array");
        expect(result).is.lengthOf(1);
        expect(result[0]).to.be.an("object");
        expect(result[0].uid).is.equal("1234567890");
    });

    it("find and bind", async function() {
        const userConnection = await connection.findAndBind(["mail=p@foobar.com"], "foobar");
        const result = await userConnection.findBase();

        expect(result).to.be.an("array");
        expect(result).is.lengthOf(1);
        expect(result[0]).to.be.an("object");
        expect(result[0].uid).is.equal("1234567890");
    });


    it("split labeled urls", async function() {
        connection.addAttributeHandler(splitUrls);

        const [entry] = await connection.find(["objectClass=inetOrgPerson"])
        expect(entry.labeledURI).to.be.an("object");
        expect(entry.labeledURI).has.keys("Homepage", "Photo");
        expect(entry.labeledURI.Homepage).is.equal("https://foobar.com");
        expect(entry.labeledURI.Photo).is.equal("https://foobar.com/me.png");
    });

    it("split mulitple labeled urls", async function() {
        const [entry] = await connection.find(["uid=1234567890-2"], nestedBase)
        expect(entry.labeledURI).to.be.an("object");
        expect(entry.labeledURI).has.keys("Homepage", "Photo");
        expect(entry.labeledURI.Homepage).to.be.an("array");
        expect(entry.labeledURI.Photo).is.equal("https://foobar.com/me.png");
    });
});
