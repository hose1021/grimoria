# Proposal

Issue: #519

## Why

The type check job runs `archive:index --check` and reads the first add of every
archived change from Git history. On a pull request, `actions/checkout` defaults
to GitHub's synthetic merge commit. For a `dev` → `main` release that merge has
both histories, so archives present on both branches have two first adds. The
check then compares the dev origin with main's squash origin and fails.

The merged tree decides the release; the check must read the branch that will
squash into `main`, not a merge that no commit will use.

## What Changes

- The type check job checks out `github.event.pull_request.head.sha`, falling
  back to `github.sha` outside pull requests.
- Every other job and required check stays unchanged.
- The archive, rules and acceptance checks still compare against the pull
  request base.

## Proof

- On the release merge ref `a686ce0` (parents `a8f31dc` main and `ddb68cd` dev),
  `archive:index --check` fails for archives whose dev origin differs from
  main's squash origin.
- On the head `ddb68cd`, the same check and `--against origin/main` pass with 173
  archives.
