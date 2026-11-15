name: process
run-name: ${{ inputs.job_id }}

on:
  workflow_dispatch:
    inputs:
      job_id:
        description: "Job id"
        required: true
      mode:
        description: "scan | process"
        required: true
      payload:
        description: "JSON payload"
        required: true

jobs:
  run:
    runs-on: ubuntu-latest
    timeout-minutes: 180
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Ensure ffmpeg
        run: which ffmpeg || (sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg)
      - run: pip install -r worker/requirements.txt
      - name: Run worker
        run: python worker/worker.py
        env:
          JOB_ID: ${{ inputs.job_id }}
          MODE: ${{ inputs.mode }}
          PAYLOAD: ${{ inputs.payload }}
          PIXELDRAIN_API_KEY: ${{ secrets.PIXELDRAIN_API_KEY }}
          YT_COOKIES: ${{ secrets.YT_COOKIES }}
