# Protect private displays, library restores and reference navigation

Issue: #156

## Why

A table handoff can show a replacement player’s role, and an unfinished correction can target the replacement game. Damaged library JSON prevents restoring a valid backup, while an abandoned file read can still replace a healthy library. Reference navigation and dataset failure also give readers misleading results.

## What Changes

Bind pending actions to their context, restore damaged libraries without losing their original bytes, and keep private and read-only screens consistent across navigation. Keep the existing storage formats and game rules.

## Impact

The fork has Issues disabled. The issue reference follows [hotfix #34](https://github.com/SOLiNARY/grimoria/pull/34). The new failures and reproduction evidence are recorded in this change.
