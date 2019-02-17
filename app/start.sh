#!/bin/sh

set -e

if [ "$ENV" = "build" ]
    then
    echo "running Test"
else
    echo "ruuning Production"
    exec npm start
fi