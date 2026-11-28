# Protect recovery and setup edits

Issue: #156

## Why

A stale bag editor can undo a newer deal. A failed backup can leave a damaged primary save exposed to replacement. Several browser operations also lose input or block actions that can complete locally.

## What Changes

Protect the original save and undo history, bind setup undo and import previews to the current selection, flush pending notes on page suspension, and give the host a usable backup when clipboard access fails. Retain direct Pages links when storage is unavailable and surface already downloaded updates while the network check runs.

## Impact

The patch follows the fork’s existing [upstream tracking issue](https://github.com/hose1021/grimoria/issues/156) and retains the current game format.
