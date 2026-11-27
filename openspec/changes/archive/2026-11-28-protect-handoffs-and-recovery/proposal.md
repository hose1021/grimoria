# Protect handoffs and recovery

Issue: #156

## Why

Review of 0.12.2 reproduced private cards changing owners, mixed releases in the offline cache and startup failures on supported browsers. Several recovery and setup actions also silently lost the host’s changes.

## What Changes

Protect the active handoff, load a consistent offline release and support Safari 16.4 startup. Keep concurrent edits, backups, script imports, language selection and navigation reliable. Avoid copying the complete game during duplicate command execution and downloading unsupported artwork.

## Impact

The fork follows [upstream update issue 156](https://github.com/hose1021/grimoria/issues/156) and the established player handoff contract. This patch uses the existing game and library formats.
