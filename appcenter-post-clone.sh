#!/usr/bin/env bash

head1=$(git symbolic-ref --short -q HEAD)
echo $?
echo $head1

head=$(git symbolic-ref HEAD 2>/dev/null | cut -d"/" -f 3)
echo $?
echo $head
