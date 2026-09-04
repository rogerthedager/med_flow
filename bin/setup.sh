#!/usr/bin/env bash
## bash bin/setup.sh

set -e
echo "== MedFlow Setup =="

cd backend

#create our .venv if it does not exist

if [! -d ".venv"]; then
    echo "Creating virtual Environment..."
    python -m venv .venv
fi


source .venv/Scripts/activate
pip install -r requirements.txt


if[! -f ".env"]; then:
    echo "Creating .env file..."
    cp .env.example .env
fi


cd ../frontend
npm install

echo "Setup complet
