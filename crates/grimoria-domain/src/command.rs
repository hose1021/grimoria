//! Deterministic `setNotes` vertical slice.
//!
//! The slice prepares one command envelope, validates it, previews or applies
//! it, and replays journals made of the same command. Other command types fail
//! explicitly. Unknown state fields are preserved by [`State`].

use grimoria_wire::{Operation, Value, WireError, Wtf16};

use crate::state::{State, entries, field, text};

/// Current TypeScript ruleset version.
pub const RULESET_VERSION: &str = "tb-bmr-snv-2026-11-24";

/// Every historical ruleset the TypeScript engine accepts.
pub const SUPPORTED_RULESET_VERSIONS: [&str; 15] = [
    "tb-bmr-snv-2026-11-10",
    "tb-bmr-snv-2026-11-16",
    "tb-bmr-snv-2026-11-17",
    "tb-bmr-snv-2026-11-17.1",
    "tb-bmr-snv-2026-11-17.2",
    "tb-bmr-snv-2026-11-17.3",
    "tb-bmr-snv-2026-11-17.4",
    "tb-bmr-snv-2026-11-18",
    "tb-bmr-snv-2026-11-19",
    "tb-bmr-snv-2026-11-20",
    "tb-bmr-snv-2026-11-20.1",
    "tb-bmr-snv-2026-11-21",
    "tb-bmr-snv-2026-11-21.1",
    "tb-bmr-snv-2026-11-23",
    "tb-bmr-snv-2026-11-24",
];

/// Host-supplied deterministic inputs. `seed` is reserved for later slices.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Inputs {
    pub timestamp: Wtf16,
    pub seed: Wtf16,
    pub id: Wtf16,
}

impl Inputs {
    /// Parses `{ "timestamp": ..., "seed": ..., "id": ... }`.
    pub fn parse(input: &str) -> Result<Self, WireError> {
        let value = Value::parse(input)?;
        let entries = entries(&value).ok_or_else(|| contract("inputs must be an object"))?;
        Ok(Self {
            timestamp: required_text(entries, "timestamp")?,
            seed: required_text(entries, "seed")?,
            id: required_text(entries, "id")?,
        })
    }
}

/// A prepared command with its legacy fingerprint.
#[derive(Clone, Debug)]
pub struct PreparedCommand {
    pub id: Wtf16,
    pub type_name: &'static str,
    pub payload: Value,
    pub at: Wtf16,
    pub ruleset_version: Wtf16,
    pub fingerprint: Wtf16,
    pub identity: Wtf16,
}

/// Prepares and validates one command envelope.
pub fn prepare(command: &Value, inputs: &Inputs) -> Result<PreparedCommand, Value> {
    let entries = entries(command)
        .ok_or_else(|| rejected_plain("Команда отсутствует.", "command-unknown"))?;
    let raw_type = text(field(entries, "type"))
        .and_then(|value| value.to_utf8().ok())
        .unwrap_or_default();
    if raw_type != "setNotes" {
        let reason = if raw_type.is_empty() {
            "Неизвестная команда: ".to_string()
        } else {
            format!("Неизвестная команда: {raw_type}")
        };
        return Err(rejected_plain(&reason, "command-unknown"));
    }
    let id = match field(entries, "id") {
        Some(Value::String(value)) if !value.as_code_units().is_empty() => value.clone(),
        Some(Value::String(_)) | Some(_) => {
            return Err(rejected_plain("У команды нет id.", "command-missing-id"));
        }
        None => inputs.id.clone(),
    };
    if id.as_code_units().is_empty() {
        return Err(rejected_plain("У команды нет id.", "command-missing-id"));
    }
    let payload = match field(entries, "payload") {
        None | Some(Value::Null) => Value::Object(Vec::new()),
        Some(Value::Object(_)) => field(entries, "payload").unwrap().clone(),
        Some(_) => {
            return Err(rejected_plain(
                "Некорректные данные команды.",
                "command-payload",
            ));
        }
    };
    validate_set_notes_payload(&payload)?;
    let at = match field(entries, "at") {
        None => inputs.timestamp.clone(),
        Some(Value::String(value)) if valid_timestamp(value) => value.clone(),
        Some(_) => {
            return Err(rejected_plain(
                "Некорректная отметка времени команды.",
                "command-at",
            ));
        }
    };
    let ruleset_version = match field(entries, "rulesetVersion") {
        None => Wtf16::from_utf8(RULESET_VERSION),
        Some(Value::String(value)) if supported_version(value) => value.clone(),
        Some(Value::String(value)) => {
            return Err(rejected_plain(
                &format!(
                    "Версия правил не поддерживается: {}",
                    value.to_utf8().unwrap_or_default()
                ),
                "ruleset-version-unsupported",
            ));
        }
        Some(_) => {
            return Err(rejected_plain(
                "Версия правил не поддерживается: ",
                "ruleset-version-unsupported",
            ));
        }
    };
    let canonical = Value::Object(vec![
        (
            field_key("type"),
            Value::String(Wtf16::from_utf8("setNotes")),
        ),
        (field_key("payload"), payload.clone()),
        (
            field_key("rulesetVersion"),
            Value::String(ruleset_version.clone()),
        ),
    ])
    .to_legacy_canonical();
    let fingerprint = Wtf16::from_utf8(&canonical);
    let identity = Wtf16::from_utf8(&identity_of(&fingerprint));
    Ok(PreparedCommand {
        id,
        type_name: "setNotes",
        payload,
        at,
        ruleset_version,
        fingerprint,
        identity,
    })
}

fn validate_set_notes_payload(payload: &Value) -> Result<(), Value> {
    let entries = entries(payload).expect("payload is an object");
    for (name, value) in entries {
        if name.to_utf8().as_deref() != Ok("notes") {
            return Err(rejected_plain(
                &format!(
                    "Unknown field '{}' in setNotes.",
                    name.to_utf8().unwrap_or_default()
                ),
                "command-payload-unknown-field",
            ));
        }
        if !matches!(value, Value::String(_)) {
            return Err(rejected_plain(
                "Wrong type for field 'notes' in setNotes.",
                "command-payload-type",
            ));
        }
    }
    Ok(())
}

/// Validates a command without changing state.
pub fn validate(state: &State, command: &Value, inputs: &Inputs) -> Value {
    let prepared = match prepare(command, inputs) {
        Ok(prepared) => prepared,
        Err(rejection) => return rejection,
    };
    if let Some(stored) = stored_command(state, &prepared.id) {
        if !matches_stored(&stored, &prepared) {
            return conflict(&prepared);
        }
        return object(vec![
            ("status", string("allowed")),
            ("id", Value::String(prepared.id.clone())),
            ("type", string("setNotes")),
            ("idempotent", Value::Bool(true)),
        ]);
    }
    object(vec![
        ("status", string("allowed")),
        ("id", Value::String(prepared.id)),
        ("type", string("setNotes")),
        ("result", object(vec![("ok", Value::Bool(true))])),
        ("followUp", Value::Null),
    ])
}

/// Previews a command without changing state.
pub fn preview(state: &State, command: &Value, inputs: &Inputs) -> Value {
    let prepared = match prepare(command, inputs) {
        Ok(prepared) => prepared,
        Err(rejection) => return rejection,
    };
    if let Some(stored) = stored_command(state, &prepared.id) {
        if !matches_stored(&stored, &prepared) {
            return conflict(&prepared);
        }
        return object(vec![
            ("status", string("allowed")),
            ("id", Value::String(prepared.id)),
            ("type", string("setNotes")),
            ("idempotent", Value::Bool(true)),
            ("at", Value::String(stored.at)),
            ("events", Value::Array(Vec::new())),
            ("changes", Value::Null),
            ("future", future_of(state)),
        ]);
    }
    let after = apply_notes(state, &prepared);
    let events = notes_events(state, &after, &prepared);
    object(vec![
        ("status", string("allowed")),
        ("id", Value::String(prepared.id)),
        ("type", string("setNotes")),
        ("at", Value::String(prepared.at.clone())),
        ("result", object(vec![("ok", Value::Bool(true))])),
        ("followUp", Value::Null),
        ("events", Value::Array(events.clone())),
        ("changes", summarize(state, &after, &events)),
        ("future", future_of(&after)),
    ])
}

/// Applies a command and mutates the state.
pub fn apply(state: &mut State, command: &Value, inputs: &Inputs) -> Value {
    let prepared = match prepare(command, inputs) {
        Ok(prepared) => prepared,
        Err(rejection) => return rejection,
    };
    if let Some(stored) = stored_command(state, &prepared.id) {
        if !matches_stored(&stored, &prepared) {
            return conflict(&prepared);
        }
        return object(vec![
            ("status", string("allowed")),
            ("id", Value::String(prepared.id)),
            ("type", string("setNotes")),
            ("idempotent", Value::Bool(true)),
            ("at", Value::String(stored.at)),
            ("events", Value::Array(Vec::new())),
            ("result", stored.result),
            ("followUp", stored.follow_up),
            ("undoable", Value::Bool(stored.undoable)),
        ]);
    }
    let before = state.clone();
    let after = apply_notes(state, &prepared);
    let events = notes_events(&before, &after, &prepared);
    let summary = summarize(&before, &after, &events);
    let base = if !matches!(journal_base(state), Some(value) if !matches!(value, Value::Null)) {
        let mut base = before.clone();
        base.set("applied", object(Vec::new()));
        if let Some(existing) = before.get("applied") {
            base.set("applied", existing.clone());
        }
        base.remove("journal");
        Some(base)
    } else {
        None
    };
    *state = after;
    record_applied(state, &prepared);
    record_journal(state, &prepared, base);
    object(vec![
        ("status", string("allowed")),
        ("id", Value::String(prepared.id)),
        ("type", string("setNotes")),
        ("at", Value::String(prepared.at)),
        ("result", object(vec![("ok", Value::Bool(true))])),
        ("followUp", Value::Null),
        ("events", Value::Array(events)),
        ("changes", summary),
        ("undoable", Value::Bool(false)),
        ("resetHistory", Value::Bool(false)),
    ])
}

/// Replays a journal made only of `setNotes` entries.
pub fn replay(state: &mut State) -> Value {
    let journal = match state.get("journal") {
        Some(Value::Object(_)) => state.get("journal").unwrap().clone(),
        _ => {
            return journal_error(
                "Журнал команд отсутствует: воспроизведение невозможно.",
                None,
            );
        }
    };
    let journal_entries = entries(&journal).unwrap_or(&[]);
    let base = match field(journal_entries, "base") {
        Some(Value::Null) | None => {
            return journal_error(
                "Журнал не содержит базового состояния: воспроизведение невозможно.",
                None,
            );
        }
        Some(value) => State::from_value(value.clone()).unwrap_or_else(|_| {
            State::from_value(Value::Object(Vec::new())).expect("empty object")
        }),
    };
    let list = match field(journal_entries, "entries") {
        Some(Value::Array(entries)) => entries.clone(),
        _ => {
            return journal_error(
                "Журнал команд отсутствует: воспроизведение невозможно.",
                None,
            );
        }
    };
    let mut current = base.clone();
    current.set("journal", Value::Object(Vec::new()));
    let base_for_journal = base.to_value();
    current.set(
        "journal",
        object(vec![
            ("base", base_for_journal),
            ("entries", Value::Array(Vec::new())),
        ]),
    );
    let mut events = Vec::new();
    for entry in list {
        let entry_entries = entries(&entry).unwrap_or(&[]);
        let entry_id = text(field(entry_entries, "id")).unwrap_or_default();
        let type_name = text(field(entry_entries, "type")).unwrap_or_default();
        if type_name != Wtf16::from_utf8("setNotes") {
            return journal_error(
                &format!(
                    "Запись журнала «{}» не воспроизводится: команда вне вертикального среза.",
                    entry_id.to_utf8().unwrap_or_default()
                ),
                Some(entry_id),
            );
        }
        let command = Value::Object(vec![
            (field_key("id"), Value::String(entry_id.clone())),
            (field_key("type"), Value::String(type_name)),
            (
                field_key("payload"),
                field(entry_entries, "payload")
                    .cloned()
                    .unwrap_or(Value::Null),
            ),
            (
                field_key("at"),
                field(entry_entries, "at").cloned().unwrap_or(Value::Null),
            ),
            (
                field_key("rulesetVersion"),
                field(entry_entries, "rulesetVersion")
                    .cloned()
                    .unwrap_or(Value::Null),
            ),
        ]);
        let inputs = Inputs {
            timestamp: Wtf16::from_utf8(""),
            seed: Wtf16::from_utf8(""),
            id: entry_id.clone(),
        };
        let result = apply(&mut current, &command, &inputs);
        if result_status(&result) != Some("allowed".to_string()) {
            return journal_error(
                &format!(
                    "Запись журнала «{}» не воспроизводится.",
                    entry_id.to_utf8().unwrap_or_default()
                ),
                Some(entry_id),
            );
        }
        if result_field_bool(&result, "idempotent") == Some(true) {
            return journal_error(
                &format!(
                    "Запись журнала «{}» уже была применена в базовом состоянии.",
                    entry_id.to_utf8().unwrap_or_default()
                ),
                Some(entry_id),
            );
        }
        if let Some(Value::Array(more)) = field(entries(&result).unwrap_or(&[]), "events") {
            events.extend(more.clone());
        }
        let _ = &inputs.seed;
    }
    place_journal(&mut current);
    *state = current;
    object(vec![
        ("ok", Value::Bool(true)),
        ("state", state.to_value()),
        ("events", Value::Array(events)),
    ])
}

fn apply_notes(state: &State, prepared: &PreparedCommand) -> State {
    let mut after = state.clone();
    after.set_notes(&prepared_notes(&prepared.payload));
    after
}

fn prepared_notes(payload: &Value) -> Wtf16 {
    let fields = entries(payload).unwrap_or(&[]);
    text(field(fields, "notes")).unwrap_or_default()
}

struct Stored {
    type_name: Wtf16,
    fingerprint: Option<Wtf16>,
    identity: Option<Wtf16>,
    at: Wtf16,
    result: Value,
    follow_up: Value,
    undoable: bool,
}

fn stored_command(state: &State, id: &Wtf16) -> Option<Stored> {
    if let Some(applied) = state.get("applied").and_then(entries) {
        for (name, value) in applied {
            if name == id {
                let fields = entries(value)?;
                return Some(Stored {
                    type_name: text(field(fields, "type")).unwrap_or_default(),
                    fingerprint: text(field(fields, "fingerprint")),
                    identity: text(field(fields, "identity")),
                    at: text(field(fields, "at")).unwrap_or_default(),
                    result: field(fields, "result").cloned().unwrap_or(Value::Null),
                    follow_up: field(fields, "followUp").cloned().unwrap_or(Value::Null),
                    undoable: !matches!(field(fields, "undoable"), Some(Value::Bool(false))),
                });
            }
        }
    }
    let journal = state.get("journal")?.clone();
    let journal_entries = entries(&journal)?;
    let list = match field(journal_entries, "entries") {
        Some(Value::Array(list)) => list,
        _ => return None,
    };
    for entry in list {
        let fields = entries(entry)?;
        if text(field(fields, "id")).as_ref() == Some(id) {
            return Some(Stored {
                type_name: text(field(fields, "type")).unwrap_or_default(),
                fingerprint: text(field(fields, "fingerprint")),
                identity: None,
                at: text(field(fields, "at")).unwrap_or_default(),
                result: Value::Null,
                follow_up: Value::Null,
                undoable: !matches!(field(fields, "undoable"), Some(Value::Bool(false))),
            });
        }
    }
    None
}

fn matches_stored(stored: &Stored, prepared: &PreparedCommand) -> bool {
    if let Some(identity) = &stored.identity {
        return identity == &prepared.identity;
    }
    if let Some(fingerprint) = &stored.fingerprint {
        return fingerprint == &prepared.fingerprint;
    }
    stored.type_name == Wtf16::from_utf8(prepared.type_name)
}

fn journal_base(state: &State) -> Option<&Value> {
    field(entries(state.get("journal")?)?, "base")
}

fn record_applied(state: &mut State, prepared: &PreparedCommand) {
    let mut applied = match state.get("applied").cloned() {
        Some(Value::Object(entries)) => entries,
        _ => Vec::new(),
    };
    let entry = object(vec![
        ("type", string("setNotes")),
        ("at", Value::String(prepared.at.clone())),
        (
            "rulesetVersion",
            Value::String(prepared.ruleset_version.clone()),
        ),
        ("identity", Value::String(prepared.identity.clone())),
        ("followUp", Value::Null),
        ("result", Value::Null),
        ("undoable", Value::Bool(false)),
    ]);
    if let Some((_, slot)) = applied.iter_mut().find(|(name, _)| name == &prepared.id) {
        *slot = entry;
    } else {
        applied.push((prepared.id.clone(), entry));
    }
    state.set("applied", Value::Object(applied));
}

fn record_journal(state: &mut State, prepared: &PreparedCommand, base: Option<State>) {
    let mut journal_entries = match state.get("journal").cloned() {
        Some(Value::Object(entries)) => entries,
        _ => Vec::new(),
    };
    let missing_base = match field(&journal_entries, "base") {
        None | Some(Value::Null) => true,
        Some(_) => false,
    };
    if let (true, Some(base)) = (missing_base, base) {
        if let Some((_, slot)) = journal_entries
            .iter_mut()
            .find(|(name, _)| name.to_utf8().as_deref() == Ok("base"))
        {
            *slot = base.to_value();
        } else {
            journal_entries.push((field_key("base"), base.to_value()));
        }
    }
    let mut list = match field(&journal_entries, "entries").cloned() {
        Some(Value::Array(list)) => list,
        _ => Vec::new(),
    };
    let entry = object(vec![
        ("id", Value::String(prepared.id.clone())),
        ("type", string("setNotes")),
        ("payload", prepared.payload.clone()),
        ("at", Value::String(prepared.at.clone())),
        (
            "rulesetVersion",
            Value::String(prepared.ruleset_version.clone()),
        ),
        ("fingerprint", Value::String(prepared.fingerprint.clone())),
        ("undoable", Value::Bool(false)),
    ]);
    let coalesce = list.last().is_some_and(|last| {
        let fields = entries(last).unwrap_or(&[]);
        text(field(fields, "type")) == Some(Wtf16::from_utf8("setNotes"))
            && matches!(field(fields, "undoable"), Some(Value::Bool(false)))
    });
    if coalesce {
        *list.last_mut().unwrap() = entry;
    } else {
        list.push(entry);
    }
    if let Some(slot) = journal_entries
        .iter_mut()
        .find(|(name, _)| name.to_utf8().as_deref() == Ok("entries"))
    {
        slot.1 = Value::Array(list);
    } else {
        journal_entries.push((field_key("entries"), Value::Array(list)));
    }
    state.set("journal", Value::Object(journal_entries));
}

fn notes_events(before: &State, after: &State, prepared: &PreparedCommand) -> Vec<Value> {
    if before.notes() == after.notes() {
        return Vec::new();
    }
    vec![object(vec![
        (
            "id",
            Value::String(Wtf16::from_utf8(&format!(
                "{}:1",
                prepared.id.to_utf8().unwrap_or_default()
            ))),
        ),
        ("type", string("notes.changed")),
        ("commandId", Value::String(prepared.id.clone())),
        ("commandType", string("setNotes")),
        ("at", Value::String(prepared.at.clone())),
        (
            "phase",
            Value::String(before.string("phase").unwrap_or_default()),
        ),
        (
            "payload",
            object(vec![("notes", Value::String(after.notes()))]),
        ),
    ])]
}

fn summarize(before: &State, after: &State, events: &[Value]) -> Value {
    let winner = after
        .get("winner")
        .filter(|value| !matches!(value, Value::Null))
        .map(winner_value)
        .unwrap_or(Value::Null);
    let _ = before;
    object(vec![
        ("events", Value::Number(events.len() as f64)),
        ("deaths", Value::Array(Vec::new())),
        ("phase", Value::Null),
        ("winner", winner),
        (
            "effects",
            object(vec![
                ("added", Value::Array(Vec::new())),
                ("deactivated", Value::Array(Vec::new())),
            ]),
        ),
        (
            "queue",
            object(vec![
                ("added", Value::Array(Vec::new())),
                ("completed", Value::Array(Vec::new())),
                ("skipped", Value::Array(Vec::new())),
            ]),
        ),
    ])
}

fn future_of(state: &State) -> Value {
    let queue = match state
        .get("night")
        .and_then(entries)
        .and_then(|e| field(e, "queue"))
    {
        Some(Value::Array(queue)) => queue.clone(),
        _ => Vec::new(),
    };
    let effects = match state.get("effects") {
        Some(Value::Array(effects)) => effects.clone(),
        _ => Vec::new(),
    };
    let pending = queue
        .iter()
        .filter(|step| {
            let fields = entries(step).unwrap_or(&[]);
            !matches!(field(fields, "done"), Some(Value::Bool(true)))
                && !matches!(field(fields, "skipped"), Some(Value::Bool(true)))
        })
        .map(|step| {
            let fields = entries(step).unwrap_or(&[]);
            object(vec![
                ("key", field(fields, "key").cloned().unwrap_or(Value::Null)),
                ("roleId", nullable_text(field(fields, "roleId"))),
                ("system", nullable_text(field(fields, "system"))),
                ("actorId", nullable_text(field(fields, "actorId"))),
            ])
        })
        .collect();
    let active: Vec<Value> = effects
        .iter()
        .filter(|effect| {
            let fields = entries(effect).unwrap_or(&[]);
            !matches!(field(fields, "active"), Some(Value::Bool(false)))
        })
        .map(active_effect_value)
        .collect();
    let delayed: Vec<Value> = effects
        .iter()
        .filter(|effect| {
            let fields = entries(effect).unwrap_or(&[]);
            matches!(field(fields, "expires"), Some(value) if !matches!(value, Value::Null))
                || matches!(field(fields, "resolve"), Some(value) if !matches!(value, Value::Null))
        })
        .map(delayed_effect_value)
        .collect();
    let pending_inheritance = queue
        .iter()
        .find(|step| {
            let fields = entries(step).unwrap_or(&[]);
            field(fields, "pending")
                .and_then(entries)
                .is_some_and(|pending| {
                    text(field(pending, "kind")) == Some(Wtf16::from_utf8("demon-inheritance"))
                })
        })
        .cloned()
        .unwrap_or(Value::Null);
    object(vec![
        (
            "phase",
            Value::String(state.string("phase").unwrap_or_default()),
        ),
        (
            "winner",
            state
                .get("winner")
                .filter(|value| !matches!(value, Value::Null))
                .map(winner_value)
                .unwrap_or(Value::Null),
        ),
        ("followUp", Value::Null),
        ("pendingSteps", Value::Array(pending)),
        ("activeEffects", Value::Array(active)),
        ("delayedEffects", Value::Array(delayed)),
        ("pendingInheritance", pending_inheritance),
    ])
}

fn active_effect_value(effect: &Value) -> Value {
    let fields = entries(effect).unwrap_or(&[]);
    let mut values = Vec::new();
    for name in ["id", "kind", "sourceId", "targetId"] {
        if let Some(value) = field(fields, name) {
            values.push((name, value.clone()));
        }
    }
    for name in ["expires", "resolve", "suspended"] {
        values.push((name, field(fields, name).cloned().unwrap_or(Value::Null)));
    }
    values.push((
        "resumeOnHealthy",
        Value::Bool(matches!(
            field(fields, "resumeOnHealthy"),
            Some(Value::Bool(true))
        )),
    ));
    object(values)
}

fn delayed_effect_value(effect: &Value) -> Value {
    let fields = entries(effect).unwrap_or(&[]);
    let mut values = Vec::new();
    for name in ["id", "kind", "targetId"] {
        if let Some(value) = field(fields, name) {
            values.push((name, value.clone()));
        }
    }
    for name in ["expires", "resolve", "suspended"] {
        values.push((name, field(fields, name).cloned().unwrap_or(Value::Null)));
    }
    values.push((
        "resumeOnHealthy",
        Value::Bool(matches!(
            field(fields, "resumeOnHealthy"),
            Some(Value::Bool(true))
        )),
    ));
    object(values)
}

fn winner_value(winner: &Value) -> Value {
    let fields = entries(winner).unwrap_or(&[]);
    let mut result = Vec::new();
    if let Some(team) = field(fields, "team") {
        result.push((field_key("team"), team.clone()));
    }
    if let Some(reason) = field(fields, "reason") {
        result.push((field_key("reason"), reason.clone()));
    }
    Value::Object(result)
}

fn nullable_text(value: Option<&Value>) -> Value {
    match value {
        Some(Value::String(text)) => Value::String(text.clone()),
        _ => Value::Null,
    }
}

fn supported_version(version: &Wtf16) -> bool {
    let Ok(version) = version.to_utf8() else {
        return false;
    };
    SUPPORTED_RULESET_VERSIONS.contains(&version.as_str())
}

fn valid_timestamp(value: &Wtf16) -> bool {
    value
        .to_utf8()
        .ok()
        .is_some_and(|text| text.len() >= 20 && text.is_char_boundary(4) && text.contains('T'))
}

fn identity_of(fingerprint: &Wtf16) -> String {
    let mut result = String::new();
    let text = fingerprint.to_utf8().unwrap_or_default();
    for salt in 0..4 {
        let mut hash = 2166136261u32;
        for unit in format!("{salt}|{text}").encode_utf16() {
            hash ^= u32::from(unit);
            hash = hash.wrapping_mul(16777619);
        }
        result.push_str(&format!("{hash:08x}"));
    }
    result
}

fn conflict(prepared: &PreparedCommand) -> Value {
    object(vec![
        ("status", string("rejected")),
        ("id", Value::String(prepared.id.clone())),
        ("type", string("setNotes")),
        (
            "reason",
            string("Id команды уже использован для другого действия."),
        ),
        ("errorCode", string("command-id-conflict")),
    ])
}

fn rejected_plain(reason: &str, code: &str) -> Value {
    object(vec![
        ("status", string("rejected")),
        ("id", Value::Null),
        ("type", Value::Null),
        ("reason", Value::String(Wtf16::from_utf8(reason))),
        ("errorCode", string(code)),
    ])
}

fn journal_error(message: &str, entry_id: Option<Wtf16>) -> Value {
    object(vec![
        ("ok", Value::Bool(false)),
        ("errorCode", string("journal-dependency")),
        ("error", Value::String(Wtf16::from_utf8(message))),
        ("entryId", entry_id.map_or(Value::Null, Value::String)),
        ("errors", Value::Null),
    ])
}

fn result_status(result: &Value) -> Option<String> {
    text(field(entries(result)?, "status")).and_then(|value| value.to_utf8().ok())
}

fn result_field_bool(result: &Value, key: &str) -> Option<bool> {
    match field(entries(result)?, key) {
        Some(Value::Bool(value)) => Some(*value),
        _ => None,
    }
}

fn place_journal(state: &mut State) {
    let Some(Value::Object(entries)) = state.get("journal").cloned() else {
        return;
    };
    let mut rest = match state.value() {
        Value::Object(all) => all.clone(),
        _ => return,
    };
    rest.retain(|(name, _)| name.to_utf8().as_deref() != Ok("journal"));
    let position = rest
        .iter()
        .position(|(name, _)| name.to_utf8().as_deref() == Ok("applied"))
        .map_or(rest.len(), |index| index + 1);
    rest.insert(position, (field_key("journal"), Value::Object(entries)));
    state.set("__temporary_journal_order", Value::Null);
    state.remove("__temporary_journal_order");
    *state = State::from_value(Value::Object(rest)).expect("state remains an object");
}

pub fn object(fields: Vec<(&str, Value)>) -> Value {
    Value::Object(
        fields
            .into_iter()
            .map(|(name, value)| (field_key(name), value))
            .collect(),
    )
}

fn field_key(text: &str) -> Wtf16 {
    Wtf16::from_utf8(text)
}

fn string(text: &str) -> Value {
    Value::String(Wtf16::from_utf8(text))
}

fn contract(message: &str) -> WireError {
    WireError::ContractViolation {
        message: message.to_string(),
    }
}

fn required_text(entries: &[(Wtf16, Value)], key: &str) -> Result<Wtf16, WireError> {
    text(field(entries, key)).ok_or_else(|| contract(&format!("inputs need {key}")))
}

/// Dispatches one named operation for native and WASM adapters.
pub fn dispatch(
    operation: Operation,
    state_json: &str,
    command_json: &str,
    inputs_json: &str,
) -> String {
    let inputs = match Inputs::parse(inputs_json) {
        Ok(inputs) => inputs,
        Err(error) => return error.to_failure_json(),
    };
    let command = match Value::parse(command_json) {
        Ok(command) => command,
        Err(error) => return error.to_failure_json(),
    };
    let mut state = match State::parse(state_json) {
        Ok(state) => state,
        Err(error) => return error.to_failure_json(),
    };
    let result = match operation {
        Operation::ValidateCommand => validate(&state, &command, &inputs),
        Operation::PreviewCommand => preview(&state, &command, &inputs),
        Operation::ApplyCommand => apply(&mut state, &command, &inputs),
        _ => {
            return object(vec![
                ("status", string("rejected")),
                ("reason", string("Операция вне вертикального среза.")),
                ("errorCode", string("command-unsupported")),
            ])
            .to_wire();
        }
    };
    match operation {
        Operation::ApplyCommand => {
            object(vec![("result", result), ("state", state.to_value())]).to_wire()
        }
        _ => result.to_wire(),
    }
}

/// Applies and returns only the result, for native tests.
pub fn apply_result(state: &mut State, command_json: &str, inputs_json: &str) -> String {
    dispatch(
        Operation::ApplyCommand,
        &state.to_json(),
        command_json,
        inputs_json,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    const BASE: &str = r#"{"v":4,"phase":"day","notes":"old","applied":{},"journal":{"base":null,"entries":[]},"unknown":{"10":1,"2":2}}"#;
    const INPUTS: &str =
        r#"{"timestamp":"2026-11-28T00:00:00.000Z","seed":"seed-1","id":"fallback"}"#;

    fn state() -> State {
        State::parse(BASE).unwrap()
    }

    #[test]
    fn set_notes_applies_and_records_identity_and_journal() {
        let mut state = state();
        let result = apply(
            &mut state,
            &Value::parse(r#"{"id":"notes-1","type":"setNotes","payload":{"notes":"new"}}"#)
                .unwrap(),
            &Inputs::parse(INPUTS).unwrap(),
        );
        assert_eq!(result_status(&result).as_deref(), Some("allowed"));
        assert_eq!(state.notes().to_utf8().unwrap(), "new");
        assert!(state.get("applied").is_some());
        assert!(state.to_json().contains("notes-1"));
    }

    #[test]
    fn preview_is_isolated_and_replay_is_deterministic() {
        let mut state = state();
        let command =
            Value::parse(r#"{"id":"notes-1","type":"setNotes","payload":{"notes":"new"}}"#)
                .unwrap();
        let inputs = Inputs::parse(INPUTS).unwrap();
        let before = state.to_json();
        let previewed = preview(&state, &command, &inputs);
        assert_eq!(state.to_json(), before);
        assert_eq!(result_status(&previewed).as_deref(), Some("allowed"));
        apply(&mut state, &command, &inputs);
        let mut replayed = state.clone();
        let replay_result = replay(&mut replayed);
        assert_eq!(
            result_field_bool(&replay_result, "ok"),
            Some(true),
            "{}",
            replay_result.to_wire()
        );
        assert_eq!(replayed.notes().to_utf8().unwrap(), "new");
    }

    #[test]
    fn unsupported_commands_fail_explicitly() {
        let mut state = state();
        let result = apply(
            &mut state,
            &Value::parse(r#"{"id":"x","type":"startNight","payload":{}}"#).unwrap(),
            &Inputs::parse(INPUTS).unwrap(),
        );
        assert_eq!(result_status(&result).as_deref(), Some("rejected"));
        assert_eq!(state.notes().to_utf8().unwrap(), "old");
    }
}
