#!/usr/bin/env bash

echo git symbolic-ref --short -q HEAD
echo $?

echo git symbolic-ref HEAD 2>/dev/null | cut -d"/" -f 3
echo $?
