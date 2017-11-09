# Assertion Structure

```
{
    sub : username (authentication phase) or ID (authorization phase)
    iss : registered client (authentication phase) or device instance (authorization phase)
    aud : AP Token endpoint
    azp (+ cnf.jwk): instance uuid (device id). becomes iss (authentication phase)
    azp (+ cnf.kid): redirect_uri of the academic service (authorization phase)
    iat : timestamp when the assertion has been created.
    exp : timestamp until when the assertion is valid (e.g. iat + 5 min.)
    cnf : public confirmation key (cnf.jwk, authentication phase)/confirmation key reference (cnf.kid, authorization phase)
    x_crd : credentials (e.g. password)
    x_jwt : access token issued by AP to the assertion issuer (optional)
}
```

All assertions are encrypted for the AP (that is this service).

During the authentication phase the Trust Agent App needs to register its device (via the azp claim)

# 1.1 Request

[-] 1.1.1 RFC 6749: The RP MUST forward the request as POST to the AP.

[-] 1.1.2 The RP MUST forward all incoming parameters to the AP.

[-] 1.1.3 The RP MUST add a scope parameter according to the required information from the AP.

[-] 1.1.4 If the incoming request already has a scope parameter then the RP MUST extend it to match its requirements.

[x] 1.1.5 RFC 7523: The grant type MUST be urn:ietf:params:oauth:grant-type:jwt-bearer

[x] 1.1.6 RFC 7521: The token endpoint MUST accept the assertion parameter.

# 1.2 Parameters

[x] 1.2.1 RFC 7800: token request MUST include assertion parameter.

[x] 1.2.2 RFC 7800: token request MUST include scope parameter.

# 1.3 Scope validation

[x] 1.3.1 OIDC Core 1.0: scope parameter MUST include "openid".

# 2 Decrypt assertion

[ ] 2.1 Assertions MUST be encrypted.

[ ] 2.2 Assertions MUST be encrypted for the AP.

# 3.1 verify JWT

[x] 3.1.1 Assertion envelope payload MUST be a JWT serialisation.

[x] 3.1.2 The assertion envelope payload MUST be either in compact or JSON serialization.

[x] 3.1.3 CHECK: RFC7517 (JWT): The payload header MUST include a kid.

[x] 3.1.4 Assertion payload MUST include the iss, aud, and sub claims.

[x] 3.1.5 The assertion payload MAY includ iat, nbf, and exp claims. These claims MUST conform to RFC 7519 (JWT).

[x] 3.1.6 If iat and nbf are used without the exp claims, they MUST NOT be older than 30min.

[x] 3.1.7 If no cnf claim is present, then the clientId MUST match the iss claim.

[x] 3.1.8 If the cnf claim holds a JWK, then the clientId MUST match the iss claim.

[x] 3.1.9 If the cnf claim holds a kid, then assertion header's kid MUST match it.

[ ] 3.1.10 The assertions payload MAY contain an azp.

[ ] 3.1.11 If azp is present and azp is not matching the assertions issuer, then the issuer MUST be registered for proxy_authorization.

[x] 3.1.12 proxy_authorization SHOULD be granted only to trust agents.

# 3.2 validate JWT

[x] 3.2.1 The assertion MUST be signed by the TA.

[x] 3.2.2 If the cnf claim holds a JWK, the assertion MUST be signed using the TA's client key.

[x] 3.2.3 If the cnf claim holds a kid, then the assertion MUST be signed using the referred key.

[x] 3.2.4 If the cnf claim holds a kid, the the assertion's sub MUST match the cnf key's sub claim.

[x] 3.2.5 If the cnf claim holds a kid, the the assertion's iss MUST match the cnf key's azp claim.

[x] 3.2.6 If the cnf claim holds a kid, the the cnf key's iss claim MUST refer to a valid client.

# 3.3 Common x_jwt requirements

[x] 3.3.1 The x_jwt claim MUST be in compact serialization.

# 4.1 Authenticate

[x] 4.1.1 The assertion MUST contain a cnf claim.

[x] 4.1.2 The cnf claim MUST contain a JWK.

[x] 4.1.3 The cnf JWK MUST contain a kid.

[ ] 4.1.4 The cnf JWK kid MUST be unique.

[ ] 4.1.5 The azp claim MUST contain a unique id for the TA instance.

# 4.2 Authenticate using an access_token (App Auth extension)

[x] 4.2.1 The assertion MUST include a x_jwt claim.

[x] 4.2.2 The x_jwt's iss claim MUST match the assertion's aud claim.

[x] 4.2.3 The x_jwt's sub claim MUST match the assertion's sub claim.

[x] 4.2.4 The x_jwt's aud claim MUST match the assertion's iss claim.

[ ] 4.2.4 The x_jwt MUST be signed by the AP.

[x] 4.2.5 The AP MUST return the x_jwt as access_token.

# 4.3 Authenticate using credentials

[x] 4.3.1 The assertion MUST NOT include a x_jwt claim.

[x] 4.3.2 The assertion MUST include a x_crd claim.

[x] 4.3.3 The x_crd claim MUST be a string.

[x] 4.3.4 The assertion's sub claim and x_crd claims MUST authenticate a user as specified in the password flow (RFC 6749).

# 4.4 proxy authorization (single factor)

[x] 4.4.1 The assertion MUST contain a cnf claim containing a kid.

[x] 4.4.2 The asserion's azp claim MUST match a redirectUri of the client making the request.

[x] 4.4.3 The assertion MUST contain a x_jwt claim.

[ ] 4.4.4 The AP MAY require a x_jwt to be signed.

[x] 4.4.5 The x_jwt MUST contain the iss claim.

[x] 4.4.6 The x_jwt MUST NOT contain the aud claim.

[x] 4.4.7 The x_jwt MUST NOT contain the sub claim.

# 4.5 proxy authorization: verifying signed x_jwt

[ ] 4.5.1 If the x_jwt's iss known to the AP, then it MUST verify the assertion's x_jwt.

[ ] 4.5.2 The AP MAY accept x_jwt from unknown issuers without verifying the signature.

# 4.6 Multi-factor authentication/authorization

[ ] 4.6.1 The assertion MUST include a x_jwt claim.

[ ] 4.6.2 The assertion MUST include a x_crd claim.

[ ] 4.6.3 The x_crd claim MUST be an object.

[ ] 4.6.4 The x_crd claim MUST contain key-value pairs for the different factors.

[ ] 4.6.5 The value of a x_crd pair is defined for each factor, separately.

[ ] 4.6.6 If multi-factor authentication is active the AP MUST reject x_jwt assertion without x_crd.  
