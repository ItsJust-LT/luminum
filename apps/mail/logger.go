package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

type mailLogger struct {
	apiURL  string
	secret  string
	enabled bool
	client  *http.Client
}

var appLogger = newMailLogger()

func newMailLogger() *mailLogger {
	apiURL := strings.TrimSuffix(strings.TrimSpace(os.Getenv("API_URL")), "/")
	secret := strings.TrimSpace(os.Getenv("LOG_INGEST_SECRET"))
	return &mailLogger{
		apiURL:  apiURL,
		secret:  secret,
		enabled: apiURL != "" && secret != "",
		client:  &http.Client{Timeout: 4 * time.Second},
	}
}

func (l *mailLogger) log(level string, message string, meta map[string]any) {
	log.Printf("[%s] %s", serviceName, message)
	if !l.enabled {
		return
	}

	bodyMap := map[string]any{
		"service": "mail",
		"level":   level,
		"message": message,
	}
	if len(meta) > 0 {
		bodyMap["meta"] = meta
	}
	body, err := json.Marshal(bodyMap)
	if err != nil {
		return
	}
	req, err := http.NewRequest(http.MethodPost, l.apiURL+"/api/admin/logs/ingest", bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-log-secret", l.secret)
	resp, err := l.client.Do(req)
	if err != nil {
		return
	}
	_ = resp.Body.Close()
}

func logInfo(message string, meta map[string]any) {
	appLogger.log("info", message, meta)
}

func logWarn(message string, meta map[string]any) {
	appLogger.log("warn", message, meta)
}

func logError(message string, meta map[string]any) {
	appLogger.log("error", message, meta)
}
