//! Strict JSON parsing and ECMAScript-compatible serialization.

use core::fmt;
use core::fmt::Write as _;
use ryu_js::Buffer;

use crate::wtf16::Wtf16;

/// A wire failure. Offsets are byte offsets in the input.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum WireError {
    Syntax {
        offset: usize,
        message: &'static str,
    },
    DuplicateKey {
        offset: usize,
    },
    NonFiniteNumber {
        offset: usize,
    },
    ContractViolation {
        message: String,
    },
}

impl fmt::Display for WireError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Syntax { offset, message } => {
                write!(formatter, "invalid JSON at byte {offset}: {message}")
            }
            Self::DuplicateKey { offset } => {
                write!(formatter, "duplicate object key at byte {offset}")
            }
            Self::NonFiniteNumber { offset } => {
                write!(formatter, "non-finite number at byte {offset}")
            }
            Self::ContractViolation { message } => formatter.write_str(message),
        }
    }
}

/// A canonical JSON value with ordered object entries.
#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    Null,
    Bool(bool),
    Number(f64),
    String(Wtf16),
    Array(Vec<Value>),
    Object(Vec<(Wtf16, Value)>),
}

const MAX_DEPTH: usize = 256;

impl Value {
    /// Parses strict JSON. Duplicate keys and non-finite numbers are rejected.
    pub fn parse(input: &str) -> Result<Self, WireError> {
        let mut parser = Parser {
            input,
            bytes: input.as_bytes(),
            index: 0,
        };
        let value = parser.value(0)?;
        parser.whitespace();
        if parser.index != parser.bytes.len() {
            return Err(parser.syntax("trailing input"));
        }
        Ok(value)
    }

    /// Serializes in the stored object order.
    pub fn to_wire(&self) -> String {
        self.render(false)
    }

    /// Serializes with UTF-16 sorted object keys.
    pub fn to_canonical(&self) -> String {
        self.render(true)
    }

    fn render(&self, canonical: bool) -> String {
        let mut output = String::new();
        write_value(&mut output, self, canonical);
        output
    }
}

struct Parser<'a> {
    input: &'a str,
    bytes: &'a [u8],
    index: usize,
}

impl Parser<'_> {
    fn syntax(&self, message: &'static str) -> WireError {
        WireError::Syntax {
            offset: self.index,
            message,
        }
    }

    fn whitespace(&mut self) {
        while matches!(
            self.bytes.get(self.index),
            Some(b' ' | b'\n' | b'\r' | b'\t')
        ) {
            self.index += 1;
        }
    }

    fn value(&mut self, depth: usize) -> Result<Value, WireError> {
        if depth > MAX_DEPTH {
            return Err(self.syntax("nesting exceeds the limit"));
        }
        self.whitespace();
        match self.bytes.get(self.index).copied() {
            Some(b'n') => {
                self.literal("null")?;
                Ok(Value::Null)
            }
            Some(b't') => {
                self.literal("true")?;
                Ok(Value::Bool(true))
            }
            Some(b'f') => {
                self.literal("false")?;
                Ok(Value::Bool(false))
            }
            Some(b'"') => Ok(Value::String(self.string()?)),
            Some(b'[') => self.array(depth),
            Some(b'{') => self.object(depth),
            Some(b'-' | b'0'..=b'9') => self.number(),
            _ => Err(self.syntax("expected a value")),
        }
    }

    fn literal(&mut self, literal: &str) -> Result<(), WireError> {
        if self.input[self.index..].starts_with(literal) {
            self.index += literal.len();
            Ok(())
        } else {
            Err(self.syntax("invalid literal"))
        }
    }

    fn array(&mut self, depth: usize) -> Result<Value, WireError> {
        self.index += 1;
        let mut values = Vec::new();
        self.whitespace();
        if self.bytes.get(self.index) == Some(&b']') {
            self.index += 1;
            return Ok(Value::Array(values));
        }
        loop {
            values.push(self.value(depth + 1)?);
            self.whitespace();
            match self.bytes.get(self.index) {
                Some(b',') => {
                    self.index += 1;
                    self.whitespace();
                }
                Some(b']') => {
                    self.index += 1;
                    return Ok(Value::Array(values));
                }
                _ => return Err(self.syntax("expected ',' or ']'")),
            }
        }
    }

    fn object(&mut self, depth: usize) -> Result<Value, WireError> {
        self.index += 1;
        let mut entries: Vec<(Wtf16, Value)> = Vec::new();
        self.whitespace();
        if self.bytes.get(self.index) == Some(&b'}') {
            self.index += 1;
            return Ok(Value::Object(entries));
        }
        loop {
            self.whitespace();
            if self.bytes.get(self.index) != Some(&b'"') {
                return Err(self.syntax("expected an object key"));
            }
            let key_offset = self.index;
            let key = self.string()?;
            if entries.iter().any(|(existing, _)| existing == &key) {
                return Err(WireError::DuplicateKey { offset: key_offset });
            }
            self.whitespace();
            if self.bytes.get(self.index) != Some(&b':') {
                return Err(self.syntax("expected ':'"));
            }
            self.index += 1;
            let value = self.value(depth + 1)?;
            entries.push((key, value));
            self.whitespace();
            match self.bytes.get(self.index) {
                Some(b',') => {
                    self.index += 1;
                }
                Some(b'}') => {
                    self.index += 1;
                    return Ok(Value::Object(entries));
                }
                _ => return Err(self.syntax("expected ',' or '}'")),
            }
        }
    }

    fn number(&mut self) -> Result<Value, WireError> {
        let start = self.index;
        if self.bytes.get(self.index) == Some(&b'-') {
            self.index += 1;
        }
        match self.bytes.get(self.index) {
            Some(b'0') => self.index += 1,
            Some(b'1'..=b'9') => {
                self.index += 1;
                while matches!(self.bytes.get(self.index), Some(b'0'..=b'9')) {
                    self.index += 1;
                }
            }
            _ => return Err(self.syntax("invalid number")),
        }
        if self.bytes.get(self.index) == Some(&b'.') {
            self.index += 1;
            self.digits()?;
        }
        if matches!(self.bytes.get(self.index), Some(b'e' | b'E')) {
            self.index += 1;
            if matches!(self.bytes.get(self.index), Some(b'+' | b'-')) {
                self.index += 1;
            }
            self.digits()?;
        }
        let token = &self.input[start..self.index];
        let number = token
            .parse::<f64>()
            .map_err(|_| self.syntax("invalid number"))?;
        if !number.is_finite() {
            return Err(WireError::NonFiniteNumber { offset: start });
        }
        Ok(Value::Number(number))
    }

    fn digits(&mut self) -> Result<(), WireError> {
        let start = self.index;
        while matches!(self.bytes.get(self.index), Some(b'0'..=b'9')) {
            self.index += 1;
        }
        if self.index == start {
            Err(self.syntax("expected a digit"))
        } else {
            Ok(())
        }
    }

    fn string(&mut self) -> Result<Wtf16, WireError> {
        self.index += 1;
        let mut text = Wtf16::new();
        loop {
            let Some(byte) = self.bytes.get(self.index).copied() else {
                return Err(self.syntax("unterminated string"));
            };
            match byte {
                b'"' => {
                    self.index += 1;
                    return Ok(text);
                }
                b'\\' => {
                    self.index += 1;
                    self.escape(&mut text)?;
                }
                0x00..=0x1F => return Err(self.syntax("unescaped control character")),
                0x20..=0x7F => {
                    text.push_unit(u16::from(byte));
                    self.index += 1;
                }
                _ => {
                    let character = self.input[self.index..]
                        .chars()
                        .next()
                        .ok_or_else(|| self.syntax("invalid UTF-8"))?;
                    let mut units = [0u16; 2];
                    for unit in character.encode_utf16(&mut units) {
                        text.push_unit(*unit);
                    }
                    self.index += character.len_utf8();
                }
            }
        }
    }

    fn escape(&mut self, text: &mut Wtf16) -> Result<(), WireError> {
        let Some(byte) = self.bytes.get(self.index).copied() else {
            return Err(self.syntax("unterminated escape"));
        };
        self.index += 1;
        match byte {
            b'"' => text.push_unit(b'"'.into()),
            b'\\' => text.push_unit(b'\\'.into()),
            b'/' => text.push_unit(b'/'.into()),
            b'b' => text.push_unit(0x08),
            b'f' => text.push_unit(0x0C),
            b'n' => text.push_unit(0x0A),
            b'r' => text.push_unit(0x0D),
            b't' => text.push_unit(0x09),
            b'u' => text.push_unit(self.hex4()?),
            _ => return Err(self.syntax("invalid escape")),
        }
        Ok(())
    }

    fn hex4(&mut self) -> Result<u16, WireError> {
        let mut value = 0u16;
        for _ in 0..4 {
            let Some(byte) = self.bytes.get(self.index).copied() else {
                return Err(self.syntax("short unicode escape"));
            };
            let digit = match byte {
                b'0'..=b'9' => u16::from(byte - b'0'),
                b'a'..=b'f' => u16::from(byte - b'a') + 10,
                b'A'..=b'F' => u16::from(byte - b'A') + 10,
                _ => return Err(self.syntax("invalid unicode escape")),
            };
            value = (value << 4) | digit;
            self.index += 1;
        }
        Ok(value)
    }
}

fn write_value(output: &mut String, value: &Value, canonical: bool) {
    match value {
        Value::Null => output.push_str("null"),
        Value::Bool(true) => output.push_str("true"),
        Value::Bool(false) => output.push_str("false"),
        Value::Number(number) => write_number(output, *number),
        Value::String(text) => write_string(output, text),
        Value::Array(values) => {
            output.push('[');
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                write_value(output, value, canonical);
            }
            output.push(']');
        }
        Value::Object(entries) => {
            output.push('{');
            if canonical {
                let mut ordered: Vec<&(Wtf16, Value)> = entries.iter().collect();
                ordered.sort_by(|left, right| left.0.cmp(&right.0));
                write_entries(output, ordered.into_iter(), canonical);
            } else {
                write_entries(output, entries.iter(), canonical);
            }
            output.push('}');
        }
    }
}

fn write_entries<'a>(
    output: &mut String,
    entries: impl Iterator<Item = &'a (Wtf16, Value)>,
    canonical: bool,
) {
    for (index, (key, value)) in entries.enumerate() {
        if index > 0 {
            output.push(',');
        }
        write_string(output, key);
        output.push(':');
        write_value(output, value, canonical);
    }
}

fn write_number(output: &mut String, number: f64) {
    if !number.is_finite() {
        output.push_str("null");
    } else if number == 0.0 {
        output.push('0');
    } else {
        let mut buffer = Buffer::new();
        output.push_str(buffer.format_finite(number));
    }
}

fn write_string(output: &mut String, text: &Wtf16) {
    output.push('"');
    let units = text.as_code_units();
    let mut index = 0;
    while index < units.len() {
        let unit = units[index];
        if (0xD800..=0xDBFF).contains(&unit) {
            if let Some(low) = units
                .get(index + 1)
                .copied()
                .filter(|low| (0xDC00..=0xDFFF).contains(low))
            {
                let scalar =
                    0x10000 + ((u32::from(unit) - 0xD800) << 10) + (u32::from(low) - 0xDC00);
                output.push(char::from_u32(scalar).expect("a surrogate pair is a scalar"));
                index += 2;
                continue;
            }
            write!(output, "\\u{unit:04x}").expect("writing to a String cannot fail");
        } else if (0xDC00..=0xDFFF).contains(&unit) {
            write!(output, "\\u{unit:04x}").expect("writing to a String cannot fail");
        } else {
            write_scalar(output, unit);
        }
        index += 1;
    }
    output.push('"');
}

fn write_scalar(output: &mut String, unit: u16) {
    match unit {
        0x08 => output.push_str("\\b"),
        0x09 => output.push_str("\\t"),
        0x0A => output.push_str("\\n"),
        0x0C => output.push_str("\\f"),
        0x0D => output.push_str("\\r"),
        0x22 => output.push_str("\\\""),
        0x5C => output.push_str("\\\\"),
        0x00..=0x1F => write!(output, "\\u{unit:04x}").expect("writing to a String cannot fail"),
        _ => output.push(char::from_u32(u32::from(unit)).expect("a non-surrogate BMP unit")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_and_serializes_nested_values() {
        let value = Value::parse(r#"{"a":[1,true,null,"x"],"b":{"c":2}}"#).unwrap();
        assert_eq!(value.to_wire(), r#"{"a":[1,true,null,"x"],"b":{"c":2}}"#);
    }

    #[test]
    fn canonical_keys_sort_by_utf16_code_units() {
        let value = Value::parse(r#"{"b":1,"2":2,"1":3,"10":4,"a":0}"#).unwrap();
        assert_eq!(value.to_wire(), r#"{"b":1,"2":2,"1":3,"10":4,"a":0}"#);
        assert_eq!(value.to_canonical(), r#"{"1":3,"10":4,"2":2,"a":0,"b":1}"#);
    }

    #[test]
    fn number_formatting_matches_ecmascript() {
        let cases = [
            ("1.0", "1"),
            ("1e21", "1e+21"),
            ("1e-7", "1e-7"),
            ("-0", "0"),
            ("9007199254740993", "9007199254740992"),
            ("0.1", "0.1"),
            ("1e-6", "0.000001"),
            ("123456789012345678901", "123456789012345680000"),
        ];
        for (input, expected) in cases {
            assert_eq!(Value::parse(input).unwrap().to_wire(), expected, "{input}");
        }
    }

    #[test]
    fn lone_surrogates_are_escaped_and_pairs_are_utf8() {
        assert_eq!(
            Value::parse(r#""\ud800""#).unwrap().to_wire(),
            r#""\ud800""#
        );
        assert_eq!(
            Value::parse(r#""a\ud800b""#).unwrap().to_wire(),
            r#""a\ud800b""#
        );
        assert_eq!(
            Value::parse(r#""\ud83d\ude00""#).unwrap().to_wire(),
            "\"😀\""
        );
        assert_eq!(
            Value::parse(r#""\u0000""#).unwrap().to_wire(),
            r#""\u0000""#
        );
    }

    #[test]
    fn control_and_quote_escapes_match_json_stringify() {
        let value = Value::parse(r#""a\"b\\c\n\t\b\f\r/""#).unwrap();
        assert_eq!(value.to_wire(), r#""a\"b\\c\n\t\b\f\r/""#);
    }

    #[test]
    fn absent_keys_stay_absent_and_null_persists() {
        let value = Value::parse(r#"{"present":null,"value":1}"#).unwrap();
        assert_eq!(value.to_wire(), r#"{"present":null,"value":1}"#);
        assert!(!value.to_wire().contains("missing"));
    }

    #[test]
    fn duplicate_keys_and_non_finite_numbers_fail() {
        assert!(matches!(
            Value::parse(r#"{"a":1,"a":2}"#),
            Err(WireError::DuplicateKey { .. })
        ));
        assert!(matches!(
            Value::parse("1e400"),
            Err(WireError::NonFiniteNumber { .. })
        ));
        assert!(Value::parse("01").is_err());
        assert!(Value::parse("1.").is_err());
        assert!(Value::parse(r#"{"a":1} trailing"#).is_err());
    }

    #[test]
    fn empty_input_fails() {
        assert!(Value::parse("").is_err());
        assert!(Value::parse("   ").is_err());
    }
}
