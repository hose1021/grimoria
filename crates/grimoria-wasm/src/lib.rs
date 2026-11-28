//! WASM exports for the versioned wire contract.
//!
//! These functions serialize only. They expose no game operation and the
//! production application does not load them. Failures are JSON responses with
//! a stable `engine-contract-violation` code, not free-form exception text.

use wasm_bindgen::prelude::*;

use grimoria_wire::{Operation, Request, Value, WIRE_VERSION, WireError};

/// Version of the wire contract.
#[wasm_bindgen]
pub fn wire_version() -> u32 {
    WIRE_VERSION
}

/// Parses and re-serializes a request in wire order.
#[wasm_bindgen]
pub fn wire_bytes(input: &str) -> Result<String, String> {
    Request::from_json(input)
        .map(|request| request.to_json())
        .map_err(failure)
}

/// Parses a value and returns comparison canonical bytes.
#[wasm_bindgen]
pub fn wire_canonical_bytes(input: &str) -> Result<String, String> {
    Value::parse(input)
        .map(|value| value.to_canonical())
        .map_err(failure)
}

/// Parses a value and returns the exact v0.14.0 legacy canonical bytes.
#[wasm_bindgen]
pub fn wire_legacy_canonical_bytes(input: &str) -> Result<String, String> {
    Value::parse(input)
        .map(|value| value.to_legacy_canonical())
        .map_err(failure)
}

/// Returns the exact `prepareCommand` result for a `setNotes` envelope.
#[wasm_bindgen]
pub fn set_notes_prepare(command_json: &str, inputs_json: &str) -> String {
    grimoria_domain::command::prepare_response(command_json, inputs_json)
}

/// Parses and re-serializes a state without executing a command.
#[wasm_bindgen]
pub fn state_roundtrip(state_json: &str) -> String {
    grimoria_domain::command::state_roundtrip(state_json)
}

/// Prepares, validates and returns a `setNotes` command result.
#[wasm_bindgen]
pub fn set_notes_validate(state_json: &str, command_json: &str, inputs_json: &str) -> String {
    grimoria_domain::command::dispatch(
        Operation::ValidateCommand,
        state_json,
        command_json,
        inputs_json,
    )
}

/// Previews a `setNotes` command without changing the state.
#[wasm_bindgen]
pub fn set_notes_preview(state_json: &str, command_json: &str, inputs_json: &str) -> String {
    grimoria_domain::command::dispatch(
        Operation::PreviewCommand,
        state_json,
        command_json,
        inputs_json,
    )
}

/// Applies a `setNotes` command and returns `{result,state}`.
#[wasm_bindgen]
pub fn set_notes_apply(state_json: &str, command_json: &str, inputs_json: &str) -> String {
    grimoria_domain::command::dispatch(
        Operation::ApplyCommand,
        state_json,
        command_json,
        inputs_json,
    )
}

/// Replays a journal made only of `setNotes` entries.
#[wasm_bindgen]
pub fn set_notes_replay(state_json: &str) -> String {
    let mut state = match grimoria_domain::State::parse(state_json) {
        Ok(state) => state,
        Err(error) => return error.to_failure_json(),
    };
    grimoria_domain::command::replay(&mut state).to_wire()
}

fn failure(error: WireError) -> String {
    error.to_failure_json()
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
        assert_eq!(
            wire_legacy_canonical_bytes(r#"{"10":1,"2":2,"1":3}"#).unwrap(),
            r#"{"1":3,"2":2,"10":1}"#
        );
    }

    #[test]
    fn a_failure_is_structured_json() {
        let error = wire_canonical_bytes(r#"{"a":1,"a":2}"#).unwrap_err();
        let Value::Object(fields) = Value::parse(&error).unwrap() else {
            panic!("failure must be an object");
        };
        let field = |name: &str| {
            fields
                .iter()
                .find(|(key, _)| key.to_utf8().as_deref() == Ok(name))
                .map(|(_, value)| value)
                .expect("field exists")
        };
        assert_eq!(
            field("code"),
            &Value::String(grimoria_wire::Wtf16::from_utf8("engine-contract-violation"))
        );
        assert_eq!(
            field("kind"),
            &Value::String(grimoria_wire::Wtf16::from_utf8("duplicate-key"))
        );
    }
}
