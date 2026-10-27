package main

import (
	"context"
	"log"
	"os"
	"path/filepath"

	"printing-cms/backend/internal/config"
	"printing-cms/backend/internal/database"
	"printing-cms/backend/internal/handler"
	"printing-cms/backend/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()
	db, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	migrationDir := "./migrations"
	if _, err := os.Stat(migrationDir); err != nil {
		migrationDir = filepath.Join("backend", "migrations")
	}
	if err := database.RunMigrations(ctx, db, migrationDir); err != nil {
		log.Fatal(err)
	}
	if err := os.MkdirAll(cfg.UploadDir, 0755); err != nil {
		log.Fatal(err)
	}

	app := handler.New(db, cfg)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))
	r.Static("/uploads", cfg.UploadDir)
	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
	r.GET("/robots.txt", app.RobotsTxt)
	r.GET("/sitemap.xml", app.SitemapXML)

	api := r.Group("/api/v1")
	pub := api.Group("/public")
	pub.GET("/site", app.PublicSite)
	pub.GET("/products", app.PublicProducts)
	pub.GET("/products/:slug", app.PublicProduct)
	pub.GET("/articles", app.PublicArticles)
	pub.GET("/articles/:slug", app.PublicArticle)
	pub.GET("/reviews", app.PublicReviews)
	pub.POST("/reviews", app.SubmitReview)
	pub.GET("/pages/:key", app.PublicPage)
	pub.POST("/visit", app.RecordVisit)

	auth := api.Group("/auth")
	auth.POST("/login", app.Login)
	auth.POST("/refresh", app.Refresh)
	auth.POST("/logout", app.Logout)
	auth.GET("/me", middleware.Auth(cfg.JWTSecret), app.Me)

	admin := api.Group("/admin", middleware.Auth(cfg.JWTSecret))
	admin.GET("/dashboard", middleware.RequirePermission("dashboard.read"), app.Dashboard)
	admin.GET("/products", middleware.RequirePermission("products.read"), app.AdminProducts)
	admin.POST("/products", middleware.RequirePermission("products.write"), app.CreateProduct)
	admin.PUT("/products/:id", middleware.RequirePermission("products.write"), app.UpdateProduct)
	admin.DELETE("/products/:id", middleware.RequirePermission("products.write"), app.DeleteProduct)
	admin.GET("/articles", middleware.RequirePermission("articles.read"), app.AdminArticles)
	admin.POST("/articles", middleware.RequirePermission("articles.write"), app.CreateArticle)
	admin.PUT("/articles/:id", middleware.RequirePermission("articles.write"), app.UpdateArticle)
	admin.DELETE("/articles/:id", middleware.RequirePermission("articles.write"), app.DeleteArticle)
	admin.GET("/reviews", middleware.RequirePermission("reviews.read"), app.AdminReviews)
	admin.PATCH("/reviews/:id", middleware.RequirePermission("reviews.write"), app.UpdateReview)
	admin.DELETE("/reviews/:id", middleware.RequirePermission("reviews.write"), app.DeleteReview)
	admin.GET("/pages/:key", middleware.RequirePermission("pages.read"), app.AdminPage)
	admin.PUT("/pages/:key", middleware.RequirePermission("pages.write"), app.UpdatePage)
	admin.GET("/settings", middleware.RequirePermission("settings.read"), app.AdminSettings)
	admin.PUT("/settings", middleware.RequirePermission("settings.write"), app.UpdateSettings)
	admin.GET("/users", middleware.RequirePermission("users.read"), app.AdminUsers)
	admin.POST("/users", middleware.RequirePermission("users.write"), app.CreateUser)
	admin.PUT("/users/:id", middleware.RequirePermission("users.write"), app.UpdateUser)
	admin.POST("/uploads", middleware.RequirePermission("products.write"), app.Upload)

	log.Printf("API listening on :%s", cfg.Port)
	log.Fatal(r.Run(":" + cfg.Port))
}
