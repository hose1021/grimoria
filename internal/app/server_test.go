package app

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func testServer(t *testing.T) *httptest.Server {
	t.Helper()

	server, err := New(Config{
		Addr:        ":0",
		WebDir:      "../../web",
		DataDir:     "../../data",
		TemplateDir: "../../templates",
		Env:         "test",
	})
	if err != nil {
		t.Fatalf("new: %v", err)
	}

	httpServer := httptest.NewServer(server)
	t.Cleanup(httpServer.Close)
	return httpServer
}

func TestPagesRender(t *testing.T) {
	httpServer := testServer(t)

	tests := []struct {
		path     string
		contains string
	}{
		{"/", "/en_GB/"},
		{"/en_GB/", `var URLS`},
		{"/az_AZ/", "Quraşdırma"},
		{"/ru_RU/sheet?characters=washerwoman", "sheet-groups"},
	}

	for _, test := range tests {
		response, err := http.Get(httpServer.URL + test.path)
		if err != nil {
			t.Fatalf("%s: %v", test.path, err)
		}
		body, _ := io.ReadAll(response.Body)
		response.Body.Close()

		if response.StatusCode != http.StatusOK {
			t.Fatalf("%s status %d", test.path, response.StatusCode)
		}
		if !strings.Contains(string(body), test.contains) {
			t.Fatalf("%s missing %q", test.path, test.contains)
		}
	}
}

func TestStaticAssets(t *testing.T) {
	httpServer := testServer(t)

	for _, path := range []string{"/build/data/az_AZ.js", "/favicon.svg", "/site.webmanifest"} {
		response, err := http.Get(httpServer.URL + path)
		if err != nil {
			t.Fatalf("%s: %v", path, err)
		}
		response.Body.Close()
		if response.StatusCode != http.StatusOK {
			t.Fatalf("%s status %d", path, response.StatusCode)
		}
	}
}

func TestHomebrewEndpoint(t *testing.T) {
	httpServer := testServer(t)

	body := `[{"id":"custom","name":"Custom","ability":"Does things","team":"townsfolk"}]`
	response, err := http.Post(httpServer.URL+"/az_AZ/homebrew", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer response.Body.Close()

	payload, _ := io.ReadAll(response.Body)
	if !strings.Contains(string(payload), `"success":true`) {
		t.Fatalf("response = %s", payload)
	}
}
