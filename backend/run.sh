#!/bin/bash
export FLASK_APP=app.py
export FLASK_ENV=development

# Updated to use port 5002 consistently
flask run --host=0.0.0.0 --port=5002