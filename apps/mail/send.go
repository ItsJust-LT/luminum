package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/smtp"
	"strings"
	"time"
)

// SendRequest matches SendViaMailAppPayload from the API.
type SendRequest struct {
	From        string   `json:"from"`
	ReplyTo     string   `json:"replyTo"`
	To          []string `json:"to"`
	Subject     string   `json:"subject"`
	Text        string   `json:"text"`
	HTML        string   `json:"html"`
	Attachments []struct {
		Filename     string `json:"filename"`
		ContentType  string `json:"contentType"`
		ContentBase64 string `json:"contentBase64"`
	} `json:"attachments,omitempty"`
	InReplyTo  string `json:"inReplyTo,omitempty"`
	References string `json:"references,omitempty"`
	MessageID  string `json:"messageId,omitempty"`
}

// SendHandler handles POST /send.
type SendHandler struct {
	mailFromDefault string
}

func (h *SendHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	if len(req.To) == 0 {
		http.Error(w, "missing 'to'", http.StatusBadRequest)
		return
	}
	from := strings.TrimSpace(req.From)
	if from == "" {
		from = h.mailFromDefault
	}
	if from == "" {
		http.Error(w, "missing 'from' and no MAIL_FROM_DEFAULT", http.StatusBadRequest)
		return
	}

	messageId := strings.TrimSpace(req.MessageID)
	if messageId == "" {
		b := make([]byte, 8)
		_, _ = rand.Read(b)
		messageId = "<" + hex.EncodeToString(b) + "." + fmt.Sprintf("%d", time.Now().UnixNano()) + "@luminum-mail>"
	}

	err := h.sendSMTP(from, req.ReplyTo, req.To, req.Subject, req.Text, req.HTML, req.Attachments, req.InReplyTo, req.References, messageId)
	if err != nil {
		log.Printf("[%s] Send error: %v", serviceName, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"messageId": messageId})
}

func (h *SendHandler) sendSMTP(from, replyTo string, to []string, subject, text, html string, attachments []struct {
	Filename     string `json:"filename"`
	ContentType  string `json:"contentType"`
	ContentBase64 string `json:"contentBase64"`
}, inReplyTo, references, messageId string) error {
	// For simplicity we send to the first recipient's MX; real implementation might loop per-recipient.
	recipient := to[0]
	at := strings.Index(recipient, "@")
	if at <= 0 {
		return fmt.Errorf("invalid recipient: %s", recipient)
	}
	domain := recipient[at+1:]

	mxRecords, err := net.LookupMX(domain)
	if err != nil || len(mxRecords) == 0 {
		return fmt.Errorf("no MX for %s: %w", domain, err)
	}
	host := strings.TrimSuffix(mxRecords[0].Host, ".")

	addr := host + ":25"
	conn, err := net.DialTimeout("tcp", addr, 15*time.Second)
	if err != nil {
		return fmt.Errorf("dial %s: %w", addr, err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer client.Close()

	if err = client.Hello("localhost"); err != nil {
		return err
	}
	if ok, _ := client.Extension("STARTTLS"); ok {
		if err = client.StartTLS(nil); err != nil {
			// Continue without TLS if server doesn't support or cert issue
			log.Printf("[%s] STARTTLS failed for %s: %v", serviceName, host, err)
		}
	}

	if err = client.Mail(from); err != nil {
		return err
	}
	for _, t := range to {
		if err = client.Rcpt(t); err != nil {
			return err
		}
	}
	wc, err := client.Data()
	if err != nil {
		return err
	}

	// Build minimal MIME message
	boundary := "boundary-" + fmt.Sprintf("%d", time.Now().UnixNano())
	headers := []string{
		"From: " + from,
		"To: " + strings.Join(to, ", "),
		"Subject: " + subject,
		"Date: " + time.Now().UTC().Format(time.RFC1123Z),
		"Message-ID: " + messageId,
		"MIME-Version: 1.0",
	}
	if replyTo != "" {
		headers = append(headers, "Reply-To: "+replyTo)
	}
	if inReplyTo != "" {
		headers = append(headers, "In-Reply-To: "+inReplyTo)
	}
	if references != "" {
		headers = append(headers, "References: "+references)
	}

	hasParts := (text != "" && html != "") || len(attachments) > 0
	if hasParts {
		headers = append(headers, "Content-Type: multipart/mixed; boundary="+boundary)
	} else if html != "" {
		headers = append(headers, "Content-Type: text/html; charset=UTF-8")
	} else {
		headers = append(headers, "Content-Type: text/plain; charset=UTF-8")
	}

	for _, h := range headers {
		if _, err := fmt.Fprintf(wc, "%s\r\n", h); err != nil {
			return err
		}
	}
	if _, err := wc.Write([]byte("\r\n")); err != nil {
		return err
	}

	if !hasParts {
		if html != "" {
			_, _ = wc.Write([]byte(html))
		} else {
			_, _ = wc.Write([]byte(text))
		}
	} else {
		// multipart/mixed: first part text or html, then attachments
		if text != "" || html != "" {
			_, _ = fmt.Fprintf(wc, "--%s\r\n", boundary)
			if html != "" {
				_, _ = fmt.Fprintf(wc, "Content-Type: text/html; charset=UTF-8\r\n\r\n")
				_, _ = wc.Write([]byte(html))
			} else {
				_, _ = fmt.Fprintf(wc, "Content-Type: text/plain; charset=UTF-8\r\n\r\n")
				_, _ = wc.Write([]byte(text))
			}
			_, _ = wc.Write([]byte("\r\n"))
		}
		for _, a := range attachments {
			dec, _ := base64.StdEncoding.DecodeString(a.ContentBase64)
			_, _ = fmt.Fprintf(wc, "--%s\r\n", boundary)
			_, _ = fmt.Fprintf(wc, "Content-Type: %s; name=%q\r\n", a.ContentType, a.Filename)
			_, _ = fmt.Fprintf(wc, "Content-Disposition: attachment; filename=%q\r\n", a.Filename)
			_, _ = fmt.Fprintf(wc, "Content-Transfer-Encoding: base64\r\n\r\n")
			_, _ = wc.Write([]byte(base64.StdEncoding.EncodeToString(dec)))
			_, _ = wc.Write([]byte("\r\n"))
		}
		_, _ = fmt.Fprintf(wc, "--%s--\r\n", boundary)
	}

	return wc.Close()
}
