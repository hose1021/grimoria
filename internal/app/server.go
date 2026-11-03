package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

const maxHomebrewBody = 5 << 20
const maxLogBody = 16 << 10

var localePattern = regexp.MustCompile(`^[A-Za-z0-9_-]{1,16}$`)

type cachedResult struct {
	data    []map[string]string
	message string
	expires time.Time
}

// Server owns every dependency and implements http.Handler.
type Server struct {
	cfg      Config
	tr       *Translator
	locales  []Locale
	renderer *Renderer
	assets   *Assets
	homebrew *HomebrewStore
	fetcher  *Fetcher

	themeVersion string
	botcMu       sync.Mutex
	botcCache    map[string]cachedResult

	http *http.Server
}

func New(cfg Config) (*Server, error) {
	translator, err := LoadTranslator(filepath.Join(cfg.DataDir, "i18n"))
	if err != nil {
		return nil, err
	}

	locales, err := LoadLocales(filepath.Join(cfg.DataDir, "locales.json"))
	if err != nil {
		return nil, err
	}

	assets, err := LoadAssets(cfg.WebDir)
	if err != nil {
		return nil, err
	}

	renderer, err := NewRenderer(cfg.TemplateDir, translator, assets, locales)
	if err != nil {
		return nil, err
	}

	homebrew, err := NewHomebrewStore(filepath.Join(cfg.DataDir, "homebrew"))
	if err != nil {
		return nil, err
	}

	themeVersion := "1"
	if info, statErr := os.Stat(filepath.Join(cfg.WebDir, "css", "theme.css")); statErr == nil {
		themeVersion = fmt.Sprint(info.ModTime().Unix())
	}

	server := &Server{
		themeVersion: themeVersion,
		cfg:          cfg,
		tr:           translator,
		locales:      locales,
		renderer:     renderer,
		assets:       assets,
		homebrew:     homebrew,
		fetcher:      NewFetcher(),
		botcCache:    make(map[string]cachedResult),
	}

	server.http = &http.Server{
		Addr:              cfg.Addr,
		Handler:           server,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	return server, nil
}

func (s *Server) Run() error {
	log.Printf("pocket-grimoire listening on %s (%s)", s.cfg.Addr, s.cfg.Env)
	err := s.http.ListenAndServe()
	if err == http.ErrServerClosed {
		return nil
	}
	return err
}

func (s *Server) Shutdown() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = s.http.Shutdown(ctx)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if s.serveStatic(w, r) {
		return
	}

	switch r.URL.Path {
	case "/":
		s.redirect(w, r, "/"+fallbackLocale+"/")
		return
	case "/sheet":
		s.redirect(w, r, "/"+fallbackLocale+"/sheet")
		return
	case "/_js-log":
		s.handleJSLog(w, r)
		return
	}

	trimmed := strings.TrimPrefix(r.URL.Path, "/")
	segments := strings.Split(trimmed, "/")
	locale := segments[0]

	if !localePattern.MatchString(locale) {
		http.NotFound(w, r)
		return
	}

	rest := segments[1:]
	switch {
	case len(rest) == 1 && rest[0] == "":
		s.handleIndex(w, r, locale)
	case len(rest) == 1 && rest[0] == "sheet":
		s.handleSheet(w, r, locale)
	case len(rest) == 1 && rest[0] == "homebrew":
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", "POST")
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		s.handleHomebrew(w, r, locale)
	case len(rest) == 2 && rest[0] == "data" && rest[1] == "url":
		s.handleDataURL(w, r, locale)
	case len(rest) == 2 && rest[0] == "data" && rest[1] == "get-game":
		s.handleGetGame(w, r, locale)
	case len(rest) == 2 && rest[0] == "data" && rest[1] == "get-botc":
		s.handleGetBotc(w, r, locale)
	default:
		http.NotFound(w, r)
	}
}

func (s *Server) redirect(w http.ResponseWriter, r *http.Request, target string) {
	if query := r.URL.RawQuery; query != "" {
		target += "?" + query
	}
	http.Redirect(w, r, target, http.StatusMovedPermanently)
}

func (s *Server) serveStatic(w http.ResponseWriter, r *http.Request) bool {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return false
	}

	relative := path.Clean(strings.TrimPrefix(r.URL.Path, "/"))
	if relative == "." || relative == "" || strings.HasPrefix(relative, "..") {
		return false
	}

	file := filepath.Join(s.cfg.WebDir, filepath.FromSlash(relative))
	info, err := os.Stat(file)
	if err != nil || info.IsDir() {
		return false
	}

	if strings.HasPrefix(relative, "css/") {
		w.Header().Set("Cache-Control", "no-cache")
	} else if strings.HasPrefix(relative, "build/data/") {
		w.Header().Set("Cache-Control", "public, max-age=300")
	} else if strings.HasPrefix(relative, "build/") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		w.Header().Set("Cache-Control", "public, max-age=3600")
	}

	http.ServeFile(w, r, file)
	return true
}

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request, locale string) {
	if !allowGET(w, r) {
		return
	}

	page := s.newPage(locale, r, false)
	page.Title = s.tr.T(locale, "index.title")
	page.Desc = s.tr.T(locale, "index.description")
	page.BodyClass = "body-grimoire"
	page.StyleEntry = "css/main"
	page.ScriptEntry = "js/main"
	page.I18N = JSONForTemplate(s.indexI18N(locale))
	page.InfoTokens = s.infoTokens(locale)
	page.URLS = JSONForTemplate(map[string]string{
		"homebrew": "/" + locale + "/homebrew",
		"url":      "/" + locale + "/data/url?url={url}",
		"botc":     "/" + locale + "/data/get-botc?term={term}",
	})

	s.render(w, "index", locale, page)
}

func (s *Server) handleSheet(w http.ResponseWriter, r *http.Request, locale string) {
	if !allowGET(w, r) {
		return
	}

	page := s.newPage(locale, r, true)
	page.Title = s.tr.T(locale, "sheet.title")
	page.Desc = s.tr.T(locale, "sheet.description")
	page.BodyClass = "body-sheet"
	page.StyleEntry = "css/sheet"
	page.ScriptEntry = "js/sheet"
	page.Name = r.URL.Query().Get("name")
	page.I18N = JSONForTemplate(s.sheetI18N(locale))
	page.GameURL = "/" + locale + "/data/get-game?game={game}"

	s.render(w, "sheet", locale, page)
}

func (s *Server) render(w http.ResponseWriter, name, locale string, page Page) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := s.renderer.Render(w, name, locale, page); err != nil {
		log.Printf("render %s %s: %v", name, locale, err)
	}
}

func allowGET(w http.ResponseWriter, r *http.Request) bool {
	if r.Method == http.MethodGet || r.Method == http.MethodHead {
		return true
	}
	w.Header().Set("Allow", "GET, HEAD")
	http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
	return false
}

func (s *Server) newPage(locale string, r *http.Request, isSheet bool) Page {
	query := url.Values{}
	if isSheet {
		for _, key := range []string{"characters", "name", "game", "traveller", "fabled"} {
			if value := r.URL.Query().Get(key); value != "" {
				query.Set(key, value)
			}
		}
	}

	links := make([]LocaleLink, 0, len(s.locales))
	for _, item := range s.locales {
		target := "/" + item.Code + "/"
		if isSheet {
			target += "sheet"
			if encoded := query.Encode(); encoded != "" {
				target += "?" + encoded
			}
		}
		links = append(links, LocaleLink{
			Code: item.Code,
			Text: item.Text,
			URL:  target,
			Lang: BuildLocaleAttr(item.Code),
			Dir:  BuildDir(item.Code),
		})
	}

	teamKeys := []string{"townsfolk", "outsider", "minion", "demon", "traveller"}
	teams := make([]Option, 0, len(teamKeys))
	for _, key := range teamKeys {
		teams = append(teams, Option{Value: key, Label: s.tr.T(locale, "groups."+key)})
	}

	clearKeys := []string{"characters", "tokens", "inputs", "details", "infoTokens", "names", "height"}
	clears := make([]Option, 0, len(clearKeys))
	for _, key := range clearKeys {
		clears = append(clears, Option{
			Value: key,
			Label: s.tr.T(locale, "setup.clear_cache."+clearLabelKey(key)),
			Note:  s.tr.T(locale, "setup.clear_cache."+clearNoteKey(key)),
		})
	}

	return Page{
		Teams:        teams,
		Clears:       clears,
		Locale:       locale,
		LocaleAttr:   BuildLocaleAttr(locale),
		Dir:          BuildDir(locale),
		Locales:      links,
		Env:          s.cfg.Env,
		DataScript:   s.assets.DataScript(locale),
		ThemeVersion: s.themeVersion,
		SheetURL:     "/" + locale + "/sheet",
		StyleEntry:   "css/main",
		ScriptEntry:  "js/main",
	}
}

func (s *Server) indexI18N(locale string) map[string]string {
	return map[string]string{
		"goodTeam":              s.tr.T(locale, "messages.good_team"),
		"evilTeam":              s.tr.T(locale, "messages.evil_team"),
		"emptyCharacterAbility": s.tr.T(locale, "messages.empty_character_ability"),
		"versionChange":         s.tr.T(locale, "messages.version_change_message"),
		"invalidScript":         s.tr.T(locale, "messages.invalid_script"),
		"noCharacters":          s.tr.T(locale, "messages.no_characters"),
		"customInfoToken":       s.tr.T(locale, "messages.custom_info_token"),
		"bagDisabled":           s.tr.T(locale, "messages.bag_disabled"),
		"players":               s.tr.T(locale, "groups.players"),
		"townsfolk":             s.tr.T(locale, "groups.townsfolk"),
		"outsider":              s.tr.T(locale, "groups.outsider"),
		"minion":                s.tr.T(locale, "groups.minion"),
		"demon":                 s.tr.T(locale, "groups.demon"),
	}
}

func (s *Server) infoTokens(locale string) template.JS {
	definitions := []struct {
		ID     string `json:"id"`
		Colour string `json:"colour"`
		Markup string `json:"markup"`
	}{
		{"isdemon", "red", s.tr.T(locale, "info_tokens.info_tokens.isdemon")},
		{"isminion", "red", s.tr.T(locale, "info_tokens.info_tokens.isminion")},
		{"notinplay", "blue", s.tr.T(locale, "info_tokens.info_tokens.notinplay")},
		{"selectedyou", "green", s.tr.T(locale, "info_tokens.info_tokens.selectedyou")},
		{"playeris", "purple", s.tr.T(locale, "info_tokens.info_tokens.playeris")},
		{"youare", "dark-purple", s.tr.T(locale, "info_tokens.info_tokens.youare")},
		{"useability", "dark-orange", s.tr.T(locale, "info_tokens.info_tokens.useability")},
		{"makechoice", "dark-orange", s.tr.T(locale, "info_tokens.info_tokens.makechoice")},
		{"nominatetoday", "orange", s.tr.T(locale, "info_tokens.info_tokens.nominatetoday")},
		{"votetoday", "dark-orange", s.tr.T(locale, "info_tokens.info_tokens.votetoday")},
	}

	raw, _ := json.Marshal(definitions)
	return template.JS(raw)
}

func (s *Server) sheetI18N(locale string) map[string]string {
	return map[string]string{
		"players":   s.tr.T(locale, "groups.players"),
		"townsfolk": s.tr.T(locale, "groups.townsfolk"),
		"outsider":  s.tr.T(locale, "groups.outsider"),
		"minion":    s.tr.T(locale, "groups.minion"),
		"demon":     s.tr.T(locale, "groups.demon"),
		"traveller": s.tr.T(locale, "groups.traveller"),
		"fabled":    s.tr.T(locale, "groups.fabled"),
		"loric":     s.tr.T(locale, "groups.loric"),
		"jinx":      s.tr.T(locale, "sheet.jinx"),
		"jinxes":    s.tr.T(locale, "jinxes.title"),
	}
}

func (s *Server) handleHomebrew(w http.ResponseWriter, r *http.Request, locale string) {
	body, err := io.ReadAll(io.LimitReader(r.Body, maxHomebrewBody))
	if err != nil {
		s.writeMessage(w, http.StatusBadRequest, s.tr.T(locale, "messages.no_data"))
		return
	}

	var decoded any
	if err := json.Unmarshal(body, &decoded); err != nil || decoded == nil {
		s.writeMessage(w, http.StatusOK, s.tr.T(locale, "messages.no_data"))
		return
	}

	entries, ok := decoded.([]any)
	if !ok {
		s.writeMessage(w, http.StatusOK, s.tr.T(locale, "messages.invalid_data"))
		return
	}

	valid, reasons := ValidateEntries(entries, func(key string) string {
		return s.tr.T(locale, key)
	})
	if !valid {
		s.writeJSON(w, http.StatusOK, map[string]any{
			"success": false,
			"message": s.tr.T(locale, "messages.invalid_data"),
			"reasons": reasons,
		})
		return
	}

	uuid, err := s.homebrew.Create(entries)
	if err != nil {
		log.Printf("homebrew create: %v", err)
		s.writeMessage(w, http.StatusInternalServerError, s.tr.T(locale, "messages.invalid_data"))
		return
	}

	s.writeJSON(w, http.StatusOK, map[string]any{"success": true, "game": uuid})
}

func (s *Server) handleDataURL(w http.ResponseWriter, r *http.Request, locale string) {
	value := r.URL.Query().Get("url")
	payload, failure := s.fetcher.GetJSON(value)
	if failure != nil {
		s.writeMessage(w, http.StatusOK, s.translateError(locale, failure))
		return
	}

	s.writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": payload})
}

func (s *Server) handleGetGame(w http.ResponseWriter, r *http.Request, locale string) {
	uuid := r.URL.Query().Get("game")
	if uuid == "" || !IsUUID(uuid) {
		s.writeMessage(w, http.StatusOK, s.tr.T(locale, "errors.homebrew_json.invalid_uuid"))
		return
	}

	entries, found, err := s.homebrew.Get(uuid)
	if err != nil {
		log.Printf("homebrew get: %v", err)
		s.writeMessage(w, http.StatusOK, s.tr.T(locale, "errors.homebrew_json.unrecognised_uuid"))
		return
	}
	if !found {
		s.writeMessage(w, http.StatusOK, s.tr.T(locale, "errors.homebrew_json.unrecognised_uuid"))
		return
	}

	s.writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": entries})
}

func (s *Server) handleGetBotc(w http.ResponseWriter, r *http.Request, locale string) {
	term := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("term")))
	for strings.Contains(term, "  ") {
		term = strings.ReplaceAll(term, "  ", " ")
	}
	term = truncate(term, 100)

	if term == "" {
		s.writeMessage(w, http.StatusOK, s.tr.T(locale, "errors.botc_scripts.invalid_search"))
		return
	}

	query := url.Values{}
	query.Set("search", term)
	query.Set("ordering", "-score")
	target := "https://botcscripts.com/api/scripts/?" + query.Encode()
	key := hashKey(target)

	if cached, ok := s.readBotcCache(key); ok {
		if cached.message != "" {
			s.writeMessage(w, http.StatusOK, cached.message)
		} else {
			s.writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": cached.data})
		}
		return
	}

	payload, failure := s.fetcher.GetJSON(target)
	if failure != nil {
		message := s.translateError(locale, failure)
		s.writeBotcCache(key, cachedResult{message: message, expires: time.Now().Add(10 * time.Minute)})
		s.writeMessage(w, http.StatusOK, message)
		return
	}

	data := ConvertBotcScripts(payload)
	s.writeBotcCache(key, cachedResult{data: data, expires: time.Now().Add(10 * time.Minute)})
	s.writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": data})
}

func (s *Server) readBotcCache(key string) (cachedResult, bool) {
	s.botcMu.Lock()
	defer s.botcMu.Unlock()

	cached, ok := s.botcCache[key]
	if !ok || time.Now().After(cached.expires) {
		delete(s.botcCache, key)
		return cachedResult{}, false
	}
	return cached, true
}

func (s *Server) writeBotcCache(key string, value cachedResult) {
	s.botcMu.Lock()
	defer s.botcMu.Unlock()
	s.botcCache[key] = value
}

func (s *Server) handleJSLog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST")
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, maxLogBody+1))
	if err != nil || len(body) > maxLogBody {
		s.writeJSON(w, http.StatusRequestEntityTooLarge, map[string]any{"success": false, "message": "Payload too large"})
		return
	}

	var data map[string]any
	if err := json.Unmarshal(body, &data); err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "JSON error: " + err.Error()})
		return
	}

	level := asString(data["level"])
	message := truncate(asString(data["message"]), 4096)
	if message == "" {
		message = "JavaScript " + level
	}

	log.Printf("js[%s] %s | url=%s line=%v column=%v pathname=%s", level, message,
		truncate(asString(data["url"]), 2048), data["line"], data["column"], asString(data["pathname"]))

	s.writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (s *Server) translateError(locale string, failure *FetchError) string {
	message := s.tr.T(locale, failure.Key)
	for name, value := range failure.Params {
		message = strings.ReplaceAll(message, name, value)
	}
	return message
}

func (s *Server) writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("write json: %v", err)
	}
}

func (s *Server) writeMessage(w http.ResponseWriter, status int, message string) {
	s.writeJSON(w, status, map[string]any{"success": false, "message": message})
}

func hashKey(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func truncate(value string, limit int) string {
	runes := []rune(value)
	if len(runes) <= limit {
		return value
	}
	return string(runes[:limit])
}

func clearLabelKey(value string) string {
	switch value {
	case "characters":
		return "characters_label"
	case "tokens":
		return "tokens_label"
	case "inputs":
		return "inputs_label"
	case "details":
		return "details_label"
	case "infoTokens":
		return "info_tokens_label"
	case "names":
		return "names_label"
	case "height":
		return "height_label"
	}
	return value
}

func clearNoteKey(value string) string {
	switch value {
	case "characters":
		return "characters_note"
	case "tokens":
		return "tokens_note"
	case "inputs":
		return "inputs_note"
	case "details":
		return "details_note"
	case "infoTokens":
		return "info_tokens_note"
	case "names":
		return "names_note"
	case "height":
		return "height_note"
	}
	return value
}
