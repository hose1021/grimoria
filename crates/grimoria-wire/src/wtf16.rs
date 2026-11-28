//! UTF-16 text that may contain unpaired surrogates.
//!
//! Rust `String` cannot represent a lone surrogate. ECMAScript strings can, and
//! JSON carries them as `\uXXXX` escapes. This type keeps the exact code units
//! through parsing, comparison and serialization.

use core::fmt;

/// Code units in UTF-16 order.
#[derive(Clone, Debug, Default, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Wtf16(Vec<u16>);

/// The first unpaired surrogate and its code-unit index.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LoneSurrogate {
    pub index: usize,
    pub unit: u16,
}

impl fmt::Display for LoneSurrogate {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "unpaired surrogate \\u{:04x} at code unit {}",
            self.unit, self.index
        )
    }
}

impl Wtf16 {
    /// Creates an empty string.
    pub fn new() -> Self {
        Self(Vec::new())
    }

    /// Encodes valid UTF-8 as UTF-16 code units.
    pub fn from_utf8(text: &str) -> Self {
        Self(text.encode_utf16().collect())
    }

    /// Keeps the supplied code units exactly.
    pub fn from_code_units(units: Vec<u16>) -> Self {
        Self(units)
    }

    /// A borrowed code-unit slice.
    pub fn as_code_units(&self) -> &[u16] {
        &self.0
    }

    /// Appends one code unit.
    pub fn push_unit(&mut self, unit: u16) {
        self.0.push(unit);
    }

    /// Appends valid UTF-8 as UTF-16 code units.
    pub fn push_str(&mut self, text: &str) {
        self.0.extend(text.encode_utf16());
    }

    /// True when every surrogate is paired.
    pub fn is_well_formed(&self) -> bool {
        self.to_utf8().is_ok()
    }

    /// Encodes as UTF-8, or reports the first unpaired surrogate.
    pub fn to_utf8(&self) -> Result<String, LoneSurrogate> {
        let mut text = String::new();
        let mut index = 0;
        while index < self.0.len() {
            let unit = self.0[index];
            if (0xD800..=0xDBFF).contains(&unit) {
                let low = self.0.get(index + 1).copied();
                if let Some(low) = low.filter(|low| (0xDC00..=0xDFFF).contains(low)) {
                    let scalar =
                        0x10000 + ((u32::from(unit) - 0xD800) << 10) + (u32::from(low) - 0xDC00);
                    text.push(char::from_u32(scalar).expect("a surrogate pair is a scalar"));
                    index += 2;
                    continue;
                }
                return Err(LoneSurrogate { index, unit });
            }
            if (0xDC00..=0xDFFF).contains(&unit) {
                return Err(LoneSurrogate { index, unit });
            }
            text.push(char::from_u32(u32::from(unit)).expect("a non-surrogate BMP unit"));
            index += 1;
        }
        Ok(text)
    }
}

impl From<&str> for Wtf16 {
    fn from(text: &str) -> Self {
        Self::from_utf8(text)
    }
}

impl From<String> for Wtf16 {
    fn from(text: String) -> Self {
        Self::from_utf8(&text)
    }
}

impl fmt::Display for Wtf16 {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.to_utf8().map_err(|_| fmt::Error)?.as_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_text_round_trips_through_utf16() {
        let text = Wtf16::from_utf8("café 😀");
        assert!(text.is_well_formed());
        assert_eq!(text.to_utf8().unwrap(), "café 😀");
        assert_eq!(text.as_code_units().len(), "café 😀".encode_utf16().count());
    }

    #[test]
    fn a_lone_surrogate_is_reported_and_kept() {
        let text = Wtf16::from_code_units(vec![b'a'.into(), 0xD800, b'b'.into()]);
        assert_eq!(
            text.to_utf8(),
            Err(LoneSurrogate {
                index: 1,
                unit: 0xD800
            })
        );
        assert_eq!(text.as_code_units(), &[0x61, 0xD800, 0x62]);
    }

    #[test]
    fn ordering_uses_utf16_code_units() {
        assert!(Wtf16::from_utf8("10") < Wtf16::from_utf8("2"));
        assert!(Wtf16::from_utf8("a") < Wtf16::from_utf8("b"));
    }
}
