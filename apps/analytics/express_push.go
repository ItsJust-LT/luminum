package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"sync"
	"time"
)

var (
	livePushLast   = make(map[string]time.Time)
	livePushMutex  sync.Mutex
	livePushDebounce = 500 * time.Millisecond
)

// pushLiveCountToExpress sends the current live viewer count for a website to the
// Express API so the dashboard (connected via Express WebSocket) can display it.
func pushLiveCountToExpress(websiteId string) {
	apiURL := os.Getenv("API_URL")
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
	body := map[string]interface{}{"websiteId": websiteId, "live": count}
	jsonData, err := json.Marshal(body)
	if err != nil {
		return
	}

	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest("POST", apiURL+"/api/analytics/live-update", bytes.NewBuffer(jsonData))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if webhookSecret := os.Getenv("WEBHOOK_SECRET"); webhookSecret != "" {
		req.Header.Set("X-Webhook-Secret", webhookSecret)
	}

	resp, err := client.Do(req)
	if err != nil {
		return
	}
	resp.Body.Close()
}
