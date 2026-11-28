# Tasks

## 1. Checkout

- [x] 1.1 Check out the pull-request head commit in the type check job, with `github.sha` outside pull requests.
- [x] 1.2 Keep the base fetch and every `--against` comparison.
- [x] 1.3 Leave all other jobs and required checks unchanged.

## 2. Verification

- [ ] 2.1 Record the merge-ref failure and the head pass.
- [ ] 2.2 The release pull request type check passes after integration; every other job is unchanged.

## 3. Evidence

- RED: on the release merge ref `a686ce0` (parents `a8f31dc`, `ddb68cd`),
  `npm run archive:index -- --check` failed with `origin differs from its
  accepted record or first add` for the archives shared with `main`; the
  `--against origin/main` variant failed the same way.
- GREEN: on head `ddb68cd`, `archive:index --check` and `--check --against
  origin/main` both report 173 current changes; `rule-registry --against
  origin/main` passes 172 rules.
