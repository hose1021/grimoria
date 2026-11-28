//! WASM boundary. Phase 0 exports the contract version only; no engine is loaded.

use grimoria_wire::CONTRACT_VERSION;

/// Contract version exposed to a future adapter.
pub fn contract_version() -> &'static str {
    CONTRACT_VERSION
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_wasm_skeleton_reports_the_contract_version() {
        assert_eq!(contract_version(), "1");
    }
}
