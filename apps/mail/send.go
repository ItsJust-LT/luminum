package main

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/mail"
	"net/smtp"
	"strings"
	"time"

	dkim "github.com/toorop/go-dkim"
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
	mailFromDefault   string
	dkimPrivateKeyPEM []byte
	dkimSelector      string
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
		logError("Send error", map[string]any{"error": err.Error(), "toCount": len(req.To), "subject": req.Subject})
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	logInfo("Outbound email sent", map[string]any{"toCount": len(req.To), "subject": req.Subject, "messageId": messageId})

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
			logWarn("STARTTLS failed, continuing without TLS", map[string]any{"host": host, "error": err.Error()})
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
	msg, err := h.buildMessage(from, replyTo, to, subject, text, html, attachments, inReplyTo, references, messageId)
	if err != nil {
		return err
	}

	// DKIM sign if private key is configured
	if len(bytes.TrimSpace(h.dkimPrivateKeyPEM)) > 0 {
		domain := domainFromAddress(from)
		if domain != "" {
			opts := dkim.NewSigOptions()
			opts.PrivateKey = h.dkimPrivateKeyPEM
			opts.Domain = domain
			opts.Selector = h.dkimSelector
			opts.SignatureExpireIn = 3600 * 24 * 7 // 7 days
			opts.Headers = []string{"from", "to", "subject", "date", "message-id", "mime-version", "reply-to", "content-type"}
			opts.AddSignatureTimestamp = true
			opts.Canonicalization = "relaxed/relaxed"
			if err := dkim.Sign(&msg, opts); err != nil {
				logWarn("DKIM sign failed, continuing without DKIM", map[string]any{"error": err.Error(), "domain": domain})
				// continue without DKIM rather than failing the send
			}
		}
	}

	wc, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := wc.Write(msg); err != nil {
		_ = wc.Close()
		return err
	}
	return wc.Close()
}

// domainFromAddress extracts the domain from a From address (e.g. "Name <user@domain.com>" or "user@domain.com").
func domainFromAddress(from string) string {
	addr, err := mail.ParseAddress(from)
	if err != nil {
		at := strings.LastIndex(from, "@")
		if at > 0 && at < len(from)-1 {
			return strings.TrimSpace(from[at+1:])
		}
		return ""
	}
	at := strings.LastIndex(addr.Address, "@")
	if at > 0 && at < len(addr.Address)-1 {
		return addr.Address[at+1:]
	}
	return ""
}

// buildMessage builds the full MIME message and returns it as bytes.
func (h *SendHandler) buildMessage(from, replyTo string, to []string, subject, text, html string, attachments []struct {
	Filename     string `json:"filename"`
	ContentType  string `json:"contentType"`
	ContentBase64 string `json:"contentBase64"`
}, inReplyTo, references, messageId string) ([]byte, error) {
	var buf bytes.Buffer
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

	for _, hdr := range headers {
		_, _ = fmt.Fprintf(&buf, "%s\r\n", hdr)
	}
	_, _ = buf.Write([]byte("\r\n"))

	if !hasParts {
		if html != "" {
			_, _ = buf.Write([]byte(html))
		} else {
			_, _ = buf.Write([]byte(text))
		}
	} else {
		if text != "" || html != "" {
			_, _ = fmt.Fprintf(&buf, "--%s\r\n", boundary)
			if html != "" {
				_, _ = fmt.Fprintf(&buf, "Content-Type: text/html; charset=UTF-8\r\n\r\n")
				_, _ = buf.Write([]byte(html))
			} else {
				_, _ = fmt.Fprintf(&buf, "Content-Type: text/plain; charset=UTF-8\r\n\r\n")
				_, _ = buf.Write([]byte(text))
			}
			_, _ = buf.Write([]byte("\r\n"))
		}
		for _, a := range attachments {
			dec, _ := base64.StdEncoding.DecodeString(a.ContentBase64)
			_, _ = fmt.Fprintf(&buf, "--%s\r\n", boundary)
			_, _ = fmt.Fprintf(&buf, "Content-Type: %s; name=%q\r\n", a.ContentType, a.Filename)
			_, _ = fmt.Fprintf(&buf, "Content-Disposition: attachment; filename=%q\r\n", a.Filename)
			_, _ = fmt.Fprintf(&buf, "Content-Transfer-Encoding: base64\r\n\r\n")
			_, _ = buf.Write([]byte(base64.StdEncoding.EncodeToString(dec)))
			_, _ = buf.Write([]byte("\r\n"))
		}
		_, _ = fmt.Fprintf(&buf, "--%s--\r\n", boundary)
	}
	return buf.Bytes(), nil
}
