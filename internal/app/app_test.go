package app

import "testing"

func TestTranslatorFallsBackToEnglish(t *testing.T) {
	translator, err := LoadTranslator("../../data/i18n")
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	if got := translator.T("az_AZ", "index.title"); got != "Oyun" {
		t.Fatalf("az title = %q", got)
	}
	if got := translator.T("xx_YY", "index.title"); got != "Game" {
		t.Fatalf("fallback title = %q", got)
	}
	if got := translator.T("en_GB", "missing.key"); got != "missing.key" {
		t.Fatalf("missing key = %q", got)
	}
	if got := translator.T("az_AZ", "acknowledgements.acknowledgements.0"); got == "" {
		t.Fatal("list entry missing")
	}
}

func TestBotcConversion(t *testing.T) {
	payload := map[string]any{"results": []any{
		map[string]any{"name": "Zeta", "author": "B", "script_id": "2", "version": "1", "script_type": "FULL"},
		map[string]any{"name": "Alpha", "author": "A", "script_id": "1", "version": "1", "script_type": "Full"},
	}}

	result := ConvertBotcScripts(payload)
	if len(result) != 2 {
		t.Fatalf("len = %d", len(result))
	}
	if result[0]["name"] != "Alpha" || result[0]["type"] != "full" || result[0]["id"] != "1" {
		t.Fatalf("first = %#v", result[0])
	}
}

func TestSafeURL(t *testing.T) {
	rejected := []string{
		"http://example.com/",
		"https://user:pass@example.com/",
		"https://example.com:8443/",
		"https://127.0.0.1/",
		"https://[::1]/",
		"https://10.0.0.1/",
		"not a url",
	}
	for _, value := range rejected {
		if failure := checkSafeURL(value); failure == nil {
			t.Fatalf("%q was accepted", value)
		}
	}
}

func TestHomebrewValidationAndFiltering(t *testing.T) {
	valid := []any{
		"washerwoman",
		map[string]any{"id": "_meta", "name": "Test", "extra": "drop"},
		map[string]any{"id": "custom", "name": "Custom", "ability": "Does things", "team": "townsfolk", "unknown": "drop"},
	}

	ok, reasons := ValidateEntries(valid, func(key string) string { return key })
	if !ok {
		t.Fatalf("valid rejected: %v", reasons)
	}

	filtered := filterEntries(valid)
	if filtered[1].(map[string]any)["extra"] != nil {
		t.Fatal("meta extras were kept")
	}
	if _, exists := filtered[2].(map[string]any)["unknown"]; exists {
		t.Fatal("unknown key was kept")
	}

	invalid := []any{map[string]any{"id": "x", "name": "X", "team": "townsfolk"}}
	ok, reasons = ValidateEntries(invalid, func(key string) string { return key })
	if ok || len(reasons) == 0 {
		t.Fatalf("invalid accepted: %v", reasons)
	}

	badType := []any{map[string]any{"id": "x", "name": "X", "ability": "A", "team": "townsfolk", "setup": "yes"}}
	ok, _ = ValidateEntries(badType, func(key string) string { return key })
	if ok {
		t.Fatal("bad type accepted")
	}
}

func TestHomebrewStore(t *testing.T) {
	store, err := NewHomebrewStore(t.TempDir())
	if err != nil {
		t.Fatalf("store: %v", err)
	}

	uuid, err := store.Create([]any{map[string]any{"id": "x", "name": "X", "ability": "A", "team": "townsfolk"}})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if !IsUUID(uuid) {
		t.Fatalf("uuid = %q", uuid)
	}

	entries, found, err := store.Get(uuid)
	if err != nil || !found || len(entries) != 1 {
		t.Fatalf("get: %v %v %v", entries, found, err)
	}
	if _, found, _ := store.Get("not-a-uuid"); found {
		t.Fatal("invalid uuid found")
	}
}
