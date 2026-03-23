package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// WebhookPayload matches what the API expects.
type WebhookPayload struct {
	From        string                 `json:"from"`
	To          string                 `json:"to"`
	Subject     string                 `json:"subject"`
	Text        string                 `json:"text"`
	HTML        string                 `json:"html"`
	Headers     map[string]interface{} `json:"headers,omitempty"`
	ReceivedAt  string                 `json:"receivedAt"`
	MessageID   string                 `json:"messageId,omitempty"`
	Attachments []WebhookAttachment    `json:"attachments,omitempty"`
}

type WebhookAttachment struct {
	Filename      string `json:"filename"`
	ContentType   string `json:"contentType"`
	ContentBase64 string `json:"contentBase64"`
	Size         int    `json:"size,omitempty"`
}

func forwardToAPI(apiURL, webhookSecret string, raw []byte, from string, to []string) error {
	parsed, err := ParseRawMessage(raw)
	if err != nil {
		return fmt.Errorf("parse message: %w", err)
	}

	if parsed.From == "" {
		parsed.From = from
	}
	toStr := parsed.To
	if toStr == "" && len(to) > 0 {
		toStr = to[0]
		for i := 1; i < len(to); i++ {
			toStr += ", " + to[i]
		}
	}

	atts := make([]WebhookAttachment, 0, len(parsed.Attachments))
	for _, a := range parsed.Attachments {
		atts = append(atts, WebhookAttachment{
			Filename:      a.Filename,
			ContentType:   a.ContentType,
			ContentBase64: a.ContentBase64,
			Size:          a.Size,
		})
	}

	payload := WebhookPayload{
		From:        parsed.From,
		To:          toStr,
		Subject:     parsed.Subject,
		Text:        parsed.Text,
		HTML:        parsed.HTML,
		Headers:     parsed.Headers,
		ReceivedAt:  parsed.Date.UTC().Format(time.RFC3339),
		MessageID:   parsed.MessageID,
		Attachments: atts,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal webhook payload: %w", err)
	}

	ts := strconv.FormatInt(time.Now().Unix(), 10)
	mac := hmac.New(sha256.New, []byte(webhookSecret))
	mac.Write([]byte(ts + "." + string(body)))
	sig := hex.EncodeToString(mac.Sum(nil))

	base := strings.TrimSuffix(apiURL, "/")
	url := base + "/api/webhook/emails"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-webhook-timestamp", ts)
	req.Header.Set("x-webhook-signature", sig)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("webhook POST: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("webhook returned %d", resp.StatusCode)
	}
	logInfo("Inbound email forwarded to API", map[string]any{"from": parsed.From, "to": parsed.To, "subject": parsed.Subject})
	return nil
}
