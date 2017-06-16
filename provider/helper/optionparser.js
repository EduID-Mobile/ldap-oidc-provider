
"use strict";

class ArgvOptions {
    options(options) {
        // option syntax
        // {optionName : [shortOption, otherShortOption, longOption, otherLongOption, ...]}
        // where the options include the required dashes ("-")
        this.prop = options;
        this.param = {};
        this.flags  = {};

        // "key" <- key is a flag, the class counts the occurances
        // "key:" <- key is a parameter, gets the next argument in argv

        Object.keys(options).map(
            (k) => {
                const l = k.charAt(k.length - 1) === ":" ? k.substr(0, k.length - 1) : k;
                const p = k === l ? "flags" : "param";

                options[k].map((o) => this[p][o] = l);
            });
    }

    parse(args) {
        this.opts = {};
        this.rest = [];

        // case 1 cannot get achieved with loop functions
        for (let i = 2; i < args.length; i++) {
            if (args[i] in this.param) {
                this.opts[this.param[args[i]]] = args[i + 1];
                i += 1;
            }
            else if (args[i] in this.flags) {
                this.opts[this.flags[args[i]]] = (this.opts[this.flags[args[i]]] ? this.opts[this.flags[args[i]]] : 0) + 1;
            }
            else {
                this.rest.push(args[i]);
            }
        }
    }
}

module.exports = new ArgvOptions();
