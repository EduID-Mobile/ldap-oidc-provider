"use strict";
/* eslint-disable */

const { expect } = require("chai");

const Connection = require("../provider/adapters/ldapconnection");
const Adapter = require("../provider/adapters/ldap");

describe("LDAPAdapter", function() {
    it("loads", function() {
        expect(Adapter).to.be.a("function");
    });

    const connectionConfig = {
        url: "ldap://192.168.56.102:389",
        bind: "cn=oidc,ou=configurations,dc=local,dc=dev",
        base: "ou=users,dc=local,dc=dev",
        password: "oidc"
    };

    const accOrgS = {
        class: "inetOrgPerson",
        bind: "mail",
        id: "uid"
    };

    const accOrgC = {
        class: "inetOrgPerson",
        bind: "mail",
        id: "uid",
        scope: "one",
        subclaims: [
            {
                base: "ou=affiliations,dc=local,dc=dev",
                class: "inetOrgPerson",
                id: "uid",
                claim: "eduid-affiliation"
            }
        ]
    };

    const cliOrg = {
        class: "organizationalRole",
        id: "cn"
    };

    const mapTrans = {
        "direct": "dm",
        "masked_direct": ["mdm"],
        "flat": ["f1", "flatTest"],
        "skipme": [],
        "sub.set": ["s", "subset"],
        "deep.sub.set": ["d", "dss"],
        "labeled": [{attribute: "labeledUri", label: "test"}],
        "processed": [{attribute: "data", json: true}],
        "mixed": ["uri", {"attribute": "labeledUri", "label": "mixed"}],
        "split": [{"attribute": "spl", "separator": "$"},
                  {"attribute": "spla", "separator": ";", "assign": ["tre", "two", "one"]}],
        "foobar": {
            "tirect": "dm",
            "somewhat_direct": ["mdm"],
            "vlat": ["f1", "flatTest"],
            "tub.set": ["s", "subset"]
        }
    };

    const ldapTrans = {
        name: ["cn"],
        email: ["mail"],
        "eduid-affiliation": {
            "eduid.othername": ["cn"],
            "eduid.othermail": ["mail"]
        }
    }

    it("transpose attributes without mapping", function () {
        const adapter = new Adapter("Test");
        const source = {
            "dm": "hello"
        };

        const result = adapter.transposeAttributes(source);
        expect(result).to.be.eql(source);
    });

    it("transpose attributes with scope without mapping", function () {
        const adapter = new Adapter("Test");
        const source = {
            "dm": "hello"
        };

        const result = adapter.transposeAttributes(source, "foobar");
        expect(result).to.be.eql(source);
    });

    it("transpose attributes flat", function () {
        const adapter = new Adapter("Test");
        adapter.transform(mapTrans);
        const source = {
            "dm": "hello",
            "skipme": "world"
        };
        const target = {
            "direct": "hello"
        };

        const result = adapter.transposeAttributes(source);
        expect(result).to.be.eql(target);
    });

    it("transpose attributes with scope with scope mapping", function () {
        const adapter = new Adapter("Test");
        adapter.transform(mapTrans);
        const source = {
            "dm": "hello"
        };
        const target = {
            "tirect": "hello"
        };

        const result = adapter.transposeAttributes(source, "foobar");
        expect(result).to.be.eql(target);
    });

    it("transpose attributes with scope without scope mapping", function () {
        const adapter = new Adapter("Test");

        const source = {
            "dm": "hello"
        };
        const target = {
            "direct": "hello"
        };

        adapter.transform({direct: "dm"});

        const result = adapter.transposeAttributes(source, "foobar");
        expect(result).to.be.eql(target);
    });

    it("merge claims without overlap", function () {
        const adapter = new Adapter("Test");
        const source = {
            "dm": "hello"
        };
        const msource = [{
            "tm": "world"
        }];
        const target = {
            "dm": "hello",
            "tm": "world"
        };
        const result = adapter.mergeClaims(source, msource);
        expect(result).to.be.eql(target);
    });

    it("merge multi claims without overlap", function () {
        const adapter = new Adapter("Test");
        const source = {
            "dm": "hello"
        };
        const msource = [{
            "tm": "world"
        }, {
            "foo": "bar"
        }];
        const target = {
            "dm": "hello",
            "tm": "world",
            "foo": "bar"
        };
        const result = adapter.mergeClaims(source, msource);
        expect(result).to.be.eql(target);
    });

    it("merge claims with overlap", function () {
        const adapter = new Adapter("Test");
        const source = {
            "dm": "hello"
        };
        const msource = [{
            "dm": "beautiful",
            "tm": "world"
        }];
        const target = {
            "dm": ["hello", "beautiful"],
            "tm": "world"
        };
        const result = adapter.mergeClaims(source, msource);
        expect(result).to.be.eql(target);
    });

    it("merge multi claims with overlap", function () {

        const source = {
            "dm": "hello"
        };
        const msource = [{
            "dm": "beautiful",
            "tm": "world"
        }, {
            "foo": "bar",
            "tm": "baz"
        }];
        const target = {
            "dm": ["hello", "beautiful"],
            "tm": ["world", "baz"],
            "foo": "bar"
        };
        const adapter = new Adapter("Test");
        const result = adapter.mergeClaims(source, msource);
        expect(result).to.be.eql(target);
    });

    it("merge claims with structured overlap", function () {
        const target = {
            "dm": {foo: "hello", bar: "world"},
        };
        const source = {
            "dm": {foo: "hello"}
        };
        const msource = [{
            "dm": {bar: "world"}
        }];

        const adapter = new Adapter("Test");
        const result = adapter.mergeClaims(source, msource);
        expect(result).to.be.eql(target);
    });

    it("merge claims with structured overlap multi", function () {
        const target = {
            "dm": {foo: ["hello", "world"]},
        };
        const source = {
            "dm": {foo: "hello"}
        };
        const msource = [{
            "dm": {foo: "world"}
        }];

        const adapter = new Adapter("Test");
        const result = adapter.mergeClaims(source, msource);
        expect(result).to.be.eql(target);
    });

    it("merge multi claims with structured overlap multi", function () {
        const target = {
            "dm": {foo: ["hello", "world", "baz"]},
        };
        const source = {
            "dm": {foo: "hello"}
        };
        const msource = [{
            "dm": {foo: "world"}
        }, {
            "dm": {foo: "baz"}
        }];

        const adapter = new Adapter("Test");
        const result = adapter.mergeClaims(source, msource);
        expect(result).to.be.eql(target);
    });

    it("merge multi claims with mixed structured overlap multi", function () {
        const target = {
            "dm": [{foo: ["hello", "world"]}, "baz"],
        };
        const source = {
            "dm": {foo: "hello"}
        };
        const msource = [{
            "dm": {foo: "world"}
        }, {
            "dm": "baz"
        }];

        const adapter = new Adapter("Test");
        const result = adapter.mergeClaims(source, msource);
        expect(result).to.be.eql(target);
    });

    it("merge multi claims with mixed structured overlap multi reversed", function () {
        const target = {
            "dm": [{foo: "hello"}, "baz", {foo: "world"}],
        };
        const source = {
            "dm": {foo: "hello"}
        };
        const msource = [{
            "dm": "baz"
        }, {
            "dm": {foo: "world"}
        }];

        const adapter = new Adapter("Test");
        const result = adapter.mergeClaims(source, msource);
        expect(result).to.be.eql(target);
    });

    it("find by id", async function() {
        const adapter = new Adapter("Test");
        adapter.organization(accOrgS);
        adapter.connection(new Connection(connectionConfig));

        const result = await adapter.find("1234567890");
        expect(result).to.be.an("object");
        expect(result.uid).is.equal("1234567890");
    });

    it("find by id with sub claims", async function () {
        const target = {
            name: 'Christian Glahn',
            email: 'p@foobar.com',
            eduid: {
                othername: 'Christian Glahn',
                othermail: 'p@barfoo.org' }
        };

        const adapter = new Adapter("Test");
        adapter.organization(accOrgC);
        adapter.connection(new Connection(connectionConfig));
        adapter.transform(ldapTrans);
        const result = await adapter.find("1234567890");
        expect(result).to.be.eql(target);
    });

    // TODO
    it("upsert simple", function () {});
    it("destroy simple", async function () {});
    it("update simple", function () {});
});
