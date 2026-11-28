# Design

`actions/checkout` for a `pull_request` event defaults to
`refs/pull/<N>/merge`, a commit GitHub creates for CI. That commit has the base
and the head as parents, so `git log --diff-filter=A` can return the base's
first add for a path the head also holds. The archive index keeps one reviewed
origin per change, so a tree with two origins cannot satisfy it.

The type check job is the only job that compares commit history: archive
origins, archive parity, rule parity and the documentation inventory. It now
checks out the pull-request head commit:

```yaml
ref: ${{ github.event.pull_request.head.sha || github.sha }}
```

The fallback keeps `workflow_dispatch` on its triggering commit. The base is
still fetched and passed to `--against`, so a release pull request validates
the head against `main`. Other jobs keep the merge ref, which is the correct
integration tree for building, unit tests, Playwright and scenarios.

Rollback: remove the `ref` key; the merge ref returns.
