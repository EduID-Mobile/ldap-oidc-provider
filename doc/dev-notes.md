### Notes

OIDC provider has several interfaces

1.  The OAuth2 Service Endpoints.
2.  The Authentication API
3.  The Authorization API
4.  The Service API

The Authentication API provides the Login Screen if necessary.

The Authorization API verifies the user's confirmation or obtains it if
necessary.

The Authentication API has two parts:

The session management. The session management holds a small persistency layer
to keep data for active sessions and authorizations.

The user directory. The user directory is backed by an LDAP/AD Directory.

The Authorization API has also two parts:

The local authorizations (per issued token).

The persistent authorizations (per user & service).

OIDC provider passes an authorization token with all kinds of hints to the
authorization and authentication layers.

Finally we want to keep our service information persistent. Service information
will become available via the Directory. This API provides keys and service
information.

All local settings should get loaded also from the directory.

### Admin and Configuration

Users who are allowed to have access to the admin interface should be in an
appropriate group in the directory.

The users in that group should be able to write the service configuration record.

The core configuration of the EduID interface contains therefore:

The directory host URI
The service DN.
The service password.

All other information comes from the directory.
