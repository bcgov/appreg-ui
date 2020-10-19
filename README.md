# kq-ui
Frontend UI for the API Key Request (KQ) application

# Build and run in a docker container

docker build --build-arg configuration=[ENV_NAME] -t kq-ui .
  where [ENV_NAME] is one of [dlv, test, prod]

Example: 
  docker build --build-arg configuration=dlv -t kq-ui .


docker run kq-ui
