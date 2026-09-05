package main

import (
	"context"
	"encoding/json"

	"github.com/danielgtaylor/huma/v2"
	"github.com/gin-gonic/gin"
	"sigs.k8s.io/yaml"
)

func nilContext() context.Context { return context.Background() }

func mustOpenAPIYAML(api huma.API) []byte {
	raw, err := json.Marshal(api.OpenAPI())
	if err != nil {
		panic(err)
	}
	out, err := yaml.JSONToYAML(raw)
	if err != nil {
		panic(err)
	}
	return out
}

func corsMiddleware(allowedOrigins []string) gin.HandlerFunc {
	allowAll := false
	allowed := map[string]bool{}
	for _, o := range allowedOrigins {
		if o == "*" {
			allowAll = true
			break
		}
		allowed[o] = true
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if allowAll {
			if origin != "" {
				c.Header("Access-Control-Allow-Origin", origin)
			} else {
				c.Header("Access-Control-Allow-Origin", "*")
			}
			c.Header("Access-Control-Allow-Credentials", "true")
		} else if allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Vary", "Origin")
		}
		c.Header("Access-Control-Allow-Headers", "*")
		c.Header("Access-Control-Allow-Methods", "*")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
