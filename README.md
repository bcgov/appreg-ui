# kq-ui

<img src="https://github.com/bcgov/kq-ui/workflows/Package%20for%20Dev/badge.svg"></img>
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=kq-ui&metric=alert_status)](https://sonarcloud.io/dashboard?id=kq-ui)
[![img](https://img.shields.io/badge/Lifecycle-Dormant-ff7f2a)](https://github.com/bcgov/repomountie/blob/master/doc/lifecycle-badges.md)

Frontend UI for the API Key Request (KQ) application

# Build and run in a docker container

docker build --build-arg configuration=[ENV_NAME] -t kq-ui .
  where [ENV_NAME] is one of [dlv, test, prod]

Example: 
  docker build --build-arg configuration=dlv -t kq-ui .


docker run kq-ui
