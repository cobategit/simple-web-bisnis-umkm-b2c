package handler

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type XMLURL struct {
	XMLName    xml.Name `xml:"url"`
	Loc        string   `xml:"loc"`
	LastMod    string   `xml:"lastmod,omitempty"`
	ChangeFreq string   `xml:"changefreq,omitempty"`
	Priority   string   `xml:"priority,omitempty"`
}

type XMLURLSet struct {
	XMLName xml.Name `xml:"urlset"`
	XMLNS   string   `xml:"xmlns,attr"`
	URLs    []XMLURL `xml:"url"`
}

func (a *App) getBaseURL(c *gin.Context) string {
	proto := c.GetHeader("X-Forwarded-Proto")
	if proto == "" {
		if c.Request.TLS != nil {
			proto = "https"
		} else {
			proto = "http"
		}
	}

	host := c.GetHeader("X-Forwarded-Host")
	if host == "" {
		host = c.Request.Host
	}

	if host != "" && !strings.Contains(host, "backend") {
		return fmt.Sprintf("%s://%s", proto, host)
	}

	if a.Cfg.FrontendOrigin != "" {
		return strings.TrimRight(a.Cfg.FrontendOrigin, "/")
	}

	return "http://localhost:3000"
}

func (a *App) RobotsTxt(c *gin.Context) {
	baseURL := a.getBaseURL(c)
	body := fmt.Sprintf(`User-agent: *
Allow: /
Allow: /produk/
Allow: /artikel/
Allow: /review
Allow: /about
Disallow: /cms/
Disallow: /api/

Sitemap: %s/sitemap.xml
`, baseURL)

	c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(body))
}

func (a *App) SitemapXML(c *gin.Context) {
	baseURL := a.getBaseURL(c)
	now := time.Now().Format("2006-01-02")

	urls := []XMLURL{
		{Loc: baseURL + "/", LastMod: now, ChangeFreq: "daily", Priority: "1.0"},
		{Loc: baseURL + "/produk", LastMod: now, ChangeFreq: "daily", Priority: "0.9"},
		{Loc: baseURL + "/artikel", LastMod: now, ChangeFreq: "daily", Priority: "0.8"},
		{Loc: baseURL + "/review", LastMod: now, ChangeFreq: "weekly", Priority: "0.7"},
		{Loc: baseURL + "/about", LastMod: now, ChangeFreq: "monthly", Priority: "0.7"},
	}

	// Ambil produk yang berstatus published
	pRows, err := a.DB.Query(c, `SELECT slug, updated_at FROM products WHERE is_published=true ORDER BY updated_at DESC`)
	if err == nil {
		defer pRows.Close()
		for pRows.Next() {
			var slug string
			var updatedAt time.Time
			if scanErr := pRows.Scan(&slug, &updatedAt); scanErr == nil {
				urls = append(urls, XMLURL{
					Loc:        fmt.Sprintf("%s/produk/%s", baseURL, slug),
					LastMod:    updatedAt.Format("2006-01-02"),
					ChangeFreq: "weekly",
					Priority:   "0.8",
				})
			}
		}
	}

	// Ambil artikel yang berstatus published
	aRows, err := a.DB.Query(c, `SELECT slug, updated_at FROM articles WHERE status='published' ORDER BY updated_at DESC`)
	if err == nil {
		defer aRows.Close()
		for aRows.Next() {
			var slug string
			var updatedAt time.Time
			if scanErr := aRows.Scan(&slug, &updatedAt); scanErr == nil {
				urls = append(urls, XMLURL{
					Loc:        fmt.Sprintf("%s/artikel/%s", baseURL, slug),
					LastMod:    updatedAt.Format("2006-01-02"),
					ChangeFreq: "weekly",
					Priority:   "0.7",
				})
			}
		}
	}

	urlset := XMLURLSet{
		XMLNS: "http://www.sitemaps.org/schemas/sitemap/0.9",
		URLs:  urls,
	}

	xmlData, err := xml.MarshalIndent(urlset, "", "  ")
	if err != nil {
		c.String(http.StatusInternalServerError, "failed to generate sitemap")
		return
	}

	res := append([]byte(xml.Header), xmlData...)
	c.Data(http.StatusOK, "application/xml; charset=utf-8", res)
}
