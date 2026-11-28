//! Deterministic rules domain. Phase 2 implements only the `setNotes` slice.

pub mod command;
pub mod state;

/// Stable domain identity used by the conformance skeleton.
pub fn domain_identity() -> &'static str {
    "grimoria-domain/phase2"
}

pub use command::{Inputs, PreparedCommand, apply, prepare, preview, replay, validate};
pub use state::State;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_domain_slice_is_identified() {
        assert_eq!(domain_identity(), "grimoria-domain/phase2");
    }
}
