package main

import (
	"bytes"
	"encoding/base64"
	"io"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
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
	Size          int
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
	bodyBytes, _ := io.ReadAll(msg.Body)
	if strings.HasPrefix(strings.ToLower(mediaType), "multipart/") {
		parseMultipartBody(bodyBytes, mediaType, params, out)
	} else {
		body := decodeContentBytes(bodyBytes, msg.Header.Get("Content-Transfer-Encoding"))
		bodyText := string(body)
		if strings.HasPrefix(strings.ToLower(mediaType), "text/html") {
			out.HTML = bodyText
		} else {
			out.Text = bodyText
		}
	}
	return out, nil
}

func parseMultipartBody(body []byte, mediaType string, params map[string]string, out *ParsedEmail) {
	boundary := params["boundary"]
	if boundary == "" {
		if out.Text == "" {
			out.Text = string(body)
		}
		return
	}
	mr := multipart.NewReader(bytes.NewReader(body), boundary)
	for {
		p, err := mr.NextPart()
		if err != nil {
			break
		}
		partBody, _ := io.ReadAll(p)
		partBody = decodeContentBytes(partBody, p.Header.Get("Content-Transfer-Encoding"))

		partType := p.Header.Get("Content-Type")
		partMedia, partParams, _ := mime.ParseMediaType(partType)
		partMedia = strings.ToLower(strings.TrimSpace(partMedia))
		if partMedia == "" {
			partMedia = "text/plain"
		}

		disp := p.Header.Get("Content-Disposition")
		_, dispParams, _ := mime.ParseMediaType(disp)
		filename := dispParams["filename"]
		if filename == "" {
			filename = partParams["name"]
		}
		if filename == "" {
			filename = p.FileName()
		}

		if strings.HasPrefix(partMedia, "multipart/") {
			parseMultipartBody(partBody, partMedia, partParams, out)
			continue
		}

		if filename != "" || strings.Contains(strings.ToLower(disp), "attachment") {
			out.Attachments = append(out.Attachments, AttachmentPart{
				Filename:      filename,
				ContentType:   partMedia,
				ContentBase64: base64.StdEncoding.EncodeToString(partBody),
				Size:          len(partBody),
			})
			continue
		}

		if strings.HasPrefix(partMedia, "text/html") {
			if out.HTML == "" {
				out.HTML = string(partBody)
			}
			continue
		}
		if strings.HasPrefix(partMedia, "text/plain") && out.Text == "" {
			out.Text = string(partBody)
		}
	}
}

func decodeContentBytes(body []byte, transferEncoding string) []byte {
	enc := strings.ToLower(strings.TrimSpace(transferEncoding))
	switch enc {
	case "", "7bit", "8bit", "binary":
		return body
	case "base64":
		decoded, err := io.ReadAll(base64.NewDecoder(base64.StdEncoding, bytes.NewReader(body)))
		if err == nil && len(decoded) > 0 {
			return decoded
		}
		return body
	case "quoted-printable":
		decoded, err := io.ReadAll(quotedprintable.NewReader(bytes.NewReader(body)))
		if err == nil && len(decoded) > 0 {
			return decoded
		}
		return body
	default:
		// Leave unknown transfer encodings untouched so we don't corrupt content.
		return body
	}
}
