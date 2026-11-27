# Recover saves and streamline loading

Issue: #156

## Why

A failed legacy migration prevents later saves. A worker update can discard unsaved work during an active session. Startup and installation load unused assets, and the storyteller console does work while idle.

## What Changes

Protect active play across updates, recover from legacy save failures, load screens and catalogs on demand, trim unused offline assets, isolate the countdown, preserve the edition on home links and retry failed reference loads.

## Impact

This patch for the fork builds on the update work tracked in [upstream issue 156](https://github.com/hose1021/grimoria/issues/156). The owner chose explicit update and successful save during active play. The storage format and supported editions stay compatible.
