package auth

import (
	"net"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

func BearerToken(header string) string {
	if len(header) > 7 && strings.EqualFold(header[:7], "Bearer ") {
		return strings.TrimSpace(header[7:])
	}
	return ""
}

func isLoopback(remote string) bool {
	host, _, err := net.SplitHostPort(remote)
	if err != nil {
		host = remote
	}
	ip := net.ParseIP(strings.Trim(host, "[]"))
	return ip != nil && ip.IsLoopback()
}

func Middleware(svc *Service, limiter *RateLimiter, logger *zerolog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		method := c.Request.Method
		if method == http.MethodGet && path == "/" {
			c.Next()
			return
		}
		if method == http.MethodPost && path == "/auth/join" {
			if !limiter.Allow(c.ClientIP()) {
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many join attempts"})
				return
			}
			c.Next()
			return
		}
		if method == http.MethodGet && (path == "/openapi" || path == "/scalar") {
			c.Next()
			return
		}
		if path == "/hubs/show" || path == "/hubs/auth" {
			c.Next()
			return
		}
		if method == http.MethodGet && path == "/auth/join-code" && isLoopback(c.Request.RemoteAddr) {
			c.Next()
			return
		}
		if method == http.MethodGet && strings.HasPrefix(path, "/assets/") {
			token := BearerToken(c.GetHeader("Authorization"))
			if token == "" {
				token = c.Query("token")
			}
			if _, err := svc.Verify(token); err != nil {
				logger.Debug().
					Str("method", method).
					Str("path", path).
					Str("remote", c.Request.RemoteAddr).
					Str("reason", err.Error()).
					Msg("middleware rejected request")
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
				return
			}
			c.Next()
			return
		}
		if _, err := svc.Verify(BearerToken(c.GetHeader("Authorization"))); err != nil {
			logger.Debug().
				Str("method", method).
				Str("path", path).
				Str("remote", c.Request.RemoteAddr).
				Str("reason", err.Error()).
				Msg("middleware rejected request")
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		c.Next()
	}
}
