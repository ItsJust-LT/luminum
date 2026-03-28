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
		mt := strings.ToLower(strings.TrimSpace(mediaType))
		if looksLikeZipMagic(body) || (strings.HasPrefix(mt, "application/") && !strings.HasPrefix(mt, "application/pgp-signature")) {
			fn := guessAttachmentFilename(mediaType)
			if cd := msg.Header.Get("Content-Disposition"); cd != "" {
				_, dparams, _ := mime.ParseMediaType(cd)
				if f := dparams["filename"]; f != "" {
					fn = f
				}
			}
			out.Attachments = append(out.Attachments, AttachmentPart{
				Filename:      fn,
				ContentType:   mt,
				ContentBase64: base64.StdEncoding.EncodeToString(body),
				Size:          len(body),
			})
		} else if strings.HasPrefix(mt, "text/html") {
			out.HTML = string(body)
		} else if strings.HasPrefix(mt, "text/plain") {
			out.Text = string(body)
		} else {
			// Unknown single-part non-text: keep as attachment so we do not render binary as body.
			out.Attachments = append(out.Attachments, AttachmentPart{
				Filename:      guessAttachmentFilename(mediaType),
				ContentType:   mt,
				ContentBase64: base64.StdEncoding.EncodeToString(body),
				Size:          len(body),
			})
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

		dispLower := strings.ToLower(disp)
		if filename != "" || strings.Contains(dispLower, "attachment") {
			out.Attachments = append(out.Attachments, AttachmentPart{
				Filename:      filename,
				ContentType:   partMedia,
				ContentBase64: base64.StdEncoding.EncodeToString(partBody),
				Size:          len(partBody),
			})
			continue
		}

		// Binary / application parts (e.g. DMARC aggregate .zip) must not be stuffed into text/html.
		if looksLikeZipMagic(partBody) || shouldTreatPartAsAttachment(partMedia, dispLower, filename) {
			fn := filename
			if fn == "" {
				fn = guessAttachmentFilename(partMedia)
			}
			out.Attachments = append(out.Attachments, AttachmentPart{
				Filename:      fn,
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

func looksLikeZipMagic(body []byte) bool {
	if len(body) < 4 {
		return false
	}
	if body[0] != 'P' || body[1] != 'K' {
		return false
	}
	b2, b3 := body[2], body[3]
	return (b2 == 0x03 && b3 == 0x04) || (b2 == 0x05 && b3 == 0x06) || (b2 == 0x07 && b3 == 0x08)
}

func shouldTreatPartAsAttachment(partMedia, dispLower, filename string) bool {
	if filename != "" || strings.Contains(dispLower, "attachment") {
		return true
	}
	pm := strings.ToLower(strings.TrimSpace(partMedia))
	if strings.HasPrefix(pm, "multipart/") {
		return false
	}
	if strings.HasPrefix(pm, "application/") {
		return true
	}
	return false
}

func guessAttachmentFilename(partMedia string) string {
	pm := strings.ToLower(strings.TrimSpace(partMedia))
	switch {
	case strings.Contains(pm, "zip"):
		return "attachment.zip"
	case strings.Contains(pm, "gzip") || strings.Contains(pm, "x-gzip"):
		return "attachment.gz"
	case strings.Contains(pm, "pdf"):
		return "attachment.pdf"
	default:
		return "attachment.bin"
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
