package main

import (
	"encoding/base64"
	"mime"
	"mime/multipart"
	"net/mail"
	"strings"
	"time"
)

type ParsedEmail struct {
	From        string
	To          string
	Subject     string
	Text        string
	HTML        string
	Headers     map[string]interface{}
	MessageID   string
	Date        time.Time
	Attachments []AttachmentPart
}

type AttachmentPart struct {
	Filename      string
	ContentType   string
	ContentBase64 string
	Size         int
}

func ParseRawMessage(raw []byte) (*ParsedEmail, error) {
	msg, err := mail.ReadMessage(strings.NewReader(string(raw)))
	if err != nil {
		return nil, err
	}
	out := &ParsedEmail{Headers: make(map[string]interface{})}
	out.From = msg.Header.Get("From")
	out.To = msg.Header.Get("To")
	out.Subject = msg.Header.Get("Subject")
	out.MessageID = strings.TrimSpace(msg.Header.Get("Message-ID"))
	if d := msg.Header.Get("Date"); d != "" {
		if t, err := mail.ParseDate(d); err == nil {
			out.Date = t
		}
	}
	if out.Date.IsZero() {
		out.Date = time.Now().UTC()
	}
	for _, k := range []string{"From", "To", "Subject", "Message-ID", "Date", "Reply-To", "References", "In-Reply-To"} {
		if v := msg.Header.Get(k); v != "" {
			out.Headers[k] = v
		}
	}
	contentType := msg.Header.Get("Content-Type")
	mediaType, params, _ := mime.ParseMediaType(contentType)
	if mediaType == "" {
		mediaType = "text/plain"
	}
	if strings.HasPrefix(mediaType, "multipart/") {
		boundary := params["boundary"]
		if boundary == "" {
			out.Text = readBody(msg.Body)
			return out, nil
		}
		mr := multipart.NewReader(msg.Body, boundary)
		for {
			p, err := mr.NextPart()
			if err != nil {
				break
			}
			partType := p.Header.Get("Content-Type")
			partMedia, _, _ := mime.ParseMediaType(partType)
			disp := p.Header.Get("Content-Disposition")
			_, dispParams, _ := mime.ParseMediaType(disp)
			filename := dispParams["filename"]
			if filename == "" {
				filename = p.FileName()
			}
			partBody := readBody(p)
			if filename != "" {
				out.Attachments = append(out.Attachments, AttachmentPart{
					Filename:      filename,
					ContentType:   partMedia,
					ContentBase64: base64.StdEncoding.EncodeToString([]byte(partBody)),
					Size:          len(partBody),
				})
			} else {
				partMedia = strings.ToLower(strings.TrimSpace(partMedia))
				if strings.HasPrefix(partMedia, "text/html") {
					out.HTML = partBody
				} else {
					out.Text = partBody
				}
			}
		}
	} else {
		body := readBody(msg.Body)
		if strings.HasPrefix(strings.ToLower(mediaType), "text/html") {
			out.HTML = body
		} else {
			out.Text = body
		}
	}
	return out, nil
}

func readBody(r interface{ Read([]byte) (int, error) }) string {
	var b strings.Builder
	buf := make([]byte, 4096)
	for {
		n, err := r.Read(buf)
		if n > 0 {
			b.Write(buf[:n])
		}
		if err != nil {
			break
		}
	}
	return b.String()
}
