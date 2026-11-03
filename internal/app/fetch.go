package app

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"time"
)

const maxBody = 8 << 20

// FetchError is a translatable network error.
type FetchError struct {
	Key    string
	Params map[string]string
}

func (e *FetchError) Error() string {
	return e.Key
}

// Fetcher performs SSRF-safe HTTPS requests.
type Fetcher struct {
	client *http.Client
}

func NewFetcher() *Fetcher {
	return &Fetcher{client: &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}}
}

// GetJSON fetches the URL and decodes its JSON body.
func (f *Fetcher) GetJSON(rawURL string) (any, *FetchError) {
	body, failure := f.get(rawURL)
	if failure != nil {
		return nil, failure
	}

	var decoded any
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.UseNumber()
	if err := decoder.Decode(&decoded); err != nil {
		return nil, &FetchError{Key: "errors.url.not_json"}
	}
	return decoded, nil
}

func (f *Fetcher) get(rawURL string) ([]byte, *FetchError) {
	current := rawURL

	for redirects := 0; redirects <= 3; redirects++ {
		if failure := checkSafeURL(current); failure != nil {
			return nil, failure
		}

		request, err := http.NewRequest(http.MethodGet, current, nil)
		if err != nil {
			return nil, &FetchError{Key: "errors.url.no_url"}
		}

		response, err := f.client.Do(request)
		if err != nil {
			return nil, &FetchError{Key: "errors.url.cannot_access"}
		}

		if response.StatusCode >= 300 && response.StatusCode < 400 {
			location := response.Header.Get("Location")
			_ = response.Body.Close()
			if location == "" {
				return nil, &FetchError{Key: "errors.url.redirect_no_location"}
			}

			base, err := url.Parse(current)
			if err != nil {
				return nil, &FetchError{Key: "errors.url.no_url"}
			}
			target, err := base.Parse(location)
			if err != nil {
				return nil, &FetchError{Key: "errors.url.no_url"}
			}
			current = target.String()
			continue
		}

		defer response.Body.Close()

		if response.StatusCode != http.StatusOK {
			return nil, &FetchError{Key: "errors.url.http_status", Params: map[string]string{
				"%code%": fmt.Sprint(response.StatusCode),
			}}
		}

		body, err := io.ReadAll(io.LimitReader(response.Body, maxBody))
		if err != nil {
			return nil, &FetchError{Key: "errors.url.cannot_access"}
		}
		return body, nil
	}

	return nil, &FetchError{Key: "errors.url.too_many_redirects"}
}

// checkSafeURL rejects anything that could touch the private network.
func checkSafeURL(rawURL string) *FetchError {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return &FetchError{Key: "errors.url.no_url"}
	}

	if parsed.Scheme != "https" {
		return &FetchError{Key: "errors.url.https_only"}
	}
	if parsed.User != nil {
		return &FetchError{Key: "errors.url.has_credentials"}
	}
	if port := parsed.Port(); port != "" && port != "443" {
		return &FetchError{Key: "errors.url.port_not_443"}
	}

	host := parsed.Hostname()
	if host == "" {
		return &FetchError{Key: "errors.url.no_hostname"}
	}

	addresses, err := net.LookupIP(host)
	if err != nil || len(addresses) == 0 {
		return &FetchError{Key: "errors.url.cannot_access"}
	}

	for _, address := range addresses {
		if !isPublicIP(address) {
			return &FetchError{Key: "errors.url.cannot_access"}
		}
	}

	return nil
}

func isPublicIP(address net.IP) bool {
	if address.IsLoopback() || address.IsPrivate() || address.IsUnspecified() ||
		address.IsLinkLocalUnicast() || address.IsLinkLocalMulticast() ||
		address.IsInterfaceLocalMulticast() || address.IsMulticast() {
		return false
	}
	return true
}
