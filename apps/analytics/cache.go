package main

import (
	"sync"
	"time"
)

type cacheEntry struct {
	value      interface{}
	expiration time.Time
}

var geoMemCache = struct {
	sync.RWMutex
	entries map[string]*cacheEntry
}{
	entries: make(map[string]*cacheEntry),
}

func init() {
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			geoMemCache.Lock()
			now := time.Now()
			for key, entry := range geoMemCache.entries {
				if now.After(entry.expiration) {
					delete(geoMemCache.entries, key)
				}
			}
			geoMemCache.Unlock()
		}
	}()
}
