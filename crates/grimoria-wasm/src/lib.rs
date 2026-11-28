//! WASM exports for the versioned wire contract.
//!
//! These functions serialize only. They expose no game operation and the
//! production application does not load them.

use wasm_bindgen::prelude::*;

use grimoria_wire::{Request, Value, WIRE_VERSION};

/// Version of the wire contract.
#[wasm_bindgen]
pub fn wire_version() -> u32 {
    WIRE_VERSION
}

/// Parses and re-serializes a request in wire order.
#[wasm_bindgen]
pub fn wire_bytes(input: &str) -> Result<String, JsValue> {
    Request::from_json(input)
        .map(|request| request.to_json())
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

/// Parses a value and returns its canonical bytes.
#[wasm_bindgen]
pub fn wire_canonical_bytes(input: &str) -> Result<String, JsValue> {
    Value::parse(input)
        .map(|value| value.to_canonical())
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_wasm_exports_use_the_wire_version() {
        assert_eq!(wire_version(), 1);
        assert_eq!(
            wire_canonical_bytes(r#"{"b":1,"a":2}"#).unwrap(),
            r#"{"a":2,"b":1}"#
        );
    }
}
