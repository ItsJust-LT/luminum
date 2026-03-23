package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/emersion/go-smtp"
	"github.com/joho/godotenv"
)

const (
	serviceName = "luminum-mail"
	defaultHTTP = "8025"
	defaultSMTP = "25"
)

func main() {
	if runGenDkimKey() {
		return
	}
	_ = godotenv.Load()

	apiURL := os.Getenv("API_URL")
	if apiURL == "" {
		logError("API_URL is required", nil)
		os.Exit(1)
	}
	webhookSecret := os.Getenv("WEBHOOK_SECRET")
	if webhookSecret == "" {
		logError("WEBHOOK_SECRET is required", nil)
		os.Exit(1)
	}

	portHTTP := os.Getenv("PORT_HTTP")
	if portHTTP == "" {
		portHTTP = defaultHTTP
	}
	portSMTP := os.Getenv("PORT_SMTP")
	if portSMTP == "" {
		portSMTP = defaultSMTP
	}

	backend := &SMTPBackend{
		apiURL:        apiURL,
		webhookSecret: webhookSecret,
	}
	smtpSrv := smtp.NewServer(backend)
	smtpSrv.Addr = ":" + portSMTP
	if helo := os.Getenv("MAIL_SMTP_DOMAIN"); helo != "" {
		smtpSrv.Domain = helo
	} else {
		smtpSrv.Domain = "localhost"
	}
	smtpSrv.ReadTimeout = 60 * time.Second
	smtpSrv.WriteTimeout = 60 * time.Second
	smtpSrv.AllowInsecureAuth = true

	go func() {
		logInfo("SMTP listening", map[string]any{"addr": smtpSrv.Addr})
		if err := smtpSrv.ListenAndServe(); err != nil {
			logError("SMTP server error", map[string]any{"error": err.Error()})
		}
	}()

	mux := http.NewServeMux()
	sendHandler := &SendHandler{
		mailFromDefault:   os.Getenv("MAIL_FROM_DEFAULT"),
		// Deploy writes PEM keys into .env as single-line values with literal "\n".
		// Convert those escape sequences back into real newlines before DKIM parsing.
		dkimPrivateKeyPEM: func() []byte {
			dkimKey := os.Getenv("MAIL_DKIM_PRIVATE_KEY")
			dkimKey = strings.ReplaceAll(dkimKey, `\\n`, "\n")
			dkimKey = strings.ReplaceAll(dkimKey, `\n`, "\n")
			return []byte(dkimKey)
		}(),
		dkimSelector:      os.Getenv("MAIL_DKIM_SELECTOR"),
	}
	if sendHandler.dkimSelector == "" {
		sendHandler.dkimSelector = "default"
	}
	mux.HandleFunc("POST /send", sendHandler.ServeHTTP)
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		inboundIP := os.Getenv("MAIL_SEND_IP")
		if inboundIP == "" {
			inboundIP = os.Getenv("MAIL_INBOUND_IPV4")
		}
		dkimOn := os.Getenv("MAIL_DKIM_PRIVATE_KEY") != ""
		payload := map[string]any{
			"status":             "ok",
			"service":            serviceName,
			"smtpListen":         ":" + portSMTP,
			"httpListen":         ":" + portHTTP,
			"dkimSigningEnabled": dkimOn,
		}
		if inboundIP != "" {
			payload["inboundPublicIpv4"] = inboundIP
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(payload)
	})
	httpSrv := &http.Server{
		Addr:         ":" + portHTTP,
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
	}
	go func() {
		logInfo("HTTP listening", map[string]any{"addr": httpSrv.Addr})
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logError("HTTP server error", map[string]any{"error": err.Error()})
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	logInfo("Shutting down", nil)
	_ = smtpSrv.Shutdown(context.Background())
	_ = httpSrv.Close()
}

type SMTPBackend struct {
	apiURL        string
	webhookSecret string
}

func (b *SMTPBackend) NewSession(_ *smtp.Conn) (smtp.Session, error) {
	return &Session{backend: b}, nil
}

type Session struct {
	backend *SMTPBackend
	from    string
	to      []string
}

func (s *Session) AuthPlain(username, password string) error {
	return nil
}

func (s *Session) Mail(from string, _ *smtp.MailOptions) error {
	s.from = from
	return nil
}

func (s *Session) Rcpt(to string, _ *smtp.RcptOptions) error {
	s.to = append(s.to, to)
	return nil
}

func (s *Session) Data(r io.Reader) error {
	raw, err := io.ReadAll(r)
	if err != nil {
		logError("Failed to read inbound SMTP DATA", map[string]any{"error": err.Error()})
		return err
	}
	if err := forwardToAPI(s.backend.apiURL, s.backend.webhookSecret, raw, s.from, s.to); err != nil {
		logError("Failed to forward inbound email to API", map[string]any{"error": err.Error(), "from": s.from, "rcptCount": len(s.to)})
		return err
	}
	return nil
}

func (s *Session) Reset() {
	s.from = ""
	s.to = nil
}

func (s *Session) Logout() error {
	return nil
}
