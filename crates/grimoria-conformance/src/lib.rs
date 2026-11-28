//! Native conformance runner.

pub mod fixture;

use grimoria_wire::CONTRACT_VERSION;

/// Suite identity used by fixture runs.
pub fn suite_identity() -> String {
    format!("grimoria-conformance@{CONTRACT_VERSION}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_suite_identity_carries_the_contract_version() {
        assert_eq!(suite_identity(), "grimoria-conformance@1");
    }
}
