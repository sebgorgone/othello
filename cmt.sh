#!/bin/bash

git add .

git commit -m "$1"

git push origin main

/home/ass/.molassysmon/msysmon-remote-client/main.sh molasses03 othello-cicd
/home/ass/.molassysmon/msysmon-remote-client/main.sh report


