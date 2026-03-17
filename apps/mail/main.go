package main

import (
	"context"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
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
		log.Fatalf("[%s] API_URL is required", serviceName)
	}
	webhookSecret := os.Getenv("WEBHOOK_SECRET")
	if webhookSecret == "" {
		log.Fatalf("[%s] WEBHOOK_SECRET is required", serviceName)
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
	smtpSrv.Domain = "localhost"
	smtpSrv.ReadTimeout = 60 * time.Second
	smtpSrv.WriteTimeout = 60 * time.Second
	smtpSrv.AllowInsecureAuth = true

	go func() {
		log.Printf("[%s] SMTP listening on %s", serviceName, smtpSrv.Addr)
		if err := smtpSrv.ListenAndServe(); err != nil {
			log.Printf("[%s] SMTP server error: %v", serviceName, err)
		}
	}()

	mux := http.NewServeMux()
	sendHandler := &SendHandler{
		mailFromDefault:   os.Getenv("MAIL_FROM_DEFAULT"),
		dkimPrivateKeyPEM: []byte(os.Getenv("MAIL_DKIM_PRIVATE_KEY")),
		dkimSelector:      os.Getenv("MAIL_DKIM_SELECTOR"),
	}
	if sendHandler.dkimSelector == "" {
		sendHandler.dkimSelector = "default"
	}
	mux.HandleFunc("POST /send", sendHandler.ServeHTTP)
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok","service":"luminum-mail"}`))
	})
	httpSrv := &http.Server{
		Addr:         ":" + portHTTP,
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
	}
	go func() {
		log.Printf("[%s] HTTP listening on %s", serviceName, httpSrv.Addr)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("[%s] HTTP server error: %v", serviceName, err)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	log.Printf("[%s] Shutting down...", serviceName)
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
		return err
	}
	return forwardToAPI(s.backend.apiURL, s.backend.webhookSecret, raw, s.from, s.to)
}

func (s *Session) Reset() {
	s.from = ""
	s.to = nil
}

func (s *Session) Logout() error {
	return nil
}
