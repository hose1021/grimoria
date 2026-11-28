//! Versioned JSON contract. Phase 0 fixes the version only.

use grimoria_domain::domain_identity;

/// Wire contract version shared with `contracts/engine-boundary.json`.
pub const CONTRACT_VERSION: &str = "1";

/// Identity string a future WASM adapter reports at initialization.
pub fn contract_identity() -> String {
    format!("{}@{}", domain_identity(), CONTRACT_VERSION)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_contract_version_is_pinned() {
        assert_eq!(CONTRACT_VERSION, "1");
        assert!(contract_identity().ends_with("@1"));
    }
}
