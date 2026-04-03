package main

import (
	"regexp"
	"strings"
)

// Client scripts must send websites.id (UUID from the Luminum dashboard).
var websiteUUIDRe = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

func normalizeWebsiteID(raw string) (canonical string, ok bool) {
	s := strings.TrimSpace(raw)
	if s == "" || !websiteUUIDRe.MatchString(s) {
		return "", false
	}
	return strings.ToLower(s), true
}
