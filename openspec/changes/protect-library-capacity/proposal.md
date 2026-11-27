# Protect saved bags and pools at capacity

Issue: #17

## Why

Saving a 201st named bag or pool currently reports success. Reloading the library drops the oldest entry of that kind. The fork uses [the upstream bag-library issue](https://github.com/hose1021/grimoria/issues/17) for the original storage contract.

## What Changes

Reject a new entry when its collection already holds 200 items. Explain the limit in the bag screen and allow the host to edit or remove an existing entry. Reject an oversized library import before replacing the saved collection.

## Impact

The existing library key, file format and 200-item limits remain compatible. Two related verification fixes address missing comparison revisions and source checks that scan nested worktrees. Their original verification contract is tracked by [upstream issue 332](https://github.com/hose1021/grimoria/issues/332).
