#!/bin/bash

git pull
cd backend || exit 1
npm run build 

cd ../client || exit 1
npm run build 

sudo systemctl restart othello-frontend
sudo systemctl restart othello-backend
