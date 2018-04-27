# use the slime line alpine rather than LTS carbon
FROM node:alpine

RUN apk add --no-cache git

# Create the app directory
WORKDIR /usr/src/oidc-provider

# the oidc provider expects all configurations in /etc/oidc/*
# the standalone version may override this configuration, which is not the
# case for docker containers.

# Install app dependencies
COPY package*.json ./

# create configuration directory
RUN mkdir -p /etc/oidc

# load dependencies for production only
RUN npm install --only=production

# Bundle the app source
COPY . .

# the internal default port
# NOTE: the exposed port MUST be linked to a SSL termination!
Expose 3000

# launch our app
CMD ["npm", "start"]
