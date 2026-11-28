//! Portable wire fixture runner shared by native and WASM parity tests.

use grimoria_wire::json::WireError;
use grimoria_wire::{Value, Wtf16};

/// Runs every wire vector and returns the number checked.
pub fn run_wire_fixture(input: &str) -> Result<usize, WireError> {
    let root = Value::parse(input)?;
    let entries = match root {
        Value::Object(entries) => entries,
        _ => return Err(contract("fixture root must be an object")),
    };
    if number(&entries, "fixtureVersion")? != 1.0 || number(&entries, "wireVersion")? != 1.0 {
        return Err(contract("fixture version must be 1"));
    }
    let vectors = match entry(&entries, "vectors")? {
        Value::Array(vectors) => vectors,
        _ => return Err(contract("fixture vectors must be an array")),
    };
    for vector in vectors {
        let Value::Object(fields) = vector else {
            return Err(contract("fixture vector must be an object"));
        };
        let id = text(fields, "id")?;
        let source = text(fields, "input")?;
        let expected_wire = text(fields, "wire")?;
        let expected_canonical = text(fields, "canonical")?;
        let value = Value::parse(&source)?;
        let wire = value.to_wire();
        let canonical = value.to_canonical();
        if wire != expected_wire {
            return Err(contract(format!("wire bytes differ for {id}: {wire}")));
        }
        if canonical != expected_canonical {
            return Err(contract(format!(
                "canonical bytes differ for {id}: {canonical}"
            )));
        }
    }
    Ok(vectors.len())
}

fn contract(message: impl Into<String>) -> WireError {
    WireError::ContractViolation {
        message: message.into(),
    }
}

fn entry<'a>(entries: &'a [(Wtf16, Value)], key: &str) -> Result<&'a Value, WireError> {
    entries
        .iter()
        .find(|(name, _)| name.to_utf8().as_deref() == Ok(key))
        .map(|(_, value)| value)
        .ok_or_else(|| contract(format!("fixture is missing {key}")))
}

fn text(entries: &[(Wtf16, Value)], key: &str) -> Result<String, WireError> {
    match entry(entries, key)? {
        Value::String(value) => value
            .to_utf8()
            .map_err(|_| contract(format!("fixture field {key} is not valid UTF-8"))),
        _ => Err(contract(format!("fixture field {key} must be a string"))),
    }
}

fn number(entries: &[(Wtf16, Value)], key: &str) -> Result<f64, WireError> {
    match entry(entries, key)? {
        Value::Number(value) => Ok(*value),
        _ => Err(contract(format!("fixture field {key} must be a number"))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_committed_fixture_runs() {
        let fixture = include_str!("../../../fixtures/conformance/wire-serialization.json");
        assert_eq!(run_wire_fixture(fixture).unwrap(), 12);
    }
}
