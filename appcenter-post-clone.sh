#!/usr/bin/env bash

git reflog

status=$(git status)
echo $?
echo $status

head1=$(git symbolic-ref --short HEAD)
echo $?
echo $head1

head=$(git symbolic-ref HEAD 2>/dev/null | cut -d"/" -f 3)
echo $?
echo $head
