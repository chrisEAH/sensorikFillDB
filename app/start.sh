#!/bin/bash

set -e

if [ "$ENV" = "PROD" ]
    then
    echo "running Production"
    npm start
else
    echo "finish BUILD"
fi