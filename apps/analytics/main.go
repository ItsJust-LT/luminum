package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

const (
	serviceName = "luminum-analytics"
	defaultPort = "8080"
)

var dbPool *pgxpool.Pool

// requestLogger omits access lines for successful POST /track and /form (high volume); always logs errors and other routes.
func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		start := time.Now()
		next.ServeHTTP(ww, r)
		path := r.URL.Path
		status := ww.Status()
		if (path == "/track" || path == "/form") && status < 400 {
			return
		}
		log.Printf("[%s] %s %s %d %s", serviceName, r.Method, path, status, time.Since(start).Truncate(time.Millisecond))
	})
}

func main() {
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatalf("[%s] DATABASE_URL is required", serviceName)
	}

	poolConfig, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("[%s] Invalid DATABASE_URL: %v", serviceName, err)
	}
	poolConfig.MaxConns = 10
	poolConfig.MinConns = 2
	poolConfig.MaxConnLifetime = 30 * time.Minute
	poolConfig.MaxConnIdleTime = 5 * time.Minute
	poolConfig.ConnConfig.StatementCacheCapacity = 0
	poolConfig.ConnConfig.DescriptionCacheCapacity = 0
	poolConfig.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	dbPool, err = pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Fatalf("[%s] Database connection failed: %v", serviceName, err)
	}
	defer dbPool.Close()

	r := chi.NewRouter()

	// CORS
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "*")
			w.Header().Set("Access-Control-Max-Age", "86400")
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	})

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(requestLogger)
	r.Use(middleware.Recoverer)

	// Skip tracking for known bots and crawlers
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ua := strings.ToLower(r.Header.Get("User-Agent"))
			bots := []string{"bot", "spider", "crawl", "slurp", "bingpreview", "python-requests", "wget", "curl", "facebookexternalhit", "embedly", "pinterest", "yandex", "ahrefs", "semrush", "mj12bot", "duckduckbot", "baiduspider", "sogou"}
			for _, sig := range bots {
				if strings.Contains(ua, sig) {
					w.WriteHeader(http.StatusNoContent)
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	})

	// Health and info
	r.Get("/health", healthHandler)
	r.Get("/", rootHandler)

	// Tracking and forms
	r.Post("/track", trackHandler)
	r.Get("/script.js", serveTrackingScript)
	r.Post("/form", formSubmissionHandler)
	r.Get("/stats/live", LiveViewerCountHandler)

	// WebSockets (live viewers)
	r.HandleFunc("/ws", handleWebSocket)
	r.HandleFunc("/ws/live-dashboard", handleLiveDashboardWS)

	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}
	addr := ":" + port
	server := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("[%s] Listening on %s", serviceName, addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[%s] Server error: %v", serviceName, err)
		}
	}()

	<-done
	log.Printf("[%s] Shutting down gracefully", serviceName)
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("[%s] Shutdown error: %v", serviceName, err)
	}
	log.Printf("[%s] Stopped", serviceName)
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func rootHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte("Luminum Analytics"))
}
