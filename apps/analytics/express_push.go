package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

var (
	livePushLast     = make(map[string]time.Time)
	livePushMutex    sync.Mutex
	livePushDebounce = 500 * time.Millisecond
)

func getExpressClient() *http.Client {
	return &http.Client{Timeout: 5 * time.Second}
}

func getAPIURL() string {
	return os.Getenv("API_URL")
}

func getWebhookSecret() string {
	return os.Getenv("WEBHOOK_SECRET")
}

// pushLiveCountToExpress sends the current live viewer count and per-page
// breakdown for a website to the Express API.
func pushLiveCountToExpress(websiteId string) {
	apiURL := getAPIURL()
	if apiURL == "" {
		return
	}

	livePushMutex.Lock()
	last := livePushLast[websiteId]
	if time.Since(last) < livePushDebounce {
		livePushMutex.Unlock()
		return
	}
	livePushLast[websiteId] = time.Now()
	livePushMutex.Unlock()

	count := GetLiveViewerCount(websiteId)
	pages := GetLivePageCounts(websiteId)

	body := map[string]interface{}{
		"websiteId": websiteId,
		"live":      count,
		"pages":     pages,
	}
	jsonData, err := json.Marshal(body)
	if err != nil {
		return
	}

	client := getExpressClient()
	req, err := http.NewRequest("POST", apiURL+"/api/analytics/live-update", bytes.NewBuffer(jsonData))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if secret := getWebhookSecret(); secret != "" {
		req.Header.Set("X-Webhook-Secret", secret)
	}

	resp, err := client.Do(req)
	if err != nil {
		return
	}
	resp.Body.Close()
}

// pushPageTransitionToExpress records a page-to-page navigation for a session.
func pushPageTransitionToExpress(websiteId, sessionId, fromPage, toPage string) {
	apiURL := getAPIURL()
	if apiURL == "" {
		return
	}

	body := map[string]interface{}{
		"websiteId": websiteId,
		"sessionId": sessionId,
		"fromPage":  fromPage,
		"toPage":    toPage,
	}
	jsonData, err := json.Marshal(body)
	if err != nil {
		return
	}

	client := getExpressClient()
	req, err := http.NewRequest("POST", apiURL+"/api/analytics/page-transition", bytes.NewBuffer(jsonData))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if secret := getWebhookSecret(); secret != "" {
		req.Header.Set("X-Webhook-Secret", secret)
	}

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[express_push] page-transition error: %v", err)
		return
	}
	resp.Body.Close()
}

// pushEventNotifyToExpress notifies the Express API that a new event was
// inserted so the dashboard can update stats in real-time.
func pushEventNotifyToExpress(websiteId, eventId, url, sessionId string) {
	apiURL := getAPIURL()
	if apiURL == "" {
		return
	}

	body := map[string]interface{}{
		"websiteId": websiteId,
		"eventId":   eventId,
		"url":       url,
		"sessionId": sessionId,
	}
	jsonData, err := json.Marshal(body)
	if err != nil {
		return
	}

	client := getExpressClient()
	req, err := http.NewRequest("POST", apiURL+"/api/analytics/event-notify", bytes.NewBuffer(jsonData))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if secret := getWebhookSecret(); secret != "" {
		req.Header.Set("X-Webhook-Secret", secret)
	}

	resp, err := client.Do(req)
	if err != nil {
		return
	}
	resp.Body.Close()
}
