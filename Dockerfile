FROM docker-registry.default.svc:5000/dbc-konga-tools/node-alpine-angular
MAINTAINER leo.lou@gov.bc.ca

COPY . ${BUILD_DIR}

RUN npm install --no-cache \
  && ng build --prod \
  && chmod -R o+r ${BUILD_DIR}/dist/* \
  && ls -lt ${BUILD_DIR}/dist/kq-ui/
