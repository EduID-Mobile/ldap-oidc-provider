"use strict";

const jose = require("node-jose");
const fs = require("asyncfs");
const path = require("path");

class KeyLoader {
    constructor() {
        this.ks = jose.JWK.createKeyStore();
    }

    async chkFile(fn) {
        const fstat = await fs.stat(fn);

        return fstat.isFile();
    }

    async loadFile(fn) {
        const data = await fs.readFile(fn);

        return data.toString("utf8");
    }

    parseJWK(data) {
        let tdata;

        try {
            tdata = JSON.parse(data.trim());
        }
        catch(err) {
            return data;
        }
        return tdata;
    }

    async addKey(key, form = null) {
        const args = [key];

        if (form) {
            args.push(form);
        }

        try {
            await this.ks.add(...args);
        }
        catch (err) {
            // ignore
        }
    }

    async importKey(key) {
        if (key) {
            if (key.keys) {
                // add each key in keys
                await Promise.all(key.keys.map(k => this.addKey(k)));
            }
            else if (key.kty) {
                await this.addKey(key);
            }
            else {
                await this.addKey(key, "pem");
            }
        }
    }

    async loadKey(fn) {
        const tFile = await this.chkFile(fn);

        if (tFile) {
            let data, key;

            try {
                data = await this.loadFile(fn);
                key = this.parseJWK(data);
            }
            catch (err) {
                return null;
            }
            await this.importKey(key);
        }
    }

    async chkDir(fn) {
        const fstat = await fs.stat(fn);

        return fstat.isDirectory();
    }

    async readDir(fn) {
        const files = await fs.readdir(fn);

        return files.filter((f) => f.indexOf(".") !== 0).map((f) => path.join(fn, f));
    }

    handleDirFiles(files) {
        return Promise.all(files.map(fn => this.loadKey(fn)));
    }

    async loadKeyDir(fn) {
        const tDir = await this.checkDir(fn);

        if (tDir) {
            const files = await this.readDir(fn);

            return this.handleDirFiles(files);
        }

        return null;
    }

    get keys() {
        return this.ks.toJSON(true);
    }
}

module.exports = KeyLoader;
