#![cfg(target_arch = "wasm32")]

use grimoria_wire::Value;
use wasm_bindgen_test::*;

const FIXTURE: &str = include_str!("../../../fixtures/conformance/wire-serialization.json");
const LEGACY_FIXTURE: &str = include_str!("../../../fixtures/conformance/wire-legacy-vectors.json");

#[wasm_bindgen_test]
fn wasm_matches_every_native_fixture_vector() {
    let root = Value::parse(FIXTURE).expect("fixture parses");
    let Value::Object(entries) = root else {
        panic!("fixture root must be an object");
    };
    let vectors = entries
        .iter()
        .find(|(key, _)| key.to_utf8().as_deref() == Ok("vectors"))
        .map(|(_, value)| value)
        .expect("vectors exist");
    let Value::Array(vectors) = vectors else {
        panic!("vectors must be an array");
    };
    for vector in vectors {
        let Value::Object(fields) = vector else {
            panic!("vector must be an object");
        };
        let field = |name: &str| {
            fields
                .iter()
                .find(|(key, _)| key.to_utf8().as_deref() == Ok(name))
                .map(|(_, value)| value)
                .expect("vector field exists")
        };
        let id = match field("id") {
            Value::String(value) => value.to_utf8().unwrap(),
            _ => panic!("id must be a string"),
        };
        let input = match field("input") {
            Value::String(value) => value.to_utf8().unwrap(),
            _ => panic!("input must be a string"),
        };
        let wire = match field("wire") {
            Value::String(value) => value.to_utf8().unwrap(),
            _ => panic!("wire must be a string"),
        };
        let canonical = match field("canonical") {
            Value::String(value) => value.to_utf8().unwrap(),
            _ => panic!("canonical must be a string"),
        };
        assert_eq!(
            grimoria_wasm::wire_canonical_bytes(&input).unwrap(),
            canonical,
            "canonical {id}"
        );
        let request =
            format!(r#"{{"wireVersion":1,"operation":"apply_command","payload":{input}}}"#);
        let expected =
            format!(r#"{{"wireVersion":1,"operation":"apply_command","payload":{wire}}}"#);
        assert_eq!(
            grimoria_wasm::wire_bytes(&request).unwrap(),
            expected,
            "wire {id}"
        );
    }
}

#[wasm_bindgen_test]
fn wasm_matches_the_legacy_canonical_fixture() {
    let root = Value::parse(LEGACY_FIXTURE).expect("legacy fixture parses");
    let Value::Object(entries) = root else {
        panic!("fixture root must be an object");
    };
    let vectors = entries
        .iter()
        .find(|(key, _)| key.to_utf8().as_deref() == Ok("vectors"))
        .map(|(_, value)| value)
        .expect("vectors exist");
    let Value::Array(vectors) = vectors else {
        panic!("vectors must be an array");
    };
    for vector in vectors {
        let Value::Object(fields) = vector else {
            panic!("vector must be an object");
        };
        let field = |name: &str| {
            fields
                .iter()
                .find(|(key, _)| key.to_utf8().as_deref() == Ok(name))
                .map(|(_, value)| value)
                .expect("vector field exists")
        };
        let expected = match field("expected") {
            Value::String(value) => value.to_utf8().unwrap(),
            _ => panic!("expected must be a string"),
        };
        let input = match field("input") {
            Value::String(value) => value.to_utf8().unwrap(),
            _ => panic!("input must be a string"),
        };
        assert_eq!(
            grimoria_wasm::wire_legacy_canonical_bytes(&input).unwrap(),
            expected
        );
    }
}

#[wasm_bindgen_test]
fn wasm_returns_a_structured_contract_error() {
    let error = grimoria_wasm::wire_bytes(
        r#"{"wireVersion":2,"operation":"apply_command","payload":null}"#,
    )
    .unwrap_err();
    let Value::Object(fields) = Value::parse(&error).expect("error is JSON") else {
        panic!("error must be an object");
    };
    let field = |name: &str| {
        fields
            .iter()
            .find(|(key, _)| key.to_utf8().as_deref() == Ok(name))
            .map(|(_, value)| value)
            .expect("error field exists")
    };
    assert_eq!(
        field("code"),
        &Value::String(grimoria_wire::Wtf16::from_utf8("engine-contract-violation"))
    );
    assert_eq!(
        field("kind"),
        &Value::String(grimoria_wire::Wtf16::from_utf8("contract"))
    );
}
