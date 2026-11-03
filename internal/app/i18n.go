package app

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const fallbackLocale = "en_GB"

// Translator holds every locale as a flat map of dot separated keys.
type Translator struct {
	messages map[string]map[string]string
}

func LoadTranslator(dir string) (*Translator, error) {
	files, err := filepath.Glob(filepath.Join(dir, "*.json"))
	if err != nil {
		return nil, err
	}
	if len(files) == 0 {
		return nil, fmt.Errorf("no translation files in %s", dir)
	}

	translator := &Translator{messages: make(map[string]map[string]string, len(files))}

	for _, file := range files {
		locale := strings.TrimSuffix(filepath.Base(file), ".json")
		raw, err := os.ReadFile(file)
		if err != nil {
			return nil, err
		}

		var nested any
		if err := json.Unmarshal(raw, &nested); err != nil {
			return nil, fmt.Errorf("%s: %w", file, err)
		}

		flat := make(map[string]string)
		flatten("", nested, flat)
		translator.messages[locale] = flat
	}

	if _, ok := translator.messages[fallbackLocale]; !ok {
		return nil, fmt.Errorf("missing fallback locale %s", fallbackLocale)
	}

	return translator, nil
}

func flatten(prefix string, value any, out map[string]string) {
	switch typed := value.(type) {
	case map[string]any:
		for key, child := range typed {
			flatten(prefix+"."+key, child, out)
		}
	case []any:
		for index, child := range typed {
			flatten(fmt.Sprintf("%s.%d", prefix, index), child, out)
		}
	case string:
		if prefix != "" {
			out[strings.TrimPrefix(prefix, ".")] = typed
		}
	case bool, float64:
		if prefix != "" {
			out[strings.TrimPrefix(prefix, ".")] = fmt.Sprint(typed)
		}
	}
}

// T returns the translated text for the locale and falls back to English and
// then to the key itself.
func (t *Translator) T(locale, key string) string {
	if messages, ok := t.messages[locale]; ok {
		if value, ok := messages[key]; ok {
			return value
		}
	}
	if value, ok := t.messages[fallbackLocale][key]; ok {
		return value
	}
	return key
}

// Has reports whether the locale has its own translation for the key.
func (t *Translator) Has(locale, key string) bool {
	_, ok := t.messages[locale][key]
	return ok
}
