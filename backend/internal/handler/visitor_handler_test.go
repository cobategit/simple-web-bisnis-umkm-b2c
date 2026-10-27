package handler

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"printing-cms/backend/internal/config"

	"github.com/gin-gonic/gin"
)

func TestRecordVisitFiltering(t *testing.T) {
	gin.SetMode(gin.TestMode)
	app := &App{
		Cfg: config.Config{
			JWTSecret: "test-secret-key",
		},
	}

	r := gin.New()
	r.POST("/api/v1/public/visit", app.RecordVisit)

	// 1. Invalid payload: missing required path
	{
		req, _ := http.NewRequest(http.MethodPost, "/api/v1/public/visit", bytes.NewBufferString(`{}`))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400 for empty payload, got %d", w.Code)
		}
	}

	// 2. CMS path: should be ignored (204 No Content without error)
	{
		req, _ := http.NewRequest(http.MethodPost, "/api/v1/public/visit", bytes.NewBufferString(`{"path":"/cms/dashboard"}`))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusNoContent {
			t.Errorf("expected 204 for /cms/ path, got %d", w.Code)
		}
	}

	// 3. Bot user-agent: should be ignored (204 No Content without error)
	{
		req, _ := http.NewRequest(http.MethodPost, "/api/v1/public/visit", bytes.NewBufferString(`{"path":"/produk/kartu-nama"}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("User-Agent", "Googlebot/2.1 (+http://www.google.com/bot.html)")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusNoContent {
			t.Errorf("expected 204 for bot User-Agent, got %d", w.Code)
		}
	}
}

