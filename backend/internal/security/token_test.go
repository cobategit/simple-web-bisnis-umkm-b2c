package security_test

import (
	"testing"
	"time"

	"printing-cms/backend/internal/security"
)

func TestAccessTokenValidity(t *testing.T) {
	secret := "test-secret-key-12345"
	userID := "user-123"
	name := "Admin Test"
	email := "admin@test.local"
	roles := []string{"admin"}
	permissions := []string{"*"}

	// Valid token
	token, err := security.SignAccessToken(secret, userID, name, email, roles, permissions, 15*time.Minute)
	if err != nil {
		t.Fatalf("unexpected error signing token: %v", err)
	}

	claims, err := security.ParseAccessToken(secret, token)
	if err != nil {
		t.Fatalf("unexpected error parsing token: %v", err)
	}
	if claims.Subject != userID {
		t.Errorf("expected userID %s, got %s", userID, claims.Subject)
	}

	// Expired token (negative TTL)
	expiredToken, err := security.SignAccessToken(secret, userID, name, email, roles, permissions, -1*time.Minute)
	if err != nil {
		t.Fatalf("unexpected error signing expired token: %v", err)
	}

	_, err = security.ParseAccessToken(secret, expiredToken)
	if err == nil {
		t.Fatalf("expected error parsing expired token, got nil")
	}
}

func TestRefreshTokenHashing(t *testing.T) {
	plain, hash, err := security.NewRefreshToken()
	if err != nil {
		t.Fatalf("unexpected error creating refresh token: %v", err)
	}
	if plain == "" || hash == "" {
		t.Fatalf("expected non-empty plain and hash")
	}

	expectedHash := security.HashRefreshToken(plain)
	if hash != expectedHash {
		t.Errorf("hash mismatch: got %s, expected %s", hash, expectedHash)
	}
}
