package app

import "os"

// Config holds filesystem and network settings. Every value can be overridden
// with an environment variable so the binary does not need rebuilds.
type Config struct {
	Addr        string
	WebDir      string
	DataDir     string
	TemplateDir string
	Env         string
}

func LoadConfig() Config {
	return Config{
		Addr:        env("PG_ADDR", ":8000"),
		WebDir:      env("PG_WEB_DIR", "web"),
		DataDir:     env("PG_DATA_DIR", "data"),
		TemplateDir: env("PG_TEMPLATE_DIR", "templates"),
		Env:         env("PG_ENV", "dev"),
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
