package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func (a *App) PublicSite(c *gin.Context) {
	var s struct{ BusinessName, Tagline, HeroTitle, HeroSubtitle, WhatsApp, Email, Address, Instagram, MapsURL, MapsEmbedURL string }
	err := a.DB.QueryRow(c, `SELECT business_name,tagline,hero_title,hero_subtitle,whatsapp,email,address,instagram,COALESCE(maps_url,''),COALESCE(maps_embed_url,'') FROM site_settings WHERE id=1`).
		Scan(&s.BusinessName, &s.Tagline, &s.HeroTitle, &s.HeroSubtitle, &s.WhatsApp, &s.Email, &s.Address, &s.Instagram, &s.MapsURL, &s.MapsEmbedURL)
	if err != nil {
		c.JSON(500, gin.H{"message": "failed to load settings"})
		return
	}
	c.JSON(200, gin.H{"data": gin.H{
		"business_name": s.BusinessName, "tagline": s.Tagline, "hero_title": s.HeroTitle, "hero_subtitle": s.HeroSubtitle,
		"whatsapp": s.WhatsApp, "email": s.Email, "address": s.Address, "instagram": s.Instagram,
		"maps_url": s.MapsURL, "maps_embed_url": s.MapsEmbedURL,
	}})
}

func (a *App) PublicProducts(c *gin.Context) {
	rows, err := a.DB.Query(c, `SELECT id::text,name,slug,category,short_description,description,price_start,image_url,
		min_order,production_time,materials::text,sizes::text,finishing::text,features::text,gallery_urls::text,order_note,is_featured
		FROM products WHERE is_published=true ORDER BY sort_order,created_at DESC`)
	if err != nil {
		c.JSON(500, gin.H{"message": "failed to load products"})
		return
	}
	defer rows.Close()
	items := []gin.H{}
	for rows.Next() {
		var id, name, slug, category, shortDesc, desc, image, productionTime, materials, sizes, finishing, features, gallery, orderNote string
		var price int64
		var minOrder int
		var featured bool
		if rows.Scan(&id, &name, &slug, &category, &shortDesc, &desc, &price, &image, &minOrder, &productionTime, &materials, &sizes, &finishing, &features, &gallery, &orderNote, &featured) == nil {
			items = append(items, gin.H{
				"id": id, "name": name, "slug": slug, "category": category, "short_description": shortDesc, "description": desc,
				"price_start": price, "image_url": image, "min_order": minOrder, "production_time": productionTime,
				"materials": decodeStringList(materials), "sizes": decodeStringList(sizes), "finishing": decodeStringList(finishing),
				"features": decodeStringList(features), "gallery_urls": decodeStringList(gallery), "order_note": orderNote, "is_featured": featured,
			})
		}
	}
	c.JSON(200, gin.H{"data": items})
}

func (a *App) PublicProduct(c *gin.Context) {
	var id, name, slug, category, shortDesc, desc, image, productionTime, materials, sizes, finishing, features, gallery, orderNote string
	var price int64
	var minOrder int
	var featured bool
	err := a.DB.QueryRow(c, `SELECT id::text,name,slug,category,short_description,description,price_start,image_url,
		min_order,production_time,materials::text,sizes::text,finishing::text,features::text,gallery_urls::text,order_note,is_featured
		FROM products WHERE slug=$1 AND is_published=true`, c.Param("slug")).
		Scan(&id, &name, &slug, &category, &shortDesc, &desc, &price, &image, &minOrder, &productionTime, &materials, &sizes, &finishing, &features, &gallery, &orderNote, &featured)
	if err != nil {
		c.JSON(404, gin.H{"message": "product not found"})
		return
	}
	c.JSON(200, gin.H{"data": gin.H{
		"id": id, "name": name, "slug": slug, "category": category, "short_description": shortDesc, "description": desc,
		"price_start": price, "image_url": image, "min_order": minOrder, "production_time": productionTime,
		"materials": decodeStringList(materials), "sizes": decodeStringList(sizes), "finishing": decodeStringList(finishing),
		"features": decodeStringList(features), "gallery_urls": decodeStringList(gallery), "order_note": orderNote, "is_featured": featured,
	}})
}

func (a *App) PublicArticles(c *gin.Context) {
	rows, err := a.DB.Query(c, `SELECT id::text,title,slug,excerpt,cover_image_url,published_at FROM articles WHERE status='published' ORDER BY published_at DESC NULLS LAST,created_at DESC`)
	if err != nil {
		c.JSON(500, gin.H{"message": "failed to load articles"})
		return
	}
	defer rows.Close()
	items := []gin.H{}
	for rows.Next() {
		var id, title, slug, excerpt, cover string
		var published any
		if rows.Scan(&id, &title, &slug, &excerpt, &cover, &published) == nil {
			items = append(items, gin.H{"id": id, "title": title, "slug": slug, "excerpt": excerpt, "cover_image_url": cover, "published_at": published})
		}
	}
	c.JSON(200, gin.H{"data": items})
}

func (a *App) PublicArticle(c *gin.Context) {
	var id, title, slug, excerpt, content, cover string
	var published any
	err := a.DB.QueryRow(c, `SELECT id::text,title,slug,excerpt,content,cover_image_url,published_at FROM articles WHERE slug=$1 AND status='published'`, c.Param("slug")).Scan(&id, &title, &slug, &excerpt, &content, &cover, &published)
	if err != nil {
		c.JSON(404, gin.H{"message": "article not found"})
		return
	}
	c.JSON(200, gin.H{"data": gin.H{"id": id, "title": title, "slug": slug, "excerpt": excerpt, "content": content, "cover_image_url": cover, "published_at": published}})
}

func (a *App) PublicReviews(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")
	
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	rows, err := a.DB.Query(c, `SELECT id::text,customer_name,rating,message,is_featured,created_at FROM reviews WHERE is_approved=true ORDER BY is_featured DESC,created_at DESC LIMIT $1 OFFSET $2`, limit+1, offset)
	if err != nil {
		c.JSON(500, gin.H{"message": "failed to load reviews"})
		return
	}
	defer rows.Close()
	items := []gin.H{}
	for rows.Next() {
		var id, name, msg string
		var rating int
		var featured bool
		var created any
		if rows.Scan(&id, &name, &rating, &msg, &featured, &created) == nil {
			items = append(items, gin.H{"id": id, "customer_name": name, "rating": rating, "message": msg, "is_featured": featured, "created_at": created})
		}
	}

	var nextPage *int
	if len(items) > limit {
		items = items[:limit]
		next := page + 1
		nextPage = &next
	}

	c.JSON(200, gin.H{"data": items, "next_page": nextPage})
}

func (a *App) SubmitReview(c *gin.Context) {
	var req struct {
		CustomerName string `json:"customer_name" binding:"required,max=120"`
		Rating       int    `json:"rating" binding:"required,min=1,max=5"`
		Message      string `json:"message" binding:"required,max=1000"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	_, err := a.DB.Exec(c, `INSERT INTO reviews(customer_name,rating,message) VALUES($1,$2,$3)`, req.CustomerName, req.Rating, req.Message)
	if err != nil {
		c.JSON(500, gin.H{"message": "failed to submit review"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Review terkirim dan menunggu persetujuan admin."})
}

func (a *App) PublicPage(c *gin.Context) {
	var key, title, content string
	if err := a.DB.QueryRow(c, `SELECT key,title,content FROM pages WHERE key=$1`, c.Param("key")).Scan(&key, &title, &content); err != nil {
		c.JSON(404, gin.H{"message": "page not found"})
		return
	}
	c.JSON(200, gin.H{"data": gin.H{"key": key, "title": title, "content": content}})
}
