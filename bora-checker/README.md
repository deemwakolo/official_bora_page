# BORA Frontend Checker

This local Playwright checker verifies the profile editor in
`/admin/control-room`: profile identity, song, favorite artist, and supported
artist edits must appear in the rendered preview, and Reset must restore the
defaults.

Each run writes a hash-linked `events.jsonl`, redacted DOM snapshots, and
screenshots under `.bora-checker/runs/`. The folder is git-ignored. The event
chain includes browser console warnings/errors, page errors, failed requests,
HTTP errors, checkpoint hashes, and the final run status. Credentials, request
bodies, headers, query strings, and email/password field values are not logged.

## Run it

1. Start the app locally with `npm run dev`.
2. Set `BORA_CHECKER_EMAIL` and `BORA_CHECKER_PASSWORD` in the shell to an
   authorized BORA admin test account. Do not put credentials in source files.
3. Run `npm run bora:check`.
4. Verify the newest run with `npm run bora:check:verify`.

Set `BORA_CHECKER_BASE_URL` to check a different development/staging URL. The
checker does not create, delete, or persist profile data; its edits use the
existing in-memory mock store and it resets that content at the end.

Install the Chromium browser once with `npx playwright install chromium` if
Playwright reports that the browser executable is missing.
