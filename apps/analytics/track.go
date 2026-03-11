package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/mssola/user_agent"
)

type GeoLocation struct {
	Country string `json:"country"`
	City    string `json:"city"`
}

var geoCache = &struct {
	mu    sync.RWMutex
	cache map[string]GeoLocation
}{
	cache: make(map[string]GeoLocation),
}

func parseURLParams(rawURL string) map[string]interface{} {
	params := make(map[string]interface{})
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return params
	}
	for key, values := range parsedURL.Query() {
		if len(values) > 0 {
			params[key] = values[0]
		}
	}
	return params
}

func parseReferrer(referrer string) (domain, path string) {
	if referrer == "" {
		return "", ""
	}
	parsedURL, err := url.Parse(referrer)
	if err != nil {
		return "", ""
	}
	return parsedURL.Host, parsedURL.Path
}

func determineTrafficSource(referrer string, utmParams map[string]interface{}) string {
	if utmSource, exists := utmParams["utm_source"]; exists && utmSource != "" {
		return "utm"
	}
	if referrer == "" {
		return "direct"
	}
	referrerDomain, _ := parseReferrer(referrer)
	referrerDomain = strings.ToLower(referrerDomain)

	searchEngines := []string{"google", "bing", "yahoo", "duckduckgo", "baidu", "yandex"}
	for _, engine := range searchEngines {
		if strings.Contains(referrerDomain, engine) {
			return "search"
		}
	}
	socialSites := []string{"facebook", "twitter", "instagram", "linkedin", "pinterest", "tiktok", "youtube", "reddit"}
	for _, site := range socialSites {
		if strings.Contains(referrerDomain, site) {
			return "social"
		}
	}
	emailDomains := []string{"mail.", "email.", "newsletter."}
	for _, domain := range emailDomains {
		if strings.Contains(referrerDomain, domain) {
			return "email"
		}
	}
	return "referral"
}

func extractUTMParams(rawURL string) map[string]interface{} {
	utmParams := make(map[string]interface{})
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return utmParams
	}
	query := parsedURL.Query()
	for _, key := range []string{"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"} {
		if v := query.Get(key); v != "" {
			utmParams[key] = v
		}
	}
	return utmParams
}

func getGeoLocation(ip string) (GeoLocation, error) {
	geoCache.mu.RLock()
	if cached, exists := geoCache.cache[ip]; exists {
		geoCache.mu.RUnlock()
		return cached, nil
	}
	geoCache.mu.RUnlock()

	if ip == "127.0.0.1" || ip == "::1" || strings.HasPrefix(ip, "192.168.") || strings.HasPrefix(ip, "10.") || strings.HasPrefix(ip, "172.") {
		return GeoLocation{Country: "Unknown", City: "Unknown"}, nil
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(fmt.Sprintf("http://ip-api.com/json/%s?fields=country,city", ip))
	if err != nil {
		return GeoLocation{Country: "Unknown", City: "Unknown"}, err
	}
	defer resp.Body.Close()

	var result struct {
		Country string `json:"country"`
		City    string `json:"city"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return GeoLocation{Country: "Unknown", City: "Unknown"}, err
	}

	geo := GeoLocation{Country: result.Country, City: result.City}
	geoCache.mu.Lock()
	geoCache.cache[ip] = geo
	geoCache.mu.Unlock()
	return geo, nil
}

func trackHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var event Event
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Read error", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if err = json.Unmarshal(body, &event); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	event.SessionID = NormalizeSessionID(event.SessionID)

	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip, _, _ = net.SplitHostPort(r.RemoteAddr)
	}
	event.IP = strings.TrimSpace(ip)

	geo, err := getGeoLocation(event.IP)
	if err != nil {
		geo = GeoLocation{Country: "Unknown", City: "Unknown"}
	}
	event.Country = geo.Country
	event.City = geo.City

	uaStr := r.Header.Get("User-Agent")
	event.UserAgent = uaStr
	ua := user_agent.New(uaStr)

	if ua.Mobile() {
		event.DeviceType = "mobile"
	} else {
		event.DeviceType = "desktop"
	}

	event.BrowserName, event.BrowserVersion = ua.Browser()
	event.OSName = ua.OSInfo().Name
	event.OSVersion = ua.OSInfo().Version
	event.URLParams = parseURLParams(event.URL)
	event.UTMParams = extractUTMParams(event.URL)
	event.ReferrerDomain, event.ReferrerPath = parseReferrer(event.Referrer)
	event.TrafficSource = determineTrafficSource(event.Referrer, event.UTMParams)

	// Deduplication only when we have a valid session ID (same visitor, same page, same device, within 2s)
	var existingID string
	if event.SessionID != "" {
		err = dbPool.QueryRow(context.Background(),
			`SELECT id FROM events WHERE session_id = $1 AND url = $2 AND device_type = $3 AND ABS(EXTRACT(EPOCH FROM (NOW() - created_at))) < 2 ORDER BY created_at DESC LIMIT 1`,
			event.SessionID, event.URL, event.DeviceType).Scan(&existingID)
		if err == nil && existingID != "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"eventId": existingID, "deduped": "true"})
			return
		}
	}

	if event.URLParams == nil {
		event.URLParams = make(map[string]interface{})
	}
	if event.UTMParams == nil {
		event.UTMParams = make(map[string]interface{})
	}

	urlParamsJSON, _ := json.Marshal(event.URLParams)
	utmParamsJSON, _ := json.Marshal(event.UTMParams)
	if !json.Valid(urlParamsJSON) {
		urlParamsJSON = []byte("{}")
	}
	if !json.Valid(utmParamsJSON) {
		utmParamsJSON = []byte("{}")
	}

	sessionIDArg := interface{}(event.SessionID)
	if event.SessionID == "" {
		sessionIDArg = nil
	}
	var eventID string
	err = dbPool.QueryRow(context.Background(), `
		INSERT INTO events (
			website_id, url, referrer, screen_size, ip, country, city, session_id, device_type, created_at,
			browser_name, browser_version, os_name, os_version, user_agent, page_title, url_params,
			referrer_domain, referrer_path, traffic_source, utm_params
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(),
			$10, $11, $12, $13, $14, $15, $16::jsonb,
			$17, $18, $19, $20::jsonb
		)
		RETURNING id`,
		event.WebsiteID, event.URL, event.Referrer, event.ScreenSize, event.IP, event.Country, event.City, sessionIDArg, event.DeviceType,
		event.BrowserName, event.BrowserVersion, event.OSName, event.OSVersion, event.UserAgent, event.PageTitle, urlParamsJSON,
		event.ReferrerDomain, event.ReferrerPath, event.TrafficSource, utmParamsJSON,
	).Scan(&eventID)

	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		fmt.Println("DB Error:", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"eventId": eventID})
}
