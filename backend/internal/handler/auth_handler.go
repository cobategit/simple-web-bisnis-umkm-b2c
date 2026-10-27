package handler

import (
	"net/http"
	"time"

	"printing-cms/backend/internal/middleware"
	"printing-cms/backend/internal/security"

	"github.com/gin-gonic/gin"
)

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

func (a *App) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	var id, name, email, passwordHash string
	var active bool
	err := a.DB.QueryRow(c, `SELECT id::text,name,email,password_hash,is_active FROM users WHERE lower(email)=lower($1)`, req.Email).
		Scan(&id, &name, &email, &passwordHash, &active)
	if err != nil || !active || !security.CheckPassword(passwordHash, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "email atau password salah"})
		return
	}

	roles, permissions, err := a.identity(c, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "gagal memuat hak akses"})
		return
	}
	access, err := security.SignAccessToken(a.Cfg.JWTSecret, id, name, email, roles, permissions, a.Cfg.AccessTokenTTL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "gagal membuat token"})
		return
	}
	refresh, refreshHash, err := security.NewRefreshToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "gagal membuat refresh token"})
		return
	}
	_, err = a.DB.Exec(c, `INSERT INTO refresh_tokens(user_id,token_hash,expires_at) VALUES($1,$2,$3)`, id, refreshHash, time.Now().Add(a.Cfg.RefreshTokenTTL))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "gagal menyimpan sesi"})
		return
	}
	a.setRefreshCookie(c, refresh)
	c.JSON(http.StatusOK, gin.H{"access_token": access, "user": gin.H{"id": id, "name": name, "email": email, "roles": roles, "permissions": permissions}})
}

func (a *App) Refresh(c *gin.Context) {
	plain, err := c.Cookie("refresh_token")
	if err != nil || plain == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "refresh token tidak tersedia"})
		return
	}
	hash := security.HashRefreshToken(plain)

	var tokenID, userID, name, email string
	var expiresAt time.Time
	var active bool
	err = a.DB.QueryRow(c, `
		SELECT rt.id::text,u.id::text,u.name,u.email,rt.expires_at,u.is_active
		FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id
		WHERE rt.token_hash=$1 AND rt.revoked_at IS NULL`, hash).
		Scan(&tokenID, &userID, &name, &email, &expiresAt, &active)
	if err != nil || !active || time.Now().After(expiresAt) {
		a.clearRefreshCookie(c)
		c.JSON(http.StatusUnauthorized, gin.H{"message": "sesi sudah berakhir"})
		return
	}

	roles, permissions, err := a.identity(c, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "gagal memuat hak akses"})
		return
	}
	access, err := security.SignAccessToken(a.Cfg.JWTSecret, userID, name, email, roles, permissions, a.Cfg.AccessTokenTTL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "gagal membuat token"})
		return
	}
	newPlain, newHash, err := security.NewRefreshToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "gagal merotasi sesi"})
		return
	}
	tx, err := a.DB.Begin(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "gagal merotasi sesi"})
		return
	}
	defer tx.Rollback(c)
	if _, err = tx.Exec(c, `UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=$1`, tokenID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "gagal merotasi sesi"})
		return
	}
	if _, err = tx.Exec(c, `INSERT INTO refresh_tokens(user_id,token_hash,expires_at) VALUES($1,$2,$3)`, userID, newHash, time.Now().Add(a.Cfg.RefreshTokenTTL)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "gagal merotasi sesi"})
		return
	}
	if err = tx.Commit(c); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "gagal merotasi sesi"})
		return
	}
	a.setRefreshCookie(c, newPlain)
	c.JSON(http.StatusOK, gin.H{"access_token": access, "user": gin.H{"id": userID, "name": name, "email": email, "roles": roles, "permissions": permissions}})
}

func (a *App) Logout(c *gin.Context) {
	if plain, err := c.Cookie("refresh_token"); err == nil && plain != "" {
		_, _ = a.DB.Exec(c, `UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=$1 AND revoked_at IS NULL`, security.HashRefreshToken(plain))
	}
	a.clearRefreshCookie(c)
	c.JSON(http.StatusOK, gin.H{"message": "logout berhasil"})
}

func (a *App) Me(c *gin.Context) {
	v, _ := c.Get(middleware.ClaimsKey)
	claims := v.(*security.Claims)
	c.JSON(http.StatusOK, gin.H{"user": gin.H{
		"id": claims.Subject, "name": claims.Name, "email": claims.Email,
		"roles": claims.Roles, "permissions": claims.Permissions,
	}})
}

func (a *App) identity(c *gin.Context, userID string) ([]string, []string, error) {
	rows, err := a.DB.Query(c, `
		SELECT DISTINCT r.code,p.code
		FROM user_roles ur
		JOIN roles r ON r.id=ur.role_id
		JOIN role_permissions rp ON rp.role_id=r.id
		JOIN permissions p ON p.id=rp.permission_id
		WHERE ur.user_id=$1 ORDER BY r.code,p.code`, userID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	roleSet := map[string]bool{}
	permSet := map[string]bool{}
	var roles, perms []string
	for rows.Next() {
		var role, perm string
		if err := rows.Scan(&role, &perm); err != nil {
			return nil, nil, err
		}
		if !roleSet[role] {
			roleSet[role] = true
			roles = append(roles, role)
		}
		if !permSet[perm] {
			permSet[perm] = true
			perms = append(perms, perm)
		}
	}
	return roles, perms, rows.Err()
}

func (a *App) setRefreshCookie(c *gin.Context, value string) {
	maxAge := int(a.Cfg.RefreshTokenTTL.Seconds())
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("refresh_token", value, maxAge, "/", "", a.Cfg.CookieSecure, true)
}

func (a *App) clearRefreshCookie(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("refresh_token", "", -1, "/", "", a.Cfg.CookieSecure, true)
}
