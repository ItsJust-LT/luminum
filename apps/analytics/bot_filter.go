package main

import (
	"net/http"
	"strings"
)

// Substrings matched against User-Agent (lowercased) to skip analytics for automated
// browsers — notably Luminum site audits (Puppeteer + HeadlessChrome) and common tools.
var automatedUserAgentMarkers = []string{
	"headlesschrome",
	"puppeteer",
	"phantomjs",
	"chrome-lighthouse",
	"lighthouse", // some runners include this in UA
	"selenium",
	"webdriver",
	"google page speed",
	"gtmetrix",
}

func shouldIgnoreAutomatedClient(r *http.Request) bool {
	ua := strings.ToLower(strings.TrimSpace(r.Header.Get("User-Agent")))
	if ua == "" {
		return false
	}
	for _, m := range automatedUserAgentMarkers {
		if strings.Contains(ua, m) {
			return true
		}
	}
	return false
}
