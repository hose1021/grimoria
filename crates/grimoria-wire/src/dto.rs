//! Versioned request and response envelopes for the JSON boundary.

use core::fmt;

use crate::json::{Value, WireError};
use crate::wtf16::Wtf16;

/// Version of the request and response envelopes.
pub const WIRE_VERSION: u32 = 1;

/// Operations the boundary accepts.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Operation {
    ApplyCommand,
    PreviewCommand,
    ValidateCommand,
    Replay,
    ImportSave,
    ExportSave,
    CanonicalState,
    CanonicalBytes,
}

impl Operation {
    pub const ALL: [Operation; 8] = [
        Operation::ApplyCommand,
        Operation::PreviewCommand,
        Operation::ValidateCommand,
        Operation::Replay,
        Operation::ImportSave,
        Operation::ExportSave,
        Operation::CanonicalState,
        Operation::CanonicalBytes,
    ];

    /// The schema identifier of the operation.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::ApplyCommand => "apply_command",
            Self::PreviewCommand => "preview_command",
            Self::ValidateCommand => "validate_command",
            Self::Replay => "replay",
            Self::ImportSave => "import_save",
            Self::ExportSave => "export_save",
            Self::CanonicalState => "canonical_state",
            Self::CanonicalBytes => "canonical_bytes",
        }
    }

    fn parse(text: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|item| item.as_str() == text)
    }
}

impl fmt::Display for Operation {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// One boundary request.
#[derive(Clone, Debug, PartialEq)]
pub struct Request {
    pub version: u32,
    pub operation: Operation,
    pub payload: Value,
}

impl Request {
    /// Builds a request at the current version.
    pub fn new(operation: Operation, payload: Value) -> Self {
        Self {
            version: WIRE_VERSION,
            operation,
            payload,
        }
    }

    /// Parses and validates a request envelope.
    pub fn from_json(input: &str) -> Result<Self, WireError> {
        let mut version = None;
        let mut operation = None;
        let mut payload = None;
        for (key, value) in object_entries(Value::parse(input)?, "request")? {
            match key.to_utf8().as_deref() {
                Ok("wireVersion") => version = Some(version_value(&value)?),
                Ok("operation") => operation = Some(operation_value(&value)?),
                Ok("payload") => payload = Some(value),
                Ok(other) => {
                    return Err(contract(format!("unknown request field {other:?}")));
                }
                Err(_) => return Err(contract("request field name is not valid UTF-8")),
            }
        }
        Ok(Self {
            version: version.ok_or_else(|| contract("request is missing wireVersion"))?,
            operation: operation.ok_or_else(|| contract("request is missing operation"))?,
            payload: payload.ok_or_else(|| contract("request is missing payload"))?,
        })
    }

    /// Serializes in request field order.
    pub fn to_json(&self) -> String {
        Value::Object(vec![
            (key("wireVersion"), Value::Number(f64::from(self.version))),
            (
                key("operation"),
                Value::String(Wtf16::from(self.operation.as_str())),
            ),
            (key("payload"), self.payload.clone()),
        ])
        .to_wire()
    }
}

/// One boundary response.
#[derive(Clone, Debug, PartialEq)]
pub struct Response {
    pub version: u32,
    pub result: Value,
    pub state: Option<Value>,
}

impl Response {
    /// Builds a response at the current version.
    pub fn new(result: Value, state: Option<Value>) -> Self {
        Self {
            version: WIRE_VERSION,
            result,
            state,
        }
    }

    /// Parses and validates a response envelope.
    pub fn from_json(input: &str) -> Result<Self, WireError> {
        let mut version = None;
        let mut result = None;
        let mut state = None;
        for (key, value) in object_entries(Value::parse(input)?, "response")? {
            match key.to_utf8().as_deref() {
                Ok("wireVersion") => version = Some(version_value(&value)?),
                Ok("result") => result = Some(value),
                Ok("state") => state = Some(value),
                Ok(other) => {
                    return Err(contract(format!("unknown response field {other:?}")));
                }
                Err(_) => return Err(contract("response field name is not valid UTF-8")),
            }
        }
        Ok(Self {
            version: version.ok_or_else(|| contract("response is missing wireVersion"))?,
            result: result.ok_or_else(|| contract("response is missing result"))?,
            state,
        })
    }

    /// Serializes in response field order; an absent state stays absent.
    pub fn to_json(&self) -> String {
        let mut entries = vec![
            (key("wireVersion"), Value::Number(f64::from(self.version))),
            (key("result"), self.result.clone()),
        ];
        if let Some(state) = &self.state {
            entries.push((key("state"), state.clone()));
        }
        Value::Object(entries).to_wire()
    }
}

fn key(text: &str) -> Wtf16 {
    Wtf16::from_utf8(text)
}

fn contract(message: impl Into<String>) -> WireError {
    WireError::ContractViolation {
        message: message.into(),
    }
}

fn object_entries(value: Value, kind: &str) -> Result<Vec<(Wtf16, Value)>, WireError> {
    match value {
        Value::Object(entries) => Ok(entries),
        _ => Err(contract(format!("{kind} must be an object"))),
    }
}

fn version_value(value: &Value) -> Result<u32, WireError> {
    match value {
        Value::Number(number) if *number == f64::from(WIRE_VERSION) => Ok(WIRE_VERSION),
        Value::Number(number) if number.is_finite() => Err(contract(format!(
            "unsupported wireVersion {number}; expected {WIRE_VERSION}"
        ))),
        _ => Err(contract(format!(
            "wireVersion must be {WIRE_VERSION}, not another value"
        ))),
    }
}

fn operation_value(value: &Value) -> Result<Operation, WireError> {
    let Value::String(text) = value else {
        return Err(contract("operation must be a string"));
    };
    let text = text
        .to_utf8()
        .map_err(|_| contract("operation contains an unpaired surrogate"))?;
    Operation::parse(&text).ok_or_else(|| contract(format!("unknown operation {text:?}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_and_operations_are_pinned() {
        assert_eq!(WIRE_VERSION, 1);
        assert_eq!(
            Operation::ALL.map(Operation::as_str),
            [
                "apply_command",
                "preview_command",
                "validate_command",
                "replay",
                "import_save",
                "export_save",
                "canonical_state",
                "canonical_bytes"
            ]
        );
    }

    #[test]
    fn a_request_round_trips() {
        let request = Request::new(
            Operation::ApplyCommand,
            Value::Object(vec![(key("id"), Value::String(Wtf16::from_utf8("c1")))]),
        );
        assert_eq!(Request::from_json(&request.to_json()).unwrap(), request);
    }

    #[test]
    fn a_response_omits_an_absent_state() {
        let response = Response::new(Value::String(Wtf16::from_utf8("ok")), None);
        assert_eq!(response.to_json(), r#"{"wireVersion":1,"result":"ok"}"#);
        assert_eq!(Response::from_json(&response.to_json()).unwrap(), response);
    }

    #[test]
    fn a_response_keeps_an_explicit_state() {
        let response = Response::new(Value::Null, Some(Value::Bool(true)));
        assert_eq!(
            response.to_json(),
            r#"{"wireVersion":1,"result":null,"state":true}"#
        );
    }

    #[test]
    fn unknown_versions_operations_and_fields_fail() {
        assert!(
            Request::from_json(r#"{"wireVersion":2,"operation":"apply_command","payload":null}"#)
                .is_err()
        );
        assert!(
            Request::from_json(r#"{"wireVersion":1,"operation":"cutover","payload":null}"#)
                .is_err()
        );
        assert!(
            Request::from_json(
                r#"{"wireVersion":1,"operation":"apply_command","payload":null,"state":null}"#
            )
            .is_err()
        );
        assert!(Request::from_json(r#"{"wireVersion":1,"operation":"apply_command"}"#).is_err());
    }
}
