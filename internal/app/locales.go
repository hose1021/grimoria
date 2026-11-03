package app

import (
	"encoding/json"
	"os"
)

// Locale is one entry from locales.json.
type Locale struct {
	Code string `json:"code"`
	Text string `json:"text"`
}

func LoadLocales(path string) ([]Locale, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var locales []Locale
	if err := json.Unmarshal(raw, &locales); err != nil {
		return nil, err
	}
	return locales, nil
}
