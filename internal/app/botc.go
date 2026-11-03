package app

import (
	"sort"
	"strings"
)

const maxBotcResults = 50

// ConvertBotcScripts reduces the botcscripts.com payload to the fields the
// front end needs.
func ConvertBotcScripts(payload any) []map[string]string {
	result := make([]map[string]string, 0)

	root, ok := payload.(map[string]any)
	if !ok {
		return result
	}

	rawResults, ok := root["results"].([]any)
	if !ok || len(rawResults) == 0 {
		return result
	}

	converted := make([]map[string]string, 0, len(rawResults))
	for _, raw := range rawResults {
		entry, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		converted = append(converted, map[string]string{
			"id":      asString(entry["script_id"]),
			"author":  asString(entry["author"]),
			"name":    asString(entry["name"]),
			"script":  asString(entry["content"]),
			"version": asString(entry["version"]),
			"type":    strings.ToLower(asString(entry["script_type"])),
		})
	}

	sort.SliceStable(converted, func(i, j int) bool {
		return converted[i]["name"] < converted[j]["name"]
	})

	for _, entry := range converted {
		if len(result) >= maxBotcResults {
			break
		}
		result = append(result, entry)
	}

	return result
}

func asString(value any) string {
	if text, ok := value.(string); ok {
		return text
	}
	return ""
}
