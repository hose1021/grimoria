//! Thin Phase 0 CLI: prints the empty suite identity.

use grimoria_conformance::suite_identity;

fn main() {
    println!("{}", suite_identity());
}
