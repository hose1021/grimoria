# Stabilize browser acceptance checks

Issue: #223

## Why

The seat regression expected an edited order without first swapping any seats. The full-game scenarios could read the previous screen while the destination loaded, and the language scenario requested a retired route.

## What changes

Exercise a genuine seat draft, wait for scenario navigation, and check translated text on the locked seat screen.
