"use strict";

/* eslint-disable */

const { expect } = require("chai");

const mapClaims = require("../provider/mapping/map_claims");

describe("MapClaims", function() {
    let mapping = {
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
                  {"attribute": "spla", "separator": ";", "assign": ["tre", "two", "one"]}]
    };
    const forceArray = ["flat"];

    it("direct mapping", function() {
        const source = {
            "dm": "hello"
        };

        const result = mapClaims(mapping, source);

        expect(result).to.be.an("object");
        expect(result).to.have.keys("direct");
        expect(result.direct).to.be.a("string");
        expect(result.direct).to.be.equal("hello");

    });

    it("masked direct mapping", function() {
        const source = {
            "mdm": "hello"
        };

        const result = mapClaims(mapping, source);

        expect(result).to.be.an("object");
        expect(result).to.have.keys("masked_direct");
        expect(result.masked_direct).to.be.a("string");
        expect(result.masked_direct).to.be.equal("hello");
    });

    it("missing", function() {
        const source = {
            "missing": "hello"
        };

        const result = mapClaims(mapping, source);

        expect(result).to.be.an("object");
        expect(result).to.be.empty;
    });

    it("flat mapping simple first", function() {
        const source = {
            f1: "hello"
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("flat");
        expect(result.flat).to.be.a("string");
        expect(result.flat).to.be.equal("hello");
    });

    it("flat mapping simple second", function() {
        const source = {
            flatTest: "world"
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("flat");
        expect(result.flat).to.be.a("string");
        expect(result.flat).to.be.equal("world");
    });

    it("flat mapping duplicate", function() {
        const source = {
            f1: "hello",
            flatTest: "world"
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("flat");
        expect(result.flat).to.be.a("string");
        expect(result.flat).to.be.equal("hello");
    });

    it("flat mapping simple array", function() {
        const source = {
            f1: ["hello", "world"]
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("flat");
        expect(result.flat).to.be.a("array");
        expect(result.flat).to.have.lengthOf(2);
        expect(result.flat.join(" ")).to.be.equal("hello world");
    });

    it("skip mapping", function() {
        const source = {
            f1: "hello",
            f2: "world"
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("flat");
        expect(result.flat).to.be.a("string");
        expect(result.flat).to.be.equal("hello");
    });

    it("forceArray", function() {
        const source = {
            f1: "hello"
        };

        const result = mapClaims(mapping, source, forceArray);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("flat");
        expect(result.flat).to.be.an("array");
        expect(result.flat).to.have.lengthOf(1);
        expect(result.flat.join(" ")).to.be.equal("hello");
    });

    it("labeled mapping", function() {
        const source = {
            labeledUri: {test: "hello"}
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("labeled");
        expect(result.labeled).to.be.a("string");
        expect(result.labeled).to.be.equal("hello");
    });

    it("json mapping ok", function() {
        const source = {
            data: '{"test": "hello"}'
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("processed");
        expect(result.processed).to.be.a("object");
        expect(result.processed).to.have.keys("test");
        expect(result.processed.test).to.be.equal("hello");
    });

    it("json mapping broken", function() {
        const source = {
            data: '{"test": "hello"'
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.empty;
    });

    it("mixed mapping flat", function() {
        const source = {
            uri: "hello"
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("mixed");
        expect(result.mixed).to.be.a("string");
        expect(result.mixed).to.be.equal("hello");
    });

    it("mixed mapping complex", function() {
        const source = {
            labeledUri: { mixed: "hello" }
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("mixed");
        expect(result.mixed).to.be.a("string");
        expect(result.mixed).to.be.equal("hello");
    });

    it("subset mapping simple", function() {
        const source = {
            s: "hello"
        };
        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("sub");
        expect(result.sub).to.be.an("object");
        expect(result.sub).to.have.keys("set");
        expect(result.sub.set).to.be.a("string");
        expect(result.sub.set).to.equal("hello");
    });

    it("subset mapping deep", function() {
        const source = {
            dss: "hello"
        };
        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("deep");
        expect(result.deep).to.be.an("object");
        expect(result.deep).to.have.keys("sub");
        expect(result.deep.sub).to.be.an("object");
        expect(result.deep.sub).to.have.keys("set");
        expect(result.deep.sub.set).to.be.a("string");
        expect(result.deep.sub.set).to.equal("hello");
    });

    it("split mapping", function() {
        const source = {
            spl: "foo$bar$baz"
        };

        const result = mapClaims(mapping, source);

        expect(result).to.be.an("object");
        expect(result).to.have.keys("split");
        expect(result.split).to.be.an("array");
        expect(result.split).to.have.lengthOf(3);
        expect(result.split[0]).to.be.equal("foo");
        expect(result.split[1]).to.be.equal("bar");
        expect(result.split[2]).to.be.equal("baz");
    });

    it("split assign mapping fit", function() {
        const source = {
            spla: "foo;bar;baz"
        };

        const result = mapClaims(mapping, source);

        expect(result).to.be.an("object");
        expect(result).to.have.keys("split");
        expect(result.split).to.be.an("object");
        expect(result.split).to.have.keys("one", "two", "tre");
        expect(result.split.one).to.be.equal("baz");
        expect(result.split.two).to.be.equal("bar");
        expect(result.split.tre).to.be.equal("foo");
    });

    it("split assign mapping short", function() {
        const source = {
            spla: "bar;baz"
        };

        const result = mapClaims(mapping, source);

        expect(result).to.be.an("object");
        expect(result).to.have.keys("split");
        expect(result.split).to.be.an("object");
        expect(result.split).to.have.keys("two", "one");
        expect(result.split.one).to.be.equal("baz");
        expect(result.split.two).to.be.equal("bar");
    });

    it("split assign mapping long", function() {
        const source = {
            spla: "fee;foo;bar;baz"
        };

        const result = mapClaims(mapping, source);

        expect(result).to.be.an("object");
        expect(result).to.have.keys("split");
        expect(result.split).to.be.an("object");
        expect(result.split).to.have.keys("one", "two", "tre");
        expect(result.split.one).to.be.equal("baz");
        expect(result.split.two).to.be.equal("bar");
        expect(result.split.tre).to.be.an("array");
        expect(result.split.tre).to.have.lengthOf(2);
        expect(result.split.tre.join(" ")).to.be.equal("fee foo");
    });
});
