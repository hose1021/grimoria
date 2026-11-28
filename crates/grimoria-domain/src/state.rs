//! Lossless game state for the first vertical slice.
//!
//! The state is the parsed JSON object. Unknown fields, nested values and
//! string code units are kept exactly; the slice only edits `notes`, `applied`
//! and `journal`.

use grimoria_wire::{Value, WireError, Wtf16};

/// One parsed `pg.game.v4` state.
#[derive(Clone, Debug, PartialEq)]
pub struct State {
    value: Value,
}

impl State {
    /// Parses a state object from strict JSON.
    pub fn parse(input: &str) -> Result<Self, WireError> {
        Self::from_value(Value::parse(input)?)
    }

    /// Wraps a parsed object.
    pub fn from_value(value: Value) -> Result<Self, WireError> {
        if matches!(value, Value::Object(_)) {
            Ok(Self { value })
        } else {
            Err(WireError::ContractViolation {
                message: "state must be a JSON object".to_string(),
            })
        }
    }

    /// The lossless state value.
    pub fn value(&self) -> &Value {
        &self.value
    }

    /// Serializes in ECMAScript wire order.
    pub fn to_json(&self) -> String {
        self.value.to_wire()
    }

    /// Reads one top-level field.
    pub fn get(&self, key: &str) -> Option<&Value> {
        entries(&self.value).and_then(|entries| field(entries, key))
    }

    /// Reads a top-level string field.
    pub fn string(&self, key: &str) -> Option<Wtf16> {
        match self.get(key) {
            Some(Value::String(text)) => Some(text.clone()),
            _ => None,
        }
    }

    /// Reads the current notes, or empty text when absent.
    pub fn notes(&self) -> Wtf16 {
        self.string("notes").unwrap_or_default()
    }

    /// Replaces only the notes field.
    pub fn set_notes(&mut self, notes: &Wtf16) {
        self.set("notes", Value::String(notes.clone()));
    }

    /// Replaces or appends one top-level field.
    pub fn set(&mut self, key: &str, value: Value) {
        let entries = entries_mut(&mut self.value);
        match entries
            .iter_mut()
            .find(|(name, _)| name.to_utf8().as_deref() == Ok(key))
        {
            Some((_, slot)) => *slot = value,
            None => entries.push((Wtf16::from_utf8(key), value)),
        }
    }

    /// Removes one top-level field.
    pub fn remove(&mut self, key: &str) {
        entries_mut(&mut self.value).retain(|(name, _)| name.to_utf8().as_deref() != Ok(key));
    }

    /// Clones the whole state value.
    pub fn to_value(&self) -> Value {
        self.value.clone()
    }
}

/// Borrows object entries.
pub fn entries(value: &Value) -> Option<&[(Wtf16, Value)]> {
    match value {
        Value::Object(entries) => Some(entries),
        _ => None,
    }
}

/// Borrows mutable object entries.
pub fn entries_mut(value: &mut Value) -> &mut Vec<(Wtf16, Value)> {
    match value {
        Value::Object(entries) => entries,
        _ => unreachable!("State is constructed from an object"),
    }
}

/// Reads one field from an object entry list.
pub fn field<'a>(entries: &'a [(Wtf16, Value)], key: &str) -> Option<&'a Value> {
    entries
        .iter()
        .find(|(name, _)| name.to_utf8().as_deref() == Ok(key))
        .map(|(_, value)| value)
}

/// Reads a field as text.
pub fn text(value: Option<&Value>) -> Option<Wtf16> {
    match value {
        Some(Value::String(text)) => Some(text.clone()),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_unknown_fields_and_numeric_keys() {
        let state =
            State::parse(r#"{"notes":"old","unknown":{"10":1,"2":2},"phase":"day"}"#).unwrap();
        assert_eq!(state.notes().to_utf8().unwrap(), "old");
        assert!(state.get("unknown").is_some());
        let mut next = state.clone();
        next.set_notes(&Wtf16::from_utf8("new"));
        assert_eq!(next.notes().to_utf8().unwrap(), "new");
        assert!(next.to_json().contains(r#""unknown":{"2":2,"10":1}"#));
    }
}
