{
    sub : username or ID
    iss : registered client or device instance
    aud : AP Token endpoint
    azp (+ cnf.jwk): instance uuid (device id). becomes iss
    azp (+ cnf.kid): redirect_uri of the academic service.
    iat : timestamp when the assertion has been created.
    exp : timestamp until when the assertion is valid (e.g. iat + 5 min.)
    x_crd : credentials (e.g. password)
    x_jwt : access token issued by AP to the assertion issuer (optional)
}

# 1.1 Request

1.1.1 [-] RFC 6749: The RP MUST forward the request as POST to the AP.
1.1.2 [-] The RP MUST forward all incoming parameters to the AP.
1.1.3 [-] The RP MUST add a scope parameter according to the required information from the AP.
1.1.4 [-] If the incoming request already has a scope parameter then the RP MUST extend it to match its requirements.
1.1.5 [x] RFC 7523: The grant type MUST be urn:ietf:params:oauth:grant-type:jwt-bearer
1.1.6 [x] RFC 7521: The token endpoint MUST accept the assertion parameter.

# 1.2 Parameters

1.2.1 [x] RFC 7800: token request MUST include assertion parameter.
1.2.2 [x] RFC 7800: token request MUST include scope parameter.

# 1.3 Scope validation

1.3.1 [x] OIDC Core 1.0: scope parameter MUST include "openid".

# 2 Decrypt assertion

2.1 [ ] Assertions MUST be encrypted.
2.2 [ ] Assertions MUST be encrypted for the AP.

# 3.1 verify JWT

3.1.1. [x] Assertion envelope payload MUST be a JWT serialisation
3.1.2. [x] The assertion envelope payload MUST be either in compact or JSON serialization.
3.1.3. [x] CHECK: RFC7517 (JWT): The payload header MUST include a kid.
3.1.4. [x] Assertion payload MUST include the iss, aud, and sub claims.
3.1.5. [x] The assertion payload MAY includ iat, nbf, and exp claims. These claims MUST conform to RFC 7519 (JWT).
3.1.6. [x] If iat and nbf are used without the exp claims, they MUST NOT be older than 30min.
3.1.7. [x] If no cnf claim is present, then the clientId MUST match the iss claim
3.1.8. [x] If the cnf claim holds a JWK, then the clientId MUST match the iss claim
3.1.9. [x] If the cnf claim holds a kid, then assertion header's kid MUST match it.
3.1.10. [ ] The assertions payload MAY contain an azp.
3.1.11. [ ] If azp is present and apz is not matching the assertions issuer, then the issuer MUST be registered for proxy_authorization.
3.1.12. [x] proxy_authorization SHOULD be granted only to trust agents.

# 3.2 validate JWT

3.2.1 [x] The assertion MUST be signed by the TA.
3.2.2 [x] If the cnf claim holds a JWK, the assertion MUST be signed using the TA's client key.
3.2.3 [x] If the cnf claim holds a kid, then the assertion MUST be signed using the referred key.
3.2.4 [x] If the cnf claim holds a kid, the the assertion's sub MUST match the cnf key's sub claim.
3.2.5 [x] If the cnf claim holds a kid, the the assertion's iss MUST match the cnf key's azp claim.
3.2.6 [x] If the cnf claim holds a kid, the the cnf key's iss claim MUST refer to a valid client.

# 3.3 Common x_jwt requirements

3.3.1 [x] The x_jwt claim MUST be in compact serialization.

# 4.1 Authenticate

4.1.1 [x] The assertion MUST contain a cnf claim.
4.1.2 [x] The cnf claim MUST contain a JWK.
4.1.3 [x] The cnf JWK MUST contain a kid.
4.1.4 [ ] The cnf JWK kid MUST be unique.
4.1.5 [ ] The azp claim MUST contain a unique id for the TA instance.

# 4.2 Authenticate using an access_token (App Auth extension)

4.2.1 [x] The assertion MUST include a x_jwt claim.
4.2.2 [x] The x_jwt's iss claim MUST match the assertion's aud claim.
4.2.3 [x] The x_jwt's sub claim MUST match the assertion's sub claim.
4.2.4 [x] The x_jwt's aud claim MUST match the assertion's iss claim.
4.2.4 [ ] The x_jwt MUST be signed by the AP.
4.2.5 [x] The AP MUST return the x_jwt as access_token.

# 4.3 Authenticate using credentials

4.3.1 [x] The assertion MUST NOT include a x_jwt claim.
4.3.2 [x] The assertion MUST include a x_crd claim.
4.3.3 [x] The x_crd claim MUST be a string.
4.3.4 [x] The assertion's sub claim and x_crd claims MUST authenticate a user as specified in the password flow (RFC 6749).

# 4.4 proxy authorization (single factor)

4.4.1 [x] The assertion MUST contain a cnf claim containing a kid.
4.4.2 [x] The asserion's azp claim MUST match a redirectUri of the client making the request.
4.4.3 [x] The assertion MUST contain a x_jwt claim.
4.4.4 [ ] The AP MAY require a x_jwt to be signed.
4.4.5 [X] The x_jwt MUST contain the iss claim.
4.4.6 [X] The x_jwt MUST NOT contain the aud claim.
4.4.7 [X] The x_jwt MUST NOT contain the sub claim.

# 4.5 proxy authorization: verifying signed x_jwt

4.5.1 [ ] If the x_jwt's iss known to the AP, then it MUST verify the assertion's x_jwt.
4.5.2 [ ] The AP MAY accept x_jwt from unknown issuers without verifying the signature.

# 4.6 Multi-factor authentication/authorization

4.6.1 [ ] The assertion MUST include a x_jwt claim.
4.6.2 [ ] The assertion MUST include a x_crd claim.
4.6.3 [ ] The x_crd claim MUST be an object.
4.6.4 [ ] The x_crd claim MUST contain key-value pairs for the different factors.
4.6.5 [ ] The value of a x_crd pair is defined for each factor, separately.
4.6.6 [ ] If multi-factor authentication is active the AP MUST reject x_jwt assertion without x_crd.  
