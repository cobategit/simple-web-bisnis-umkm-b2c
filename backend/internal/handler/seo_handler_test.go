package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"printing-cms/backend/internal/config"

	"github.com/gin-gonic/gin"
)

func TestRobotsTxt(t *testing.T) {
	gin.SetMode(gin.TestMode)
	app := &App{
		Cfg: config.Config{
			FrontendOrigin: "https://printku.local",
		},
	}

	r := gin.New()
	r.GET("/robots.txt", app.RobotsTxt)

	req, _ := http.NewRequest(http.MethodGet, "/robots.txt", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "User-agent: *") {
		t.Errorf("expected robots.txt to contain 'User-agent: *', got: %s", body)
	}
	if !strings.Contains(body, "Disallow: /cms/") {
		t.Errorf("expected robots.txt to contain 'Disallow: /cms/', got: %s", body)
	}
	if !strings.Contains(body, "Sitemap:") {
		t.Errorf("expected robots.txt to contain 'Sitemap:', got: %s", body)
	}
}
