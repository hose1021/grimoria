package app

import (
	"encoding/json"
	"fmt"
	"html"
	"html/template"
	"io"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

// LocaleLink is one option in the language switcher.
type LocaleLink struct {
	Code string
	Text string
	URL  string
	Lang string
	Dir  string
}

// Page is the data every template receives.
type Page struct {
	Locale     string
	LocaleAttr string
	Dir        string
	Locales    []LocaleLink

	Title     string
	Desc      string
	BodyClass string
	Name      string
	Env       string

	DataScript  string
	StyleEntry  string
	ScriptEntry string

	I18N         template.JS
	URLS         template.JS
	GameURL      string
	SheetURL     string
	ThemeVersion string
	InfoTokens   template.JS

	Teams  []Option
	Clears []Option
}

// Option is a translated label/value pair used by a few template loops.
type Option struct {
	Value string
	Label string
	Note  string
}

// Renderer parses every template once per locale so translation functions can
// be bound at parse time.
type Renderer struct {
	templates map[string]*template.Template
}

func NewRenderer(dir string, translator *Translator, assets *Assets, locales []Locale) (*Renderer, error) {
	files, err := filepath.Glob(filepath.Join(dir, "*.gohtml"))
	if err != nil {
		return nil, err
	}
	if len(files) == 0 {
		return nil, fmt.Errorf("no templates in %s", dir)
	}

	renderer := &Renderer{templates: make(map[string]*template.Template, len(locales)+1)}

	codes := []string{fallbackLocale}
	for _, locale := range locales {
		if locale.Code != fallbackLocale {
			codes = append(codes, locale.Code)
		}
	}

	for _, code := range codes {
		funcs := templateFuncs(translator, assets, code)
		parsed, err := template.New("page").Funcs(funcs).ParseFiles(files...)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", code, err)
		}
		renderer.templates[code] = parsed
	}

	return renderer, nil
}

func (r *Renderer) Render(w io.Writer, name, locale string, page Page) error {
	tpl, ok := r.templates[locale]
	if !ok {
		tpl = r.templates[fallbackLocale]
	}
	return tpl.ExecuteTemplate(w, name, page)
}

// BuildLocaleAttr turns az_AZ into az-AZ for the lang attribute.
func BuildLocaleAttr(locale string) string {
	return strings.ReplaceAll(locale, "_", "-")
}

// BuildDir returns the text direction for a locale.
func BuildDir(locale string) string {
	if locale == "he_IL" {
		return "rtl"
	}
	return "ltr"
}

// JSONForTemplate converts a map into a safe JS literal.
func JSONForTemplate(value map[string]string) template.JS {
	raw, _ := json.Marshal(value)
	return template.JS(raw)
}

func templateFuncs(translator *Translator, assets *Assets, locale string) template.FuncMap {
	translate := func(key string) string {
		return translator.T(locale, key)
	}

	return template.FuncMap{
		"T": translate,
		"TH": func(key string) template.HTML {
			return template.HTML(translate(key))
		},
		"asset":      assets.Asset,
		"encoreCSS":  assets.EncoreCSS,
		"encoreJS":   assets.EncoreJS,
		"dict":       dict,
		"default":    defaultValue,
		"toggle":     toggleMacro,
		"switch":     switchMacro,
		"file":       fileMacro(translate),
		"rangeInput": rangeMacro,
		"radio":      radioMacro,
		"lower":      strings.ToLower,
		"join":       strings.Join,
		"sortKeys":   SortedKeys[string],
	}
}

// dict builds a map from alternating keys and values, mirroring Twig's ability
// to pass structured settings to macros.
func dict(values ...any) (map[string]any, error) {
	if len(values)%2 != 0 {
		return nil, fmt.Errorf("dict needs an even number of arguments")
	}

	result := make(map[string]any, len(values)/2)
	for index := 0; index < len(values); index += 2 {
		key, ok := values[index].(string)
		if !ok {
			return nil, fmt.Errorf("dict key %d is not a string", index)
		}
		result[key] = values[index+1]
	}
	return result, nil
}

func str(settings map[string]any, key string) string {
	value, ok := settings[key]
	if !ok || value == nil {
		return ""
	}
	if text, ok := value.(string); ok {
		return text
	}
	return fmt.Sprint(value)
}

func boolean(settings map[string]any, key string) bool {
	value, ok := settings[key]
	if !ok || value == nil {
		return false
	}
	if flag, ok := value.(bool); ok {
		return flag
	}
	return false
}

func integer(settings map[string]any, key string) (string, bool) {
	value, ok := settings[key]
	if !ok || value == nil {
		return "", false
	}

	switch typed := value.(type) {
	case int:
		return strconv.Itoa(typed), true
	case int64:
		return strconv.FormatInt(typed, 10), true
	case float64:
		return strconv.FormatFloat(typed, 'f', -1, 64), true
	case string:
		return typed, true
	}
	return "", false
}

func attributes(settings map[string]any) string {
	values, ok := settings["attributes"].(map[string]any)
	if !ok {
		return ""
	}

	keys := SortedKeys(values)
	var builder strings.Builder
	for _, key := range keys {
		builder.WriteString(fmt.Sprintf(` %s="%s"`, key, html.EscapeString(fmt.Sprint(values[key]))))
	}
	return builder.String()
}

func toggleMacro(settings map[string]any) template.HTML {
	var builder strings.Builder
	builder.WriteString(`<span class="toggle-switch">` + "\n")
	builder.WriteString(`<input type="checkbox" class="toggle-switch__input"`)
	builder.WriteString(fmt.Sprintf(` name="%s"`, html.EscapeString(str(settings, "name"))))
	if id := str(settings, "id"); id != "" {
		builder.WriteString(fmt.Sprintf(` id="%s"`, html.EscapeString(id)))
	}
	if value := str(settings, "value"); value != "" {
		builder.WriteString(fmt.Sprintf(` value="%s"`, html.EscapeString(value)))
	}
	builder.WriteString(attributes(settings))
	if boolean(settings, "checked") {
		builder.WriteString(" checked")
	}
	builder.WriteString(">\n")
	builder.WriteString(`<span class="toggle-switch__render" aria-hidden="true"></span>` + "\n")
	builder.WriteString("</span>\n")
	return template.HTML(builder.String())
}

func switchMacro(settings map[string]any) template.HTML {
	node := str(settings, "node")
	if node == "" {
		node = "span"
	}
	classes := str(settings, "classes")
	if classes != "" {
		classes = " " + classes
	}

	var builder strings.Builder
	builder.WriteString(fmt.Sprintf(`<%s class="switch%s">`+"\n", node, classes))
	builder.WriteString(`<span class="switch__input">` + "\n")
	builder.WriteString(string(toggleMacro(settings)))
	builder.WriteString("</span>\n")
	builder.WriteString(fmt.Sprintf(`<label for="%s" class="switch__label">%s</label>`+"\n", html.EscapeString(str(settings, "id")), html.EscapeString(str(settings, "label"))))
	builder.WriteString(fmt.Sprintf("</%s>\n", node))
	return template.HTML(builder.String())
}

func fileMacro(translate func(string) string) func(map[string]any) template.HTML {
	return func(settings map[string]any) template.HTML {
		placeholder := str(settings, "placeholder")
		if placeholder == "" {
			placeholder = translate("forms.file.placeholder")
		}
		button := str(settings, "button")
		if button == "" {
			button = translate("forms.file.button")
		}
		value := str(settings, "value")
		if value == "" {
			value = placeholder
		}

		var builder strings.Builder
		builder.WriteString(`<span class="file-upload">` + "\n")
		builder.WriteString(`<input type="file" class="file-upload__input"`)
		builder.WriteString(fmt.Sprintf(` name="%s"`, html.EscapeString(str(settings, "name"))))
		if id := str(settings, "id"); id != "" {
			builder.WriteString(fmt.Sprintf(` id="%s"`, html.EscapeString(id)))
		}
		if accept := str(settings, "accept"); accept != "" {
			builder.WriteString(fmt.Sprintf(` accept="%s"`, html.EscapeString(accept)))
		}
		builder.WriteString(attributes(settings))
		if boolean(settings, "required") {
			builder.WriteString(" required")
		}
		builder.WriteString(">\n")
		builder.WriteString(fmt.Sprintf(
			`<span class="file-upload__render" aria-hidden="true" data-placeholder="%s" data-value="%s" data-button="%s"></span>`+"\n",
			html.EscapeString(placeholder),
			html.EscapeString(value),
			html.EscapeString(button),
		))
		builder.WriteString("</span>\n")
		return template.HTML(builder.String())
	}
}

func rangeMacro(settings map[string]any) template.HTML {
	classes := str(settings, "classes")
	if classes != "" {
		classes = " " + classes
	}

	var builder strings.Builder
	builder.WriteString(fmt.Sprintf(`<div class="range%s">`+"\n", classes))
	builder.WriteString(fmt.Sprintf(`<label for="%s" class="range__label">%s</label>`+"\n", html.EscapeString(str(settings, "id")), html.EscapeString(str(settings, "label"))))
	builder.WriteString(`<input type="range"`)
	builder.WriteString(fmt.Sprintf(` name="%s"`, html.EscapeString(str(settings, "name"))))
	builder.WriteString(fmt.Sprintf(` id="%s"`, html.EscapeString(str(settings, "id"))))
	builder.WriteString(` class="range__input"`)
	for _, key := range []string{"min", "max", "step", "value"} {
		if value, ok := integer(settings, key); ok && value != "" {
			builder.WriteString(fmt.Sprintf(` %s="%s"`, key, html.EscapeString(value)))
		}
	}
	if output := str(settings, "output"); output != "" {
		builder.WriteString(fmt.Sprintf(` data-output="#%s"`, html.EscapeString(output)))
	}
	builder.WriteString(">\n")
	if output := str(settings, "output"); output != "" {
		builder.WriteString(fmt.Sprintf(`<output id="%s" class="range__output">%s</output>`+"\n", html.EscapeString(output), html.EscapeString(str(settings, "value"))))
	}
	builder.WriteString("</div>\n")
	return template.HTML(builder.String())
}

func radioMacro(settings map[string]any) template.HTML {
	name := str(settings, "name")
	value := str(settings, "value")
	id := str(settings, "id")
	if id == "" {
		id = name + "-" + value
	}

	var builder strings.Builder
	builder.WriteString(fmt.Sprintf(`<label for="%s" class="radio">`+"\n", html.EscapeString(id)))
	builder.WriteString(`<span class="radio__wrapper">` + "\n")
	builder.WriteString(`<input type="radio"`)
	builder.WriteString(fmt.Sprintf(` name="%s"`, html.EscapeString(name)))
	builder.WriteString(fmt.Sprintf(` value="%s"`, html.EscapeString(value)))
	builder.WriteString(fmt.Sprintf(` id="%s"`, html.EscapeString(id)))
	builder.WriteString(` class="radio__input"`)
	if boolean(settings, "required") {
		builder.WriteString(" required")
	}
	if boolean(settings, "checked") {
		builder.WriteString(" checked")
	}
	builder.WriteString(">\n")
	builder.WriteString(`<span class="radio__render"></span>` + "\n")
	builder.WriteString("</span>\n")
	builder.WriteString(fmt.Sprintf(`<span class="radio__label">%s</span>`+"\n", html.EscapeString(str(settings, "label"))))
	builder.WriteString("</label>\n")
	return template.HTML(builder.String())
}

func defaultValue(value, fallback any) any {
	switch typed := value.(type) {
	case nil:
		return fallback
	case string:
		if typed == "" {
			return fallback
		}
	}
	return value
}

// SortStrings is exposed for future template helpers.
func SortStrings(values []string) []string {
	sorted := append([]string(nil), values...)
	sort.Strings(sorted)
	return sorted
}
