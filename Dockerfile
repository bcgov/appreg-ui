FROM node:8-alpine
MAINTAINER leo.lou@gov.bc.ca

USER root
ENV CONTAINER_USER_ID="1001" \
    CONTAINER_GROUP_ID="1001" \
    BUILD_DIR=/build

WORKDIR ${BUILD_DIR}
RUN apk update \
  && apk add --no-cache rsync \
  && adduser -D -u ${CONTAINER_USER_ID} -g ${CONTAINER_GROUP_ID} -h ${BUILD_DIR} -s /bin/sh app \
  && mkdir /npm-global && chown -R ${CONTAINER_USER_ID}:${CONTAINER_USER_ID} /npm-global \
  && chown -R ${CONTAINER_USER_ID}:${CONTAINER_USER_ID} ${BUILD_DIR} && chmod -R 775 ${BUILD_DIR}
  
USER ${CONTAINER_USER_ID}
COPY . ${BUILD_DIR}

RUN NPM_CONFIG_PREFIX=/npm-global \
    PATH=$NPM_CONFIG_PREFIX/bin:$NPM_CONFIG_PREFIX/lib/node_modules/@angular/cli/bin:$PATH \
  && echo "prefix=/npm-global" > ~/.npmrc \    
  && npm i --no-cache npm@latest -g && npm i --no-cache -g @angular/cli \
  && npm install --no-cache \
  && ng build --prod \
  && chmod -R o+r ${BUILD_DIR}/dist/* \
  && ls -lt ${BUILD_DIR}/dist/kq-ui/
