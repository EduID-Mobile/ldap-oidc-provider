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

    it("connect", function(done) {
        connection.connect().then(function() {
            expect(connection).to.be.not.null;
            expect(connection.rootConnection).is.not.null;
            done();
        })
        .catch(done);
    });

    it("find full auto", function(done) {
        connection.find()
            .then((result) => {
                expect(result).to.be.an("array");
                expect(result).is.lengthOf(2);
                expect(result[0].ou).is.equal("users");

                expect(result[0].ou).is.equal("users");
                expect(result[1]).to.be.an("object");
                expect(result[1].uid).is.not.null;
                done();
            })
            .catch(done);
    });

    it("find full auto on mini conf", function(done) {
        const c2 = new LDAPConnection(miniconf);

        c2
            .connect()
            .then(() => c2.find())
            // will fail
            .then((result) => expect(result).to.be.an("array"))
            // will pass
            .catch((err) => expect(err).is.equal("NoLDAPBaseDN"))
            .then(() => done());
    });

    it("find sub class", function(done) {
        connection.find("objectClass=inetOrgPerson")
            .then((result) => {
                expect(result).to.be.an("array");
                expect(result).is.lengthOf(1);
                expect(result[0]).to.be.an("object");
                expect(result[0].uid).is.equal("1234567890");
                done();
            })
            .catch(done);
    });

    it("find sub attribute", function(done) {
        connection.find("mail=p@foobar.com")
            .then((result) => {
                expect(result).to.be.an("array");
                expect(result).is.lengthOf(1);
                expect(result[0]).to.be.an("object");
                expect(result[0].uid).is.equal("1234567890");
                done();
            })
            .catch(done);
    });

    it("find base", function(done) {
        connection.find(null, null, "base")
            .then((result) => {
                expect(result).to.be.an("array");
                expect(result).is.lengthOf(1);
                expect(result[0]).to.be.an("object");
                expect(result[0].ou).is.equal("users");
                done();
            })
            .catch(done);
    });

    it("find one", function(done) {
        connection.find(null, null, "one")
            .then((result) => {
                expect(result).to.be.an("array");
                expect(result).is.lengthOf(1);
                expect(result[0]).to.be.an("object");
                expect(result[0].uid).is.equal("1234567890");
                done();
            })
            .catch(done);
    });

    it("find sub different base", function(done) {
        connection.find(null, nestedBase)
            .then((result) => {
                expect(result).to.be.an("array");
                expect(result).is.lengthOf(4);
                expect(result[0].ou).is.equal("complex");
                done();
            })
            .catch(done);
    });

    it("find sub different base on mini conf", function(done) {
        const c2 = new LDAPConnection(miniconf);

        c2
            .connect()
            .then(() => c2.find([], nestedBase))
            .then((result) => {
                expect(result).to.be.an("array");
                expect(result).is.lengthOf(4);
                expect(result[0].ou).is.equal("complex");
                done();
            })
            .catch(done);
    });

    it("find base different base", function(done) {
        connection.find(null, nestedBase, "base")
            .then((result) => {
                expect(result).to.be.an("array");
                expect(result).is.lengthOf(1);
                expect(result[0].ou).is.equal("complex");
                done();
            })
            .catch(done);
    });

    it("find one different base", function(done) {
        connection.find(null, nestedBase, "one")
            .then((result) => {
                expect(result).to.be.an("array");
                expect(result).is.lengthOf(2);
                expect(result[0]).to.be.an("object");
                expect(result[0].ou).is.equal("nested");
                expect(result[1].uid).is.equal("1234567890-1");
                expect(result[1]).to.be.an("object");
                done();
            })
            .catch(done);
    });

    it("connect", function(done) {
        const c2 = new LDAPConnection(conf);
        connection.find(["objectClass=inetOrgPerson"])
            .then((result) => result[0])
            .then((entry) => {
                c2.opts.base = entry.dn;
                return c2.connect(entry.dn, "foobar");
            })
            .then((c3) => {
                expect(c3).is.not.undefined;
            })
            .then(() => c2.findBase())
            .then((result) => {
                expect(result).to.be.an("array");
                expect(result).is.lengthOf(1);
                expect(result[0]).to.be.an("object");
                expect(result[0].uid).is.equal("1234567890");
                done();
            })
            .catch(done);
    });

    it("clone connection", function(done) {
        let e;
        connection.find(["objectClass=inetOrgPerson"])
            .then((result) => result[0])
            .then((entry) => connection.connect(entry.dn, "foobar"))
            .then((ldap) => {
                return connection.cloneWithConnection(ldap)}
            )
            .then((c2) => {
                return c2.findBase()
            })
            .then((result) => {
                expect(result).to.be.an("array");
                expect(result).is.lengthOf(1);
                expect(result[0]).to.be.an("object");
                expect(result[0]).to.have.keys("ou", "objectClass", "controls", "dn");
                expect(result[0].ou).is.equal("users");
                done();
            })
            .catch(done);
    });

    it("clone connection with different base", function(done) {
        let e;
        connection.find(["objectClass=inetOrgPerson"])
            .then((result) => result[0])
            .then((entry) => {
                e = {base:entry.dn};
                return connection.connect(entry.dn, "foobar");
            })
            .then((ldap) => connection.cloneWithConnection(ldap, e))
            .then((c2) => c2.findBase())
            .then((result) => {
                expect(result).to.be.an("array");
                expect(result).is.lengthOf(1);
                expect(result[0]).to.be.an("object");
                expect(result[0].uid).is.equal("1234567890");
                done();
            })
            .catch(done);
    });

    it("find and bind", function(done) {
        connection.findAndBind(["mail=p@foobar.com"], "foobar")
            .then((c) => c ? c.findBase() : null)
            .then((result) => {
                expect(result).to.be.an("array");
                expect(result).is.lengthOf(1);
                expect(result[0]).to.be.an("object");
                expect(result[0].uid).is.equal("1234567890");
                done();
            })
            .catch(done);
    });


    it("split labeled urls", function(done) {
        connection.addAttributeHandler(splitUrls);

        connection.find(["objectClass=inetOrgPerson"])
            .then((result) => result[0])
            .then((entry) => {
                expect(entry.labeledURI).to.be.an("object");
                expect(entry.labeledURI).has.keys("Homepage", "Photo");
                expect(entry.labeledURI.Homepage).is.equal("https://foobar.com");
                expect(entry.labeledURI.Photo).is.equal("https://foobar.com/me.png");
                done();
            })
            .catch(done);
    });

    it("split mulitple labeled urls", function(done) {
        connection.find(["uid=1234567890-2"], nestedBase)
            .then((result) => result[0])
            .then((entry) => {
                expect(entry.labeledURI).to.be.an("object");
                expect(entry.labeledURI).has.keys("Homepage", "Photo");
                expect(entry.labeledURI.Homepage).to.be.an("array");
                expect(entry.labeledURI.Photo).is.equal("https://foobar.com/me.png");
                done();
            })
            .catch(done);
    });
});
