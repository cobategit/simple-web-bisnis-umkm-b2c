package handler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type RecordVisitPayload struct {
	Path     string `json:"path" binding:"required"`
	Referrer string `json:"referrer"`
}

func (a *App) RecordVisit(c *gin.Context) {
	var payload RecordVisitPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	path := strings.TrimSpace(payload.Path)
	if path == "" || !strings.HasPrefix(path, "/") {
		path = "/" + path
	}

	// Jangan record halaman CMS atau request internal API
	if strings.HasPrefix(path, "/cms") || strings.HasPrefix(path, "/api") {
		c.Status(http.StatusNoContent)
		return
	}

	if len(path) > 255 {
		path = path[:255]
	}

	referrer := strings.TrimSpace(payload.Referrer)
	if len(referrer) > 500 {
		referrer = referrer[:500]
	}

	ua := c.Request.UserAgent()
	uaLower := strings.ToLower(ua)

	// Filter out common automated bots and crawlers
	botKeywords := []string{"bot", "crawler", "spider", "slurp", "headless", "lighthouse", "facebookexternalhit"}
	for _, kw := range botKeywords {
		if strings.Contains(uaLower, kw) {
			c.Status(http.StatusNoContent)
			return
		}
	}

	// Deteksi device type
	deviceType := "desktop"
	if strings.Contains(uaLower, "ipad") || strings.Contains(uaLower, "tablet") {
		deviceType = "tablet"
	} else if strings.Contains(uaLower, "mobile") || strings.Contains(uaLower, "android") || strings.Contains(uaLower, "iphone") {
		deviceType = "mobile"
	}

	// Hash IP + date salt untuk menjaga privasi sekaligus menghitung unique visitor harian
	ip := c.ClientIP()
	today := time.Now().UTC().Format("2006-01-02")
	h := sha256.New()
	h.Write([]byte(ip + ":" + today + ":" + a.Cfg.JWTSecret))
	ipHash := hex.EncodeToString(h.Sum(nil))

	// Jalankan insert ke database di goroutine terpisah agar respons ke visitor instan
	db := a.DB
	go func(p, r, hash, agent, device string) {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_, _ = db.Exec(ctx, `
			INSERT INTO visitor_logs (path, referrer, ip_hash, user_agent, device_type) 
			VALUES ($1, $2, $3, $4, $5)
		`, p, r, hash, agent, device)
	}(path, referrer, ipHash, ua, deviceType)

	c.Status(http.StatusNoContent)
}

func (a *App) getVisitorStats(c *gin.Context) gin.H {
	var todayViews, todayUniques int
	_ = a.DB.QueryRow(c, `
		SELECT COUNT(*), COUNT(DISTINCT ip_hash) 
		FROM visitor_logs 
		WHERE created_at >= CURRENT_DATE
	`).Scan(&todayViews, &todayUniques)

	var totalViews7d, totalUniques7d int
	_ = a.DB.QueryRow(c, `
		SELECT COUNT(*), COUNT(DISTINCT ip_hash) 
		FROM visitor_logs 
		WHERE created_at >= NOW() - INTERVAL '7 days'
	`).Scan(&totalViews7d, &totalUniques7d)

	// 1. Daily trend (7 hari terakhir)
	dailyTrend := []gin.H{}
	rowsTrend, err := a.DB.Query(c, `
		SELECT 
			TO_CHAR(d.day, 'YYYY-MM-DD') AS date_val,
			TO_CHAR(d.day, 'Dy, DD Mon') AS label,
			COALESCE(COUNT(v.id), 0) AS views,
			COALESCE(COUNT(DISTINCT v.ip_hash), 0) AS uniques
		FROM (
			SELECT GENERATE_SERIES(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date AS day
		) d
		LEFT JOIN visitor_logs v ON DATE(v.created_at) = d.day
		GROUP BY d.day
		ORDER BY d.day ASC
	`)
	if err == nil {
		defer rowsTrend.Close()
		for rowsTrend.Next() {
			var dateVal, label string
			var views, uniques int
			if rowsTrend.Scan(&dateVal, &label, &views, &uniques) == nil {
				dailyTrend = append(dailyTrend, gin.H{
					"date":    dateVal,
					"label":   label,
					"views":   views,
					"uniques": uniques,
				})
			}
		}
	}

	// 2. Top pages (7 hari terakhir)
	topPages := []gin.H{}
	rowsPages, err := a.DB.Query(c, `
		SELECT path, COUNT(*) as views
		FROM visitor_logs
		WHERE created_at >= NOW() - INTERVAL '7 days'
		GROUP BY path
		ORDER BY views DESC
		LIMIT 5
	`)
	if err == nil {
		defer rowsPages.Close()
		for rowsPages.Next() {
			var p string
			var v int
			if rowsPages.Scan(&p, &v) == nil {
				topPages = append(topPages, gin.H{
					"path":  p,
					"views": v,
				})
			}
		}
	}

	// 3. Devices breakdown (7 hari terakhir)
	devices := []gin.H{}
	rowsDevices, err := a.DB.Query(c, `
		SELECT device_type, COUNT(*) as count
		FROM visitor_logs
		WHERE created_at >= NOW() - INTERVAL '7 days'
		GROUP BY device_type
		ORDER BY count DESC
	`)
	if err == nil {
		defer rowsDevices.Close()
		for rowsDevices.Next() {
			var dev string
			var count int
			if rowsDevices.Scan(&dev, &count) == nil {
				devices = append(devices, gin.H{
					"device": dev,
					"count":  count,
				})
			}
		}
	}

	// 4. Top Referrers (7 hari terakhir)
	topReferrers := []gin.H{}
	rowsRef, err := a.DB.Query(c, `
		SELECT 
			CASE 
				WHEN referrer ILIKE '%google%' THEN 'Google'
				WHEN referrer ILIKE '%instagram%' THEN 'Instagram'
				WHEN referrer ILIKE '%facebook%' THEN 'Facebook'
				WHEN referrer ILIKE '%tiktok%' THEN 'TikTok'
				WHEN referrer ILIKE '%whatsapp%' THEN 'WhatsApp'
				WHEN referrer = '' OR referrer IS NULL THEN 'Langsung (Direct)'
				ELSE 'Lainnya / Eksternal'
			END AS source,
			COUNT(*) AS count
		FROM visitor_logs
		WHERE created_at >= NOW() - INTERVAL '7 days'
		GROUP BY source
		ORDER BY count DESC
		LIMIT 5
	`)
	if err == nil {
		defer rowsRef.Close()
		for rowsRef.Next() {
			var src string
			var cnt int
			if rowsRef.Scan(&src, &cnt) == nil {
				topReferrers = append(topReferrers, gin.H{
					"source": src,
					"count":  cnt,
				})
			}
		}
	}

	return gin.H{
		"today_views":      todayViews,
		"today_uniques":    todayUniques,
		"total_views_7d":   totalViews7d,
		"total_uniques_7d": totalUniques7d,
		"daily_trend":      dailyTrend,
		"top_pages":        topPages,
		"devices":          devices,
		"top_referrers":    topReferrers,
	}
}

