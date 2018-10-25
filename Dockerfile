FROM node:8

USER app    
WORKDIR /opt
COPY . /opt

RUN NPM_CONFIG_PREFIX=/npm-global \
    PATH=$NPM_CONFIG_PREFIX/bin:$NPM_CONFIG_PREFIX/lib/node_modules/@angular/cli/bin:$PATH \
  && echo "prefix=/npm-global" > ~/.npmrc \    
  && npm i --no-cache npm@latest -g && npm i --no-cache -g @angular/cli \
  && npm install --no-cache \
  && ng build --prod
  
CMD ["cp", "-r", "/opt/dist/*", "/dist"]  
