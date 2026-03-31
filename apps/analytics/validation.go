package main

import (
	"regexp"
	"strings"
)

// events.website_id is a UUID FK to websites.id
var websiteUUIDRe = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

func normalizeWebsiteID(raw string) (canonical string, ok bool) {
	s := strings.TrimSpace(raw)
	if s == "" || !websiteUUIDRe.MatchString(s) {
		return "", false
	}
	return strings.ToLower(s), true
}
