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

/// Exact `prepareCommand` failure contract.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PrepareFailure {
    pub error_code: &'static str,
    pub reason: String,
}

impl PrepareFailure {
    /// Serializes the `PrepareResult` shape.
    pub fn to_value(&self) -> Value {
        object(vec![
            ("ok", Value::Bool(false)),
            ("errorCode", string(self.error_code)),
            ("reason", Value::String(Wtf16::from_utf8(&self.reason))),
        ])
    }

    fn new(error_code: &'static str, reason: impl Into<String>) -> Self {
        Self {
            error_code,
            reason: reason.into(),
        }
    }
}

/// A prepared command with its legacy fingerprint.
#[derive(Clone, Debug)]
pub struct PreparedCommand {
    pub id: Wtf16,
    pub type_name: &'static str,
    pub payload: Value,
    pub at: Wtf16,
    pub at_iso: Wtf16,
    pub ruleset_version: Wtf16,
    pub fingerprint: Wtf16,
    pub identity: Wtf16,
}

/// Prepares and validates one command envelope.
pub fn prepare(command: &Value, inputs: &Inputs) -> Result<PreparedCommand, PrepareFailure> {
    let entries = entries(command)
        .ok_or_else(|| PrepareFailure::new("command-unknown", "Command is missing."))?;
    let raw_type = text(field(entries, "type"))
        .and_then(|value| value.to_utf8().ok())
        .unwrap_or_default();
    if raw_type != "setNotes" {
        return Err(PrepareFailure::new(
            "command-unknown",
            format!("Unknown command: {raw_type}"),
        ));
    }
    let payload = match field(entries, "payload") {
        None => Value::Object(Vec::new()),
        Some(Value::Object(_)) => field(entries, "payload").unwrap().clone(),
        Some(_) => {
            return Err(PrepareFailure::new(
                "command-payload",
                "Command payload is not an object.",
            ));
        }
    };
    validate_set_notes_payload(&payload)?;
    let id = match field(entries, "id") {
        Some(Value::String(value)) if !is_blank(value) => value.clone(),
        Some(Value::String(_)) | Some(_) => {
            return Err(PrepareFailure::new(
                "command-missing-id",
                "The command id is empty.",
            ));
        }
        None => {
            if is_blank(&inputs.id) {
                return Err(PrepareFailure::new(
                    "command-missing-id",
                    "The id source returned an empty id.",
                ));
            }
            inputs.id.clone()
        }
    };
    let at = match field(entries, "at") {
        Some(Value::String(value)) => value.clone(),
        Some(_) => {
            return Err(PrepareFailure::new(
                "command-at",
                "The command timestamp is invalid.",
            ));
        }
        None => normalize_timestamp(&inputs.timestamp).ok_or_else(|| {
            PrepareFailure::new("command-at", "The clock returned an invalid date.")
        })?,
    };
    let at_iso = normalize_timestamp(&at)
        .ok_or_else(|| PrepareFailure::new("command-at", "The command timestamp is invalid."))?;
    let ruleset_version = match field(entries, "rulesetVersion") {
        None => Wtf16::from_utf8(RULESET_VERSION),
        Some(Value::String(value)) if supported_version(value) => value.clone(),
        Some(Value::String(value)) => {
            return Err(PrepareFailure::new(
                "ruleset-version-unsupported",
                format!(
                    "Unsupported ruleset version: {}",
                    value.to_utf8().unwrap_or_default()
                ),
            ));
        }
        Some(_) => {
            return Err(PrepareFailure::new(
                "ruleset-version-unsupported",
                "Unsupported ruleset version: ",
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
        at_iso,
        ruleset_version,
        fingerprint,
        identity,
    })
}

fn validate_set_notes_payload(payload: &Value) -> Result<(), PrepareFailure> {
    let entries = entries(payload).expect("payload is an object");
    for (name, value) in entries {
        if name.to_utf8().as_deref() != Ok("notes") {
            return Err(PrepareFailure::new(
                "command-payload-unknown-field",
                format!(
                    "Unknown field '{}' in setNotes.",
                    name.to_utf8().unwrap_or_default()
                ),
            ));
        }
        if !matches!(value, Value::String(_)) {
            return Err(PrepareFailure::new(
                "command-payload-type",
                "Wrong type for field 'notes' in setNotes.",
            ));
        }
    }
    Ok(())
}

/// Validates a command without changing state.
pub fn validate(state: &State, command: &Value, inputs: &Inputs) -> Value {
    let prepared = match prepare(command, inputs) {
        Ok(prepared) => prepared,
        Err(failure) => return command_rejection(command, &failure),
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
    if let Some(errors) = unsupported_state(state) {
        return unsupported(&prepared, errors);
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
        Err(failure) => return command_rejection(command, &failure),
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
    if let Some(errors) = unsupported_state(state) {
        return unsupported(&prepared, errors);
    }
    let after = apply_notes(state, &prepared);
    let events = notes_events(state, &after, &prepared);
    object(vec![
        ("status", string("allowed")),
        ("id", Value::String(prepared.id)),
        ("type", string("setNotes")),
        ("at", Value::String(prepared.at_iso.clone())),
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
        Err(failure) => return command_rejection(command, &failure),
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
    if let Some(errors) = unsupported_state(state) {
        return unsupported(&prepared, errors);
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
        ("at", Value::String(prepared.at_iso)),
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
                "journal-invalid",
                "Журнал команд отсутствует: воспроизведение невозможно.",
                None,
            );
        }
    };
    let journal_entries = entries(&journal).unwrap_or(&[]);
    let base = match field(journal_entries, "base") {
        Some(Value::Null) | None => {
            return journal_error(
                "journal-invalid",
                "Журнал не содержит базового состояния: воспроизведение невозможно.",
                None,
            );
        }
        Some(value) => match State::from_value(value.clone()) {
            Ok(state) => state,
            Err(_) => {
                return journal_error(
                    "journal-invalid",
                    "Журнал не содержит базового состояния: воспроизведение невозможно.",
                    None,
                );
            }
        },
    };
    let list = match field(journal_entries, "entries") {
        Some(Value::Array(entries)) => entries.clone(),
        _ => {
            return journal_error(
                "journal-invalid",
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
                "journal-dependency",
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
            let reason = text(field(entries(&result).unwrap_or(&[]), "reason"))
                .and_then(|reason| reason.to_utf8().ok())
                .unwrap_or_else(|| "команда не воспроизводится".to_string());
            return journal_error(
                "journal-dependency",
                &format!(
                    "Запись журнала «{}» не воспроизводится: {reason}",
                    entry_id.to_utf8().unwrap_or_default()
                ),
                Some(entry_id),
            );
        }
        if result_field_bool(&result, "idempotent") == Some(true) {
            return journal_error(
                "journal-dependency",
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
        ("at", Value::String(prepared.at_iso.clone())),
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
        ("at", Value::String(prepared.at_iso.clone())),
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
    let mut event_id = prepared.id.clone();
    event_id.push_unit(u16::from(b':'));
    event_id.push_unit(u16::from(b'1'));
    vec![object(vec![
        ("id", Value::String(event_id)),
        ("type", string("notes.changed")),
        ("commandId", Value::String(prepared.id.clone())),
        ("commandType", string("setNotes")),
        ("at", Value::String(prepared.at_iso.clone())),
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
    let active_effects: Vec<&Value> = effects
        .iter()
        .filter(|effect| {
            let fields = entries(effect).unwrap_or(&[]);
            !matches!(field(fields, "active"), Some(Value::Bool(false)))
        })
        .collect();
    let active: Vec<Value> = active_effects
        .iter()
        .map(|effect| active_effect_value(effect))
        .collect();
    let delayed: Vec<Value> = active_effects
        .iter()
        .filter(|effect| {
            let fields = entries(effect).unwrap_or(&[]);
            matches!(field(fields, "expires"), Some(value) if !matches!(value, Value::Null))
                || matches!(field(fields, "resolve"), Some(value) if !matches!(value, Value::Null))
        })
        .map(|effect| delayed_effect_value(effect))
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

fn is_blank(value: &Wtf16) -> bool {
    value.to_utf8().is_ok_and(|text| text.trim().is_empty())
}

/// Accepts the ISO forms TypeScript treats as dates and returns canonical UTC.
fn normalize_timestamp(value: &Wtf16) -> Option<Wtf16> {
    let text = value.to_utf8().ok()?;
    let bytes = text.as_bytes();
    if bytes.len() < 10 {
        return None;
    }
    let year = digits(bytes, 0, 4)?;
    if bytes.get(4) != Some(&b'-') || bytes.get(7) != Some(&b'-') {
        return None;
    }
    let month = digits(bytes, 5, 2)?;
    let day = digits(bytes, 8, 2)?;
    if !(1..=12).contains(&month) || day == 0 || day > days_in_month(year, month) {
        return None;
    }
    let mut index = 10;
    let (mut hour, mut minute, mut second, mut millis) = (0i64, 0i64, 0i64, 0i64);
    let mut offset_minutes = 0i64;
    if index < bytes.len() {
        if !matches!(bytes[index], b'T' | b't' | b' ') {
            return None;
        }
        index += 1;
        hour = digits(bytes, index, 2)?;
        index += 2;
        if bytes.get(index) != Some(&b':') {
            return None;
        }
        index += 1;
        minute = digits(bytes, index, 2)?;
        index += 2;
        if bytes.get(index) == Some(&b':') {
            index += 1;
            second = digits(bytes, index, 2)?;
            index += 2;
            if bytes.get(index) == Some(&b'.') {
                index += 1;
                let start = index;
                while matches!(bytes.get(index), Some(b'0'..=b'9')) {
                    index += 1;
                }
                if index == start {
                    return None;
                }
                let fraction = &text[start..index];
                let padded = format!("{fraction:0<3}");
                millis = padded[..3].parse().ok()?;
            }
        }
        match bytes.get(index) {
            Some(b'Z' | b'z') => index += 1,
            Some(b'+' | b'-') => {
                let sign = if bytes[index] == b'+' { 1 } else { -1 };
                index += 1;
                let offset_hour = digits(bytes, index, 2)?;
                index += 2;
                if bytes.get(index) == Some(&b':') {
                    index += 1;
                }
                let offset_minute = digits(bytes, index, 2)?;
                index += 2;
                if offset_hour > 23 || offset_minute > 59 {
                    return None;
                }
                offset_minutes = sign * (offset_hour * 60 + offset_minute);
            }
            _ => return None,
        }
    }
    if index != bytes.len() || hour > 23 || minute > 59 || second > 59 {
        return None;
    }
    let days = days_from_civil(year, month, day);
    let epoch_ms = days * 86_400_000 + hour * 3_600_000 + minute * 60_000 + second * 1000 + millis
        - offset_minutes * 60_000;
    Some(Wtf16::from_utf8(&format_utc(epoch_ms)))
}

fn digits(bytes: &[u8], start: usize, length: usize) -> Option<i64> {
    let slice = bytes.get(start..start + length)?;
    if !slice.iter().all(u8::is_ascii_digit) {
        return None;
    }
    Some(
        slice
            .iter()
            .fold(0i64, |value, byte| value * 10 + i64::from(byte - b'0')),
    )
}

fn days_in_month(year: i64, month: i64) -> i64 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 => 29,
        2 => 28,
        _ => 0,
    }
}

// Howard Hinnant's civil-date conversion, using days since 1970-01-01.
fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let year = if month <= 2 { year - 1 } else { year };
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let year_of_era = year - era * 400;
    let month_index = (month + 9) % 12;
    let day_of_year = (153 * month_index + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

fn format_utc(epoch_ms: i64) -> String {
    let days = epoch_ms.div_euclid(86_400_000);
    let millis_of_day = epoch_ms.rem_euclid(86_400_000);
    let (year, month, day) = civil_from_days(days);
    let hour = millis_of_day / 3_600_000;
    let minute = (millis_of_day % 3_600_000) / 60_000;
    let second = (millis_of_day % 60_000) / 1000;
    let millis = millis_of_day % 1000;
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}.{millis:03}Z")
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let days = days + 719_468;
    let era = if days >= 0 { days } else { days - 146_096 } / 146_097;
    let day_of_era = days - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let mut year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_index = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_index + 2) / 5 + 1;
    let month = if month_index < 10 {
        month_index + 3
    } else {
        month_index - 9
    };
    if month <= 2 {
        year += 1;
    }
    (year, month, day)
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

fn unsupported(prepared: &PreparedCommand, errors: Vec<String>) -> Value {
    object(vec![
        ("status", string("rejected")),
        ("id", Value::String(prepared.id.clone())),
        ("type", string("setNotes")),
        (
            "reason",
            string("Phase 2 does not support this state surface."),
        ),
        ("errorCode", string("unsupported-state")),
        (
            "errors",
            Value::Array(
                errors
                    .into_iter()
                    .map(|error| Value::String(Wtf16::from_utf8(&error)))
                    .collect(),
            ),
        ),
    ])
}

fn unsupported_state(state: &State) -> Option<Vec<String>> {
    match state.get("effects") {
        None => {}
        Some(Value::Array(effects)) => {
            let unsupported = effects.iter().any(|effect| {
                let fields = entries(effect).unwrap_or(&[]);
                matches!(
                    text(field(fields, "kind"))
                        .and_then(|kind| kind.to_utf8().ok())
                        .as_deref(),
                    Some("poison" | "drunk" | "pukka-death")
                )
            });
            if unsupported {
                return Some(vec![
                    "state.effects: impairing and Pukka effects are unsupported for Phase 2"
                        .to_string(),
                ]);
            }
        }
        Some(_) => {
            return Some(vec!["state.effects: unsupported for Phase 2".to_string()]);
        }
    }
    let errors = check_invariants(state);
    (!errors.is_empty()).then_some(errors)
}

fn check_invariants(state: &State) -> Vec<String> {
    let mut errors = Vec::new();
    let players = state.get("players").and_then(entries).unwrap_or(&[]);
    let order = string_array(state.get("order"));
    let script_roles = state
        .get("script")
        .and_then(entries)
        .and_then(|script| field(script, "roles"))
        .map(|roles| string_array(Some(roles)))
        .unwrap_or_default();
    if !matches!(
        state
            .string("phase")
            .and_then(|phase| phase.to_utf8().ok())
            .as_deref(),
        Some("setup" | "deal" | "seat" | "night" | "day" | "over")
    ) {
        errors.push(format!(
            "Неизвестная фаза: {}",
            state
                .string("phase")
                .and_then(|phase| phase.to_utf8().ok())
                .unwrap_or_default()
        ));
    }
    if order.iter().collect::<std::collections::HashSet<_>>().len() != order.len() {
        errors.push("Порядок мест содержит повторы.".to_string());
    }
    for id in &order {
        if !player_exists(players, id) {
            errors.push("Место без игрока.".to_string());
        }
    }
    if players.len() != order.len() {
        errors.push("Игроки не совпадают с порядком мест.".to_string());
    }
    for (name, player) in players {
        let fields = entries(player).unwrap_or(&[]);
        if text(field(fields, "id")).as_ref() != Some(name) {
            errors.push(format!(
                "Некорректный игрок: {}",
                name.to_utf8().unwrap_or_default()
            ));
        }
        if let Some(role) = text(field(fields, "roleId"))
            && !script_roles.contains(&role)
        {
            errors.push(format!(
                "Роль вне сценария: {}",
                name.to_utf8().unwrap_or_default()
            ));
        }
        if let Some(shown) = text(field(fields, "shownRoleId"))
            && !script_roles.contains(&shown)
        {
            errors.push(format!(
                "Показанная роль неизвестна: {}",
                name.to_utf8().unwrap_or_default()
            ));
        }
        if let Some(master) = text(field(fields, "butlerMasterId"))
            && !player_exists(players, &master)
        {
            errors.push(format!(
                "Мастер Дворецкого не найден: {}",
                name.to_utf8().unwrap_or_default()
            ));
        }
    }
    let mut seen_effects = std::collections::HashSet::new();
    for effect in array(state.get("effects")) {
        let fields = entries(&effect).unwrap_or(&[]);
        let Some(effect_id) = text(field(fields, "id")) else {
            errors.push("Эффект без id.".to_string());
            continue;
        };
        if !seen_effects.insert(effect_id.clone()) {
            errors.push(format!(
                "Повтор эффекта: {}",
                effect_id.to_utf8().unwrap_or_default()
            ));
        }
        if let Some(source) = text(field(fields, "sourceId"))
            && !player_exists(players, &source)
        {
            errors.push(format!(
                "Источник эффекта не найден: {}",
                effect_id.to_utf8().unwrap_or_default()
            ));
        }
        if let Some(target) = text(field(fields, "targetId"))
            && !player_exists(players, &target)
        {
            errors.push(format!(
                "Цель эффекта не найдена: {}",
                effect_id.to_utf8().unwrap_or_default()
            ));
        }
    }
    for death in array(state.get("deaths")) {
        if !death_player_exists(players, &death) {
            errors.push("Смерть без игрока.".to_string());
        }
    }
    for execution in array(state.get("executions")) {
        if !death_player_exists(players, &execution) {
            errors.push("Казнь без игрока.".to_string());
        }
    }
    if let Some(day) = state.get("day").and_then(entries) {
        for nomination in array(field(day, "nominations")) {
            let fields = entries(&nomination).unwrap_or(&[]);
            let nominator = text(field(fields, "nominatorId"));
            let nominee = text(field(fields, "nomineeId"));
            if nominator.is_none_or(|id| !player_exists(players, &id))
                || nominee.is_none_or(|id| !player_exists(players, &id))
            {
                errors.push("Номинация ссылается на отсутствующего игрока.".to_string());
            }
        }
        for death in array(field(day, "morning")) {
            if !death_player_exists(players, &death) {
                errors.push("Утренняя смерть без игрока.".to_string());
            }
        }
        if let Some(execution) =
            field(day, "execution").filter(|value| !matches!(value, Value::Null))
            && !death_player_exists(players, execution)
        {
            errors.push("Казнь без игрока.".to_string());
        }
        if let Some(active) = text(field(day, "activeNominationId")) {
            let found = array(field(day, "nominations")).iter().any(|nomination| {
                text(field(entries(nomination).unwrap_or(&[]), "id")).as_ref() == Some(&active)
            });
            if !found {
                errors.push("Активная номинация не найдена.".to_string());
            }
        }
    }
    if let Some(setup) = state.get("setup").and_then(entries) {
        for key in [
            "grandmotherId",
            "evilTwinGoodPlayerId",
            "evilTwinPlayerId",
            "herringId",
        ] {
            if let Some(id) = text(field(setup, key))
                && !player_exists(players, &id)
            {
                errors.push("Ссылка настройки не найдена.".to_string());
                break;
            }
        }
    }
    if let Some(mastermind) = state.get("mastermind").and_then(entries)
        && let Some(id) = text(field(mastermind, "playerId"))
        && !player_exists(players, &id)
    {
        errors.push("Кукловод не найден.".to_string());
    }
    let queue = state
        .get("night")
        .and_then(entries)
        .and_then(|night| field(night, "queue"))
        .map(|queue| array(Some(queue)))
        .unwrap_or_default();
    let mut keys = std::collections::HashSet::new();
    for step in &queue {
        let fields = entries(step).unwrap_or(&[]);
        let Some(step_key) = text(field(fields, "key")) else {
            errors.push("Ночной шаг без ключа.".to_string());
            continue;
        };
        if !keys.insert(step_key.clone()) {
            errors.push(format!(
                "Повтор ночного шага: {}",
                step_key.to_utf8().unwrap_or_default()
            ));
        }
        if let Some(actor) = text(field(fields, "actorId"))
            && !player_exists(players, &actor)
        {
            errors.push(format!(
                "Ночной актёр не найден: {}",
                actor.to_utf8().unwrap_or_default()
            ));
        }
    }
    if state
        .get("winner")
        .is_some_and(|winner| !matches!(winner, Value::Null))
        && state
            .string("phase")
            .and_then(|phase| phase.to_utf8().ok())
            .as_deref()
            != Some("over")
    {
        errors.push("Победитель объявлен вне фазы завершения.".to_string());
    }
    if state
        .get("winner")
        .is_some_and(|winner| !matches!(winner, Value::Null))
        && queue.iter().any(|step| {
            field(entries(step).unwrap_or(&[]), "pending")
                .and_then(entries)
                .and_then(|pending| text(field(pending, "kind")))
                == Some(Wtf16::from_utf8("demon-inheritance"))
        })
    {
        errors.push("Победитель объявлен до выбора наследника Демона.".to_string());
    }
    errors
}

fn array(value: Option<&Value>) -> Vec<Value> {
    match value {
        Some(Value::Array(values)) => values.clone(),
        _ => Vec::new(),
    }
}

fn string_array(value: Option<&Value>) -> Vec<Wtf16> {
    array(value)
        .into_iter()
        .filter_map(|value| match value {
            Value::String(text) => Some(text),
            _ => None,
        })
        .collect()
}

fn player_exists(players: &[(Wtf16, Value)], id: &Wtf16) -> bool {
    players.iter().any(|(name, _)| name == id)
}

fn death_player_exists(players: &[(Wtf16, Value)], death: &Value) -> bool {
    text(field(entries(death).unwrap_or(&[]), "playerId"))
        .is_some_and(|id| player_exists(players, &id))
}

/// Returns the exact `prepareCommand` result as JSON.
pub fn prepare_response(command_json: &str, inputs_json: &str) -> String {
    let inputs = match Inputs::parse(inputs_json) {
        Ok(inputs) => inputs,
        Err(error) => return error.to_failure_json(),
    };
    let command = match Value::parse(command_json) {
        Ok(command) => command,
        Err(error) => return error.to_failure_json(),
    };
    match prepare(&command, &inputs) {
        Ok(prepared) => object(vec![
            ("ok", Value::Bool(true)),
            (
                "command",
                object(vec![
                    ("id", Value::String(prepared.id)),
                    ("type", string("setNotes")),
                    ("payload", prepared.payload),
                    ("at", Value::String(prepared.at)),
                    ("rulesetVersion", Value::String(prepared.ruleset_version)),
                    ("fingerprint", Value::String(prepared.fingerprint)),
                ]),
            ),
        ])
        .to_wire(),
        Err(failure) => failure.to_value().to_wire(),
    }
}

/// Parses and re-serializes a state without applying a command.
pub fn state_roundtrip(state_json: &str) -> String {
    match State::parse(state_json) {
        Ok(state) => state.to_json(),
        Err(error) => error.to_failure_json(),
    }
}

fn command_rejection(command: &Value, failure: &PrepareFailure) -> Value {
    let fields = entries(command).unwrap_or(&[]);
    let id = field(fields, "id").cloned().unwrap_or(Value::Null);
    let type_name = field(fields, "type").cloned().unwrap_or(Value::Null);
    object(vec![
        ("status", string("rejected")),
        ("id", id),
        ("type", type_name),
        ("reason", Value::String(Wtf16::from_utf8(&failure.reason))),
        ("errorCode", string(failure.error_code)),
    ])
}

fn journal_error(error_code: &str, message: &str, entry_id: Option<Wtf16>) -> Value {
    object(vec![
        ("ok", Value::Bool(false)),
        ("errorCode", string(error_code)),
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
        assert_eq!(result_field_bool(&replay_result, "ok"), Some(true));
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
