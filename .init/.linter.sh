#!/bin/bash
cd /home/kavia/workspace/code-generation/roadrescue-quickassist-platform-41116-41125/roadrescue_quickassist_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

