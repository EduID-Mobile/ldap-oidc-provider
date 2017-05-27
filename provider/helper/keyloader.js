"use strict";

const jose = require("node-jose");
const fs = require("fs");

class KeyLoader {
    constructor() {
        this.ks = jose.JWK.createKeyStore();
    }

    chkFile(fn) {
        return new Promise((success,reject) => {
            fs.stat(fn, (err, res) => {
                if (err) {
                    reject(err);
                }
                else if (res.isFile()){
                    success(fn);
                }
                else {
                    reject(new Error("NOTAFILE"));
                }
            });
        });
    }

    loadFile(fn) {
        return new Promise((success, reject) => {
            fs.readFile(fn, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    success(data.toString("utf8"));
                }
            });
        });
    }

    parseJWK(data) {
        let tdata;

        try {
            tdata = JSON.parse(data.trim());
            if (!(tdata && (tdata.keys || tdata.kty))) {
                throw new Error("BADJWK");
            }
        }
        catch(err) {
            return Promise.reject(data);
        }
        return Promise.resolve(tdata);
    }

    addKey(key) {
        return this.ks.add(key)
            .catch(err => { // eslint-disable-line no-unused-vars
                // clear the error
                return Promise.resolve();
            });
    }

    importKey(key) {
        if (key) {
            if (key.keys) {
                // add each key in keys
                return Promise.all(key.keys.map(k => this.addKey(k)));
            }
            else {
                return this.addKey(key);
            }
        }
        return Promise.resolve();
    }

    loadKey(fn) {
        return this
            .chkFile(fn)
            .then(cfn => this.loadFile(cfn))
            .then(data => this.parseJWK(data))
            .catch(err => {
                if (err.message) {
                    return Promise.resolve(null);
                }
                return Promise.resolve(err);
            })
            .then(key => this.importKey(key));
    }

    chkDir(fn) {
        return new Promise((success,reject) => {
            fs.stat(fn, (err,res) => {
                if (err) {
                    reject(err);
                }
                else if (res.isDirectory()){
                    success(fn);
                }
                else {
                    reject(new Error("NOTAFOLDER"));
                }
            });
        });
    }

    readDir(fn) {
        const path = fn + (fn.charAt(fn.length - 1) === "/" ? "" : "/");

        return new Promise((success, reject) => {
            fs.readdir(fn, (err, files) => {
                if (err) {
                    reject(err);
                }
                else {
                    success(files.map(f => path + f));
                }
            });
        });
    }

    handleDirFiles(files) {
        return Promise.all(files.map(fn => this.loadKey(fn)));
    }

    loadKeyDir(fn) {
        return this
            .chkDir(fn)
            .then(fn => this.readDir(fn))
            .then(files => this.handleDirFiles(files));
    }

    get keys() {
        return this.ks.toJSON(true);
    }
}

module.exports = KeyLoader;
