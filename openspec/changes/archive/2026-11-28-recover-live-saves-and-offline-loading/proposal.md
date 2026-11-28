# Recover live saves and offline loading

Issue: #156

## Why

A damaged save in another tab can replace a playable local session. Repeated recoveries consume space and a timestamp collision can overwrite an earlier backup. A cache read error also stops an online visitor from opening the app. Several language and update controls misreport the result of the user's selection.

## What Changes

Keep recoverable game data, isolate caches for separate installations, and make deferring updates, selecting a language and reading seat announcements reliable.

## Impact

Patch release from the fork’s main branch. The fork has Issues disabled and the preceding hotfix uses the same issue reference.
