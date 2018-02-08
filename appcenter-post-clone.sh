#!/usr/bin/env bash

git symbolic-ref --short -q HEAD
echo $?
