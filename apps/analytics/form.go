package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

func formSubmissionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Read error", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var payload map[string]interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if shouldIgnoreAutomatedClient(r) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{"status": "ignored", "reason": "automated"})
		return
	}

	rawWid, ok := payload["websiteId"].(string)
	if !ok {
		http.Error(w, "Missing websiteId", http.StatusBadRequest)
		return
	}
	websiteId, widOK := normalizeWebsiteID(rawWid)
	if !widOK {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid or missing websiteId"})
		return
	}

	formName, _ := payload["formName"].(string)
	if formName == "" {
		formName = "Form Submission"
	}

	delete(payload, "websiteId")
	delete(payload, "formName")
	rawSessionId, _ := payload["sessionId"].(string)
	delete(payload, "sessionId")
	sessionId := NormalizeSessionID(rawSessionId)

	if payload == nil {
		payload = make(map[string]interface{})
	}

	formData, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, "Failed to encode form data", http.StatusInternalServerError)
		return
	}
	if !json.Valid(formData) {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	var submissionId string
	query := `INSERT INTO form_submissions (website_id, session_id, submitted_at, data, seen, contacted) VALUES ($1, $2, $3, $4::jsonb, false, false) RETURNING id`
	sessionIdPtr := interface{}(nil)
	if sessionId != "" {
		sessionIdPtr = sessionId
	}
	err = dbPool.QueryRow(context.Background(), query,
		websiteId, sessionIdPtr, time.Now().UTC(), formData,
	).Scan(&submissionId)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "unknown websiteId"})
			log.Printf("[%s] form INSERT FK rejected website_id=%s: %v", serviceName, websiteId, err)
			return
		}
		log.Printf("[%s] form INSERT error website_id=%s: %v", serviceName, websiteId, err)
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}

	broadcastFormSubmission(websiteId, map[string]interface{}{
		"submissionId": submissionId,
		"submitted_at": time.Now().UTC(),
		"data":         payload,
	})

	go sendFormNotification(websiteId, submissionId, formName, payload)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "submissionId": submissionId})
}

func sendFormNotification(websiteId, submissionId, formName string, formData map[string]interface{}) {
	apiURL := os.Getenv("API_URL")
	if apiURL == "" {
		return
	}

	notificationData := map[string]interface{}{
		"websiteId":    websiteId,
		"submissionId": submissionId,
		"formName":     formName,
		"formData":     formData,
	}

	jsonData, err := json.Marshal(notificationData)
	if err != nil {
		return
	}

	webhookSecret := os.Getenv("WEBHOOK_SECRET")
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("POST", apiURL+"/api/analytics/form-notify", bytes.NewBuffer(jsonData))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if webhookSecret != "" {
		req.Header.Set("X-Webhook-Secret", webhookSecret)
	}

	resp, err := client.Do(req)
	if err != nil {
		return
	}
	defer resp.Body.Close()
}
