//! Pure rules domain. Phase 0 contains no gameplay implementation.

/// Phase marker for the empty workspace.
pub const PHASE: &str = "phase0";

/// Stable domain identity used by the conformance skeleton.
pub fn domain_identity() -> &'static str {
    "grimoria-domain/phase0"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_domain_skeleton_has_no_rules() {
        assert_eq!(domain_identity(), "grimoria-domain/phase0");
    }
}
