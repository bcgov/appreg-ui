FROM node:8-alpine
MAINTAINER leo.lou@gov.bc.ca

USER root
ENV CONTAINER_USER_ID="1001" \
    CONTAINER_GROUP_ID="1001"

WORKDIR /app
RUN apk update \
  && adduser -D -u ${CONTAINER_USER_ID} -g ${CONTAINER_GROUP_ID} -h /app -s /bin/sh app \
  && mkdir /npm-global && chown -R ${CONTAINER_USER_ID}:${CONTAINER_USER_ID} /npm-global \
  && chown -R ${CONTAINER_USER_ID}:${CONTAINER_USER_ID} /app && chmod -R 775 /app
  
USER ${CONTAINER_USER_ID}
COPY . /app

RUN NPM_CONFIG_PREFIX=/npm-global \
    PATH=$NPM_CONFIG_PREFIX/bin:$NPM_CONFIG_PREFIX/lib/node_modules/@angular/cli/bin:$PATH \
  && echo "prefix=/npm-global" > ~/.npmrc \    
  && npm i --no-cache npm@latest -g && npm i --no-cache -g @angular/cli \
  && npm install --no-cache \
  && ng build --prod \
  && chmod -R o+r /app/dist/* \
  && ls -lt /app/dist/
  
CMD ["cp", "-r", "/app/dist/*", "/dist"]
