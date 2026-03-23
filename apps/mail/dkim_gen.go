// DKIM key generation is not a standalone program. Run from this directory:
//
//	go run . gen-dkim-key [selector]
//
// Example: go run . gen-dkim-key default
// Do not use: go run ./dkim_gen.go (that file has no func main).
package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"os"
)

func runGenDkimKey() bool {
	if len(os.Args) < 2 || os.Args[1] != "gen-dkim-key" {
		return false
	}
	selector := "default"
	if len(os.Args) >= 3 {
		selector = os.Args[2]
	}
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		fmt.Fprintf(os.Stderr, "generate key: %v\n", err)
		os.Exit(1)
	}
	privPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(key),
	})
	pubDER, err := x509.MarshalPKIXPublicKey(&key.PublicKey)
	if err != nil {
		fmt.Fprintf(os.Stderr, "marshal public key: %v\n", err)
		os.Exit(1)
	}
	pubBase64 := base64.StdEncoding.EncodeToString(pubDER)
	fmt.Println("# Add MAIL_DKIM_PRIVATE_KEY to your env (escape newlines or use a single line).")
	fmt.Println("# Add this TXT record to DNS:")
	fmt.Printf("#   Name: %s._domainkey.<your-domain> (e.g. %s._domainkey.luminum.agency)\n", selector, selector)
	fmt.Printf("#   Value: v=DKIM1; k=rsa; p=%s\n", pubBase64)
	fmt.Println()
	fmt.Println("--- MAIL_DKIM_PRIVATE_KEY (PEM, keep secret) ---")
	fmt.Print(string(privPEM))
	fmt.Println("--- end ---")
	os.Exit(0)
	return true
}
