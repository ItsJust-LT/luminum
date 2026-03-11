package main

import (
	"regexp"
	"strings"
)

// Session ID from cookie __luminum_sid: UUID or similar, 8–64 chars, [a-zA-Z0-9_-].
const sessionIDMaxLen = 64
const sessionIDMinLen = 8

var sessionIDRe = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

// NormalizeSessionID trims and validates the client-provided session ID.
// Returns a non-empty string only if it matches the expected format (e.g. from __luminum_sid cookie).
// Invalid or empty input returns "" so the backend can store NULL or omit it.
func NormalizeSessionID(s string) string {
	s = strings.TrimSpace(s)
	if s == "" || len(s) < sessionIDMinLen || len(s) > sessionIDMaxLen {
		return ""
	}
	if !sessionIDRe.MatchString(s) {
		return ""
	}
	return s
}
