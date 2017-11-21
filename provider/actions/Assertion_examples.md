## authentication phase

```
{
    "kid": "foobar1232141245hellow923412512world",
    "alg": "RS512",
}
.
{
    "sub": "julius.saputra@htwchur.ch",
    "aud": "https://eduid.htwchur.ch/oidc",
    "iss": "eduidapp://authentication",
    "azp": "35352-19876-13234-1234", // device id
    "iat": "1234556709808",
    "cnf": {
        "jwk": {
            "kid": "21098381urhekfht9832zu5241§45",
            "typ": "rsa",
            "e": "AQNF",
            "n": "1231253195215932096532086832685329431003160320521"
        }
    },
    "x_crd": "hell0W0rld"
}
```

## authorization phase

```
{
    "alg": "RS512",
    "kid": "21098381urhekfht9832zu5241§45"
}
.
{
    "aud": "https://eduid.htwchur.ch/oidc",
    "iss": "35352-19876-13234-1234", // device id
    "sub": "julius.saputra@htwchur.ch",
    "iat": "12312353105",
    "cnf": {
        "kid": ""21098381urhekfht9832zu5241§45""
    },
    "azp": "https://moodle.htwchur.ch",
    "x_jwt": eysdkfopewirpoeqit.eyapoireqioteq.234asdkwqiri3qtr31
}
```
