//! Versioned JSON contract for the Rust/WASM engine.
//!
//! The crate is serialization only: it has no game rules and no production
//! caller. The TypeScript engine remains the sole production engine.

pub mod dto;
pub mod json;
pub mod wtf16;

pub use dto::{Operation, OperationStatus, Request, Response, WIRE_VERSION};
pub use json::{CONTRACT_VIOLATION_CODE, Limits, Value, WireError};
pub use wtf16::{LoneSurrogate, Wtf16};

/// Version of the comparison-only canonical byte encoding.
pub const CANONICAL_ENCODING_VERSION: &str = "grimoria-canonical-v1";

/// Exact v0.14.0 TypeScript canonical encoding used by legacy fingerprints.
pub const LEGACY_CANONICAL_VERSION: &str = "grimoria-legacy-canonical-v0.14.0";

/// Wire contract version shared with `contracts/engine-boundary.json`.
pub const CONTRACT_VERSION: &str = "1";

/// Identity string a future WASM adapter reports at initialization.
pub fn contract_identity() -> String {
    format!("grimoria-wire@{CONTRACT_VERSION}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_contract_version_is_pinned() {
        assert_eq!(CONTRACT_VERSION, "1");
        assert_eq!(CONTRACT_VERSION, WIRE_VERSION.to_string());
        assert!(contract_identity().ends_with("@1"));
    }
}
