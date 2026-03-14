package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type WSMessageType string

const (
	WSMessageTypeViewerUpdate WSMessageType = "viewer_update"
	WSMessageTypeLiveCount    WSMessageType = "live_count"
	WSMessageTypeFormSubmit   WSMessageType = "form_submission"
)

type WSMessage struct {
	Type      WSMessageType `json:"type"`
	Data      interface{}   `json:"data"`
	Timestamp time.Time     `json:"timestamp"`
}

type PageNavigationData struct {
	EventID    string `json:"eventId"`
	SessionID  string `json:"sessionId"`
	URL        string `json:"url"`
	Referrer   string `json:"referrer"`
	DeviceType string `json:"deviceType"`
	Country    string `json:"country"`
	City       string `json:"city"`
	ScreenSize string `json:"screenSize"`
	Duration   int    `json:"duration"`
}

type ViewerUpdateData struct {
	EventID    string `json:"eventId"`
	SessionID  string `json:"sessionId"`
	URL        string `json:"url"`
	DeviceType string `json:"deviceType"`
	Country    string `json:"country"`
	City       string `json:"city"`
	ScreenSize string `json:"screenSize"`
	Action     string `json:"action"`
	Duration   int    `json:"duration,omitempty"`
}

type wsConnection struct {
	conn       *websocket.Conn
	eventID    string
	sessionID  string
	startTime  time.Time
	websiteID  string
	lastURL    string
	deviceType string
	country    string
	city       string
	screenSize string
}

var liveConnections = struct {
	sync.Mutex
	conns map[*websocket.Conn]*wsConnection
}{
	conns: make(map[*websocket.Conn]*wsConnection),
}

var dashboardClients = struct {
	sync.Mutex
	clients map[string]map[*websocket.Conn]struct{}
}{
	clients: make(map[string]map[*websocket.Conn]struct{}),
}

func broadcastLiveViewerCount(websiteId string) {
	count := GetLiveViewerCount(websiteId)
	message := WSMessage{
		Type:      WSMessageTypeLiveCount,
		Data:      map[string]int{"live": count},
		Timestamp: time.Now(),
	}

	dashboardClients.Lock()
	conns := dashboardClients.clients[websiteId]
	for conn := range conns {
		if err := conn.WriteJSON(message); err != nil {
			conn.Close()
			delete(dashboardClients.clients[websiteId], conn)
		}
	}
	dashboardClients.Unlock()

	// Push to Express so dashboard (connected via Express WS) gets the count
	go pushLiveCountToExpress(websiteId)
}

func broadcastViewerUpdate(websiteId string, updateData ViewerUpdateData) {
	message := WSMessage{
		Type:      WSMessageTypeViewerUpdate,
		Data:      updateData,
		Timestamp: time.Now(),
	}

	dashboardClients.Lock()
	conns := dashboardClients.clients[websiteId]
	for conn := range conns {
		if err := conn.WriteJSON(message); err != nil {
			conn.Close()
			delete(dashboardClients.clients[websiteId], conn)
		}
	}
	dashboardClients.Unlock()
}

func broadcastFormSubmission(websiteId string, data map[string]interface{}) {
	message := WSMessage{
		Type:      WSMessageTypeFormSubmit,
		Data:      data,
		Timestamp: time.Now(),
	}

	dashboardClients.Lock()
	conns := dashboardClients.clients[websiteId]
	for conn := range conns {
		if err := conn.WriteJSON(message); err != nil {
			conn.Close()
			delete(dashboardClients.clients[websiteId], conn)
		}
	}
	dashboardClients.Unlock()
}

func handleLiveDashboardWS(w http.ResponseWriter, r *http.Request) {
	websiteId := r.URL.Query().Get("websiteId")
	if websiteId == "" {
		http.Error(w, "Missing websiteId", http.StatusBadRequest)
		return
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Dashboard WebSocket upgrade failed:", err)
		return
	}

	dashboardClients.Lock()
	if dashboardClients.clients[websiteId] == nil {
		dashboardClients.clients[websiteId] = make(map[*websocket.Conn]struct{})
	}
	dashboardClients.clients[websiteId][conn] = struct{}{}
	dashboardClients.Unlock()

	_ = conn.WriteJSON(WSMessage{
		Type:      WSMessageTypeLiveCount,
		Data:      map[string]int{"live": GetLiveViewerCount(websiteId)},
		Timestamp: time.Now(),
	})

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}

	dashboardClients.Lock()
	delete(dashboardClients.clients[websiteId], conn)
	conn.Close()
	dashboardClients.Unlock()
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	websiteId := r.URL.Query().Get("websiteId")
	eventId := r.URL.Query().Get("eventId")

	if websiteId == "" || eventId == "" {
		http.Error(w, "Missing websiteId or eventId", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade failed:", err)
		return
	}

	var sessionID, eventURL, deviceType, country, city, screenSize string
	err = dbPool.QueryRow(context.Background(),
		`SELECT session_id, url, device_type, country, city, screen_size FROM events WHERE id = $1`,
		eventId).Scan(&sessionID, &eventURL, &deviceType, &country, &city, &screenSize)

	if err != nil {
		log.Printf("Failed to get event details for %s: %v", eventId, err)
		conn.Close()
		return
	}

	wsConn := &wsConnection{
		conn: conn, eventID: eventId, sessionID: sessionID,
		startTime: time.Now(), websiteID: websiteId, lastURL: eventURL,
		deviceType: deviceType, country: country, city: city, screenSize: screenSize,
	}

	liveConnections.Lock()
	liveConnections.conns[conn] = wsConn
	liveConnections.Unlock()

	broadcastViewerUpdate(websiteId, ViewerUpdateData{
		EventID: eventId, SessionID: sessionID, URL: eventURL,
		DeviceType: deviceType, Country: country, City: city,
		ScreenSize: screenSize, Action: "connect",
	})
	broadcastLiveViewerCount(websiteId)

	defer func() {
		conn.Close()
		liveConnections.Lock()
		delete(liveConnections.conns, conn)
		liveConnections.Unlock()

		duration := int(time.Since(wsConn.startTime).Seconds())
		_, err := dbPool.Exec(context.Background(),
			`UPDATE events SET duration = $1 WHERE id = $2`, duration, wsConn.eventID)
		if err != nil {
			log.Printf("Failed to update duration for event %s: %v", wsConn.eventID, err)
		}

		broadcastViewerUpdate(websiteId, ViewerUpdateData{
			EventID: wsConn.eventID, SessionID: wsConn.sessionID, URL: wsConn.lastURL,
			DeviceType: wsConn.deviceType, Country: wsConn.country, City: wsConn.city,
			ScreenSize: wsConn.screenSize, Action: "disconnect", Duration: duration,
		})
		broadcastLiveViewerCount(websiteId)
	}()

	for {
		_, messageBytes, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var navData PageNavigationData
		if err := json.Unmarshal(messageBytes, &navData); err != nil {
			continue
		}

		if navData.EventID != "" && navData.URL != "" {
			var prevURL string
			liveConnections.Lock()
			if connData, exists := liveConnections.conns[conn]; exists {
				prevURL = connData.lastURL
				connData.lastURL = navData.URL
				if navData.DeviceType != "" {
					connData.deviceType = navData.DeviceType
				}
			}
			liveConnections.Unlock()

			broadcastViewerUpdate(websiteId, ViewerUpdateData{
				EventID: navData.EventID, SessionID: navData.SessionID,
				URL: navData.URL, DeviceType: navData.DeviceType,
				Country: navData.Country, City: navData.City,
				ScreenSize: navData.ScreenSize, Action: "navigate",
				Duration: navData.Duration,
			})

			if prevURL != "" && prevURL != navData.URL {
				go pushPageTransitionToExpress(websiteId, navData.SessionID, prevURL, navData.URL)
			}

			broadcastLiveViewerCount(websiteId)
		}
	}
}

func GetLiveViewerCount(websiteId string) int {
	count := 0
	liveConnections.Lock()
	defer liveConnections.Unlock()
	for _, conn := range liveConnections.conns {
		if conn.websiteID == websiteId {
			count++
		}
	}
	return count
}

// GetLivePageCounts returns a map of page URL -> visitor count for a given website.
func GetLivePageCounts(websiteId string) map[string]int {
	pages := make(map[string]int)
	liveConnections.Lock()
	defer liveConnections.Unlock()
	for _, conn := range liveConnections.conns {
		if conn.websiteID == websiteId && conn.lastURL != "" {
			pages[conn.lastURL]++
		}
	}
	return pages
}

func LiveViewerCountHandler(w http.ResponseWriter, r *http.Request) {
	websiteId := r.URL.Query().Get("websiteId")
	if websiteId == "" {
		http.Error(w, "Missing websiteId", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(WSMessage{
		Type:      WSMessageTypeLiveCount,
		Data:      map[string]int{"live": GetLiveViewerCount(websiteId)},
		Timestamp: time.Now(),
	})
}
