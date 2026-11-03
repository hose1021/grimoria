package app

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var uuidPattern = regexp.MustCompile(`^[0-9a-f]{64}$`)

var homebrewTeams = map[string]bool{
	"townsfolk": true,
	"outsider":  true,
	"minion":    true,
	"demon":     true,
	"traveller": true,
	"fabled":    true,
	"loric":     true,
}

var requiredKeys = []string{"id", "name", "ability", "team"}

var filteredKeys = map[string]bool{
	"id":                 true,
	"name":               true,
	"ability":            true,
	"image":              true,
	"team":               true,
	"firstNight":         true,
	"firstNightReminder": true,
	"otherNight":         true,
	"otherNightReminder": true,
	"reminders":          true,
	"setup":              true,
	"jinxes":             true,
	"special":            true,
}

// Message is a translated error with placeholders.
type Message struct {
	Key    string
	Params map[string]string
}

// HomebrewStore persists shared homebrew scripts as JSON files. No database is
// involved: the UUID is the file name.
type HomebrewStore struct {
	dir string
}

func NewHomebrewStore(dir string) (*HomebrewStore, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &HomebrewStore{dir: dir}, nil
}

func IsUUID(value string) bool {
	return uuidPattern.MatchString(value)
}

func (s *HomebrewStore) Create(entries []any) (string, error) {
	filtered := filterEntries(entries)

	raw, err := json.Marshal(filtered)
	if err != nil {
		return "", err
	}

	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	uuid := hex.EncodeToString(bytes)

	path := filepath.Join(s.dir, uuid+".json")
	temp := path + ".tmp"
	if err := os.WriteFile(temp, raw, 0o644); err != nil {
		return "", err
	}
	if err := os.Rename(temp, path); err != nil {
		return "", err
	}

	return uuid, nil
}

func (s *HomebrewStore) Get(uuid string) ([]any, bool, error) {
	if !IsUUID(uuid) {
		return nil, false, nil
	}

	raw, err := os.ReadFile(filepath.Join(s.dir, uuid+".json"))
	if errors.Is(err, os.ErrNotExist) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}

	var entries []any
	if err := json.Unmarshal(raw, &entries); err != nil {
		return nil, false, err
	}
	return entries, true, nil
}

// ValidateEntries checks the structure of a homebrew script. It mirrors the
// old Symfony validator: required keys, known teams and the types of every
// optional field. Reasons are already translated.
func ValidateEntries(entries []any, translate func(string) string) (bool, []string) {
	reasons := make([]string, 0)

	for _, entry := range entries {
		if _, ok := entry.(string); ok {
			continue
		}

		object, ok := entry.(map[string]any)
		if !ok {
			reasons = append(reasons, formatMessage(translate("errors.homebrew_json.not_find_id"), map[string]string{
				"%id%": fmt.Sprintf("%v", entry),
			}))
			return false, reasons
		}

		if IsMetaEntry(object) || LooksOfficial(object) {
			continue
		}

		if invalid := validateEntry(object); len(invalid) > 0 {
			id, _ := object["id"].(string)
			inner := make([]string, 0, len(invalid))
			for _, message := range invalid {
				inner = append(inner, formatMessage(translate(message.Key), message.Params))
			}
			reasons = append(reasons, formatMessage(translate("errors.homebrew_json.invalid_entry"), map[string]string{
				"%id%":      id,
				"%reasons%": strings.Join(inner, ", "),
			}))
			return false, reasons
		}
	}

	return true, reasons
}

func validateEntry(entry map[string]any) []Message {
	invalid := make([]Message, 0)

	if !hasKeys(entry, requiredKeys) {
		id, _ := entry["id"].(string)
		invalid = append(invalid, Message{Key: "errors.homebrew_json.not_homebrew", Params: map[string]string{"%id%": id}})
	}

	if team, ok := entry["team"].(string); ok && !homebrewTeams[team] {
		invalid = append(invalid, Message{Key: "errors.homebrew_json.invalid_property", Params: map[string]string{
			"%property%": "team",
			"%expected%": "known team",
			"%given%":    team,
		}})
	}

	stringFields := []string{"id", "name", "ability", "edition", "team", "firstNightReminder", "otherNightReminder", "image"}
	for _, key := range stringFields {
		if value, present := entry[key]; present && value != nil {
			if _, ok := value.(string); !ok {
				invalid = append(invalid, typeMessage(key, "string", value))
			}
		}
	}

	for _, key := range []string{"firstNight", "otherNight"} {
		if value, present := entry[key]; present && value != nil {
			if !isInteger(value) {
				invalid = append(invalid, typeMessage(key, "int", value))
			}
		}
	}

	for _, key := range []string{"reminders", "remindersGlobal", "special"} {
		if value, present := entry[key]; present && value != nil {
			if _, ok := value.([]any); !ok {
				invalid = append(invalid, typeMessage(key, "array", value))
			}
		}
	}

	if value, present := entry["setup"]; present && value != nil {
		if _, ok := value.(bool); !ok {
			invalid = append(invalid, typeMessage("setup", "bool", value))
		}
	}

	return invalid
}

func typeMessage(key, expected string, value any) Message {
	return Message{Key: "errors.homebrew_json.invalid_property", Params: map[string]string{
		"%property%": key,
		"%expected%": expected,
		"%given%":    goType(value),
	}}
}

func goType(value any) string {
	switch value.(type) {
	case string:
		return "string"
	case float64:
		return "float"
	case bool:
		return "bool"
	case []any:
		return "array"
	case map[string]any:
		return "object"
	case nil:
		return "null"
	}
	return "unknown"
}

func isInteger(value any) bool {
	number, ok := value.(float64)
	if !ok {
		return false
	}
	return number == float64(int64(number))
}

func hasKeys(entry map[string]any, keys []string) bool {
	for _, key := range keys {
		if _, ok := entry[key]; !ok {
			return false
		}
	}
	return true
}

func IsMetaEntry(entry map[string]any) bool {
	id, okID := entry["id"]
	_, okName := entry["name"]
	return okID && id == "_meta" && okName
}

func LooksOfficial(entry any) bool {
	if _, ok := entry.(string); ok {
		return true
	}

	object, ok := entry.(map[string]any)
	if !ok {
		return false
	}
	_, hasID := object["id"]
	return len(object) == 1 && hasID
}

func FilterEntries(entries []any) []any {
	return filterEntries(entries)
}

func filterEntries(entries []any) []any {
	result := make([]any, 0, len(entries))
	for _, entry := range entries {
		result = append(result, filterEntry(entry))
	}
	return result
}

func filterEntry(entry any) any {
	if value, ok := entry.(string); ok {
		return map[string]any{"id": value}
	}

	object, ok := entry.(map[string]any)
	if !ok {
		return nil
	}

	if IsMetaEntry(object) {
		filtered := make(map[string]any, 2)
		if id, ok := object["id"]; ok {
			filtered["id"] = id
		}
		if name, ok := object["name"]; ok {
			filtered["name"] = name
		}
		return filtered
	}

	if LooksOfficial(object) {
		return object
	}

	filtered := make(map[string]any, len(object))
	for key, value := range object {
		if filteredKeys[key] {
			filtered[key] = value
		}
	}
	return filtered
}

// formatMessage fills %name% placeholders the same way Symfony's translator
// does for the error keys used here.
func formatMessage(key string, params map[string]string) string {
	result := key
	for name, value := range params {
		result = strings.ReplaceAll(result, name, value)
	}
	return result
}
