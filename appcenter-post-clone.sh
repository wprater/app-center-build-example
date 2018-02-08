#!/usr/bin/env bash

git symbolic-ref --short -q HEAD
echo $?

git symbolic-ref HEAD 2>/dev/null | cut -d"/" -f 3
echo $?
