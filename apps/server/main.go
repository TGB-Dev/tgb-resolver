package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"github.com/uptrace/bun"

	"tgb-resolver/server/features/assets"
	"tgb-resolver/server/features/auth"
	"tgb-resolver/server/features/realtime"
	"tgb-resolver/server/features/shared/config"
	"tgb-resolver/server/features/shared/logging"
	"tgb-resolver/server/features/show"
)

type App struct {
	Config  *config.Config
	DB      *bun.DB
	Store   *show.Store
	Service *show.Service
	Auth    *auth.Service
	AuthHub *auth.Hub
	Hub     *realtime.Hub
	Clock   *realtime.Clock
	Blobs   *assets.FileStore
}

func NewApp(cfg *config.Config, db *bun.DB, store *show.Store, svc *show.Service, hub *realtime.Hub, clock *realtime.Clock, blobs *assets.FileStore, authSvc *auth.Service) *App {
	verify := func(token string) (string, error) {
		sess, err := authSvc.Verify(token)
		if err != nil {
			return "", err
		}
		return sess.ID, nil
	}
	hub.SetVerifier(verify)
	authHub := auth.NewHub(verify)
	return &App{Config: cfg, DB: db, Store: store, Service: svc, Auth: authSvc, AuthHub: authHub, Hub: hub, Clock: clock, Blobs: blobs}
}

func main() {
	dumpPath := flag.String("dump-openapi", "", "dump openapi.yaml to path and exit")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	if mode := os.Getenv("GIN_MODE"); mode != "" {
		gin.SetMode(mode)
	}
	logging.Setup(gin.Mode() == gin.DebugMode)

	app, cleanup, err := initApp(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("init app")
	}
	defer cleanup()

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(corsMiddleware(cfg.AllowedOrigins))
	router.Use(auth.Middleware(app.Auth, auth.NewRateLimiter(10, time.Minute)))
	humaConfig := huma.DefaultConfig("TGB Resolver Server", "v1")
	humaConfig.OpenAPIPath = "/openapi"
	humaConfig.DocsPath = "/scalar"
	humaConfig.DocsRenderer = huma.DocsRendererScalar
	api := humagin.New(router, humaConfig)
	auth.RegisterAuthRoutes(api, app.Auth, app.Hub.CloseSession, app.AuthHub)
	show.RegisterShowRoutes(api, app.Service)
	assets.RegisterAssetRoutes(api, app.Service, app.Blobs)
	show.SetupRouter(router, app.Service)
	router.GET("/hubs/show", gin.WrapF(app.Hub.ServeHTTP))
	router.GET("/hubs/auth", gin.WrapF(app.AuthHub.ServeHTTP))
	router.GET("/assets/:id", func(c *gin.Context) {
		id := c.Param("id")
		data, err := app.Blobs.Read(id)
		if err != nil {
			c.Status(http.StatusNotFound)
			return
		}
		contentType := "application/octet-stream"
		if snapshot, err := app.Service.Snapshot(c.Request.Context()); err == nil {
			for _, a := range snapshot.Assets.Items {
				if a.ID == id {
					contentType = a.ContentType
				}
			}
		}
		c.Data(http.StatusOK, contentType, data)
	})

	if *dumpPath != "" {
		if err := os.WriteFile(*dumpPath, mustOpenAPIYAML(api), 0o644); err != nil {
			log.Fatal().Err(err).Msg("dump openapi")
		}
		return
	}

	if err := app.Store.EnsureSeeded(nilContext()); err != nil {
		log.Fatal().Err(err).Msg("seed store")
	}
	if _, err := app.Auth.EnsureSeeded(nilContext()); err != nil {
		log.Fatal().Err(err).Msg("seed auth")
	}
	joinCode, err := app.Auth.CurrentCode(nilContext())
	if err != nil {
		log.Fatal().Err(err).Msg("load join code")
	}
	logging.For("auth").Warn().Str("joinCode", joinCode).Msg("USE THIS TO JOIN DEVICES")
	if n, err := app.Auth.PurgeExpired(nilContext()); err != nil {
		log.Error().Err(err).Msg("purge expired sessions failed")
	} else if n > 0 {
		log.Info().Int("purged", n).Msg("purged expired sessions")
	}
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			if n, err := app.Auth.PurgeExpired(nilContext()); err != nil {
				log.Error().Err(err).Msg("hourly purge failed")
			} else if n > 0 {
				log.Info().Int("purged", n).Msg("hourly purge expired sessions")
			}
		}
	}()
	snapshot, err := app.Service.Snapshot(nilContext())
	if err != nil {
		log.Fatal().Err(err).Msg("load snapshot")
	}
	if err := app.Service.SetTickRate(snapshot.TickRate); err != nil {
		log.Fatal().Err(err).Msg("apply tick rate")
	}

	app.Clock.Start()
	log.Info().Msg("server ready")
	log.Info().Int("port", cfg.Port).Msg("listening")
	if err := router.Run(fmt.Sprintf(":%d", cfg.Port)); err != nil {
		log.Fatal().Err(err).Msg("serve")
	}
}
