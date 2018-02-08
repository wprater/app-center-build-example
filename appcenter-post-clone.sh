#!/usr/bin/env bash

env

sha=$(git reflog --format=format:%H -n 1)

git rev-list master..
