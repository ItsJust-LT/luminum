package main

type Event struct {
	ID         string `json:"id,omitempty"`
	WebsiteID  string `json:"websiteId"`
	SessionID  string `json:"sessionId"`
	URL        string `json:"url"`
	Referrer   string `json:"referrer"`
	ScreenSize string `json:"screen"`
	IP         string
	Country    string `json:"country"`
	City       string `json:"city"`
	DeviceType string `json:"deviceType"`
	Duration   *int   `json:"duration,omitempty"`

	BrowserName    string `json:"browserName,omitempty"`
	BrowserVersion string `json:"browserVersion,omitempty"`
	OSName         string `json:"osName,omitempty"`
	OSVersion      string `json:"osVersion,omitempty"`
	UserAgent      string `json:"userAgent,omitempty"`

	PageTitle string                 `json:"pageTitle,omitempty"`
	URLParams map[string]interface{} `json:"urlParams,omitempty"`

	ReferrerDomain string `json:"referrerDomain,omitempty"`
	ReferrerPath   string `json:"referrerPath,omitempty"`
	TrafficSource  string `json:"trafficSource,omitempty"`

	UTMParams map[string]interface{} `json:"utmParams,omitempty"`
}
