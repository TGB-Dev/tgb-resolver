package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"github.com/uptrace/bun"

	"tgb-resolver/server/features/assets"
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
	Hub     *realtime.Hub
	Clock   *realtime.Clock
	Blobs   *assets.FileStore
}

func NewApp(cfg *config.Config, db *bun.DB, store *show.Store, svc *show.Service, hub *realtime.Hub, clock *realtime.Clock, blobs *assets.FileStore) *App {
	return &App{Config: cfg, DB: db, Store: store, Service: svc, Hub: hub, Clock: clock, Blobs: blobs}
}

const scalarHTML = `<!doctype html>
<html><head><title>TGB Resolver API</title><meta charset="utf-8"/></head>
<body><script id="api-reference" data-url="/openapi.json"></script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script></body></html>`

func main() {
	dumpPath := flag.String("dump-openapi", "", "dump openapi.yaml to path and exit")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
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
	humaConfig := huma.DefaultConfig("TGB Resolver Server", "v1")
	humaConfig.OpenAPIPath = "/openapi"
	api := humagin.New(router, humaConfig)
	show.RegisterShowRoutes(api, app.Service)
	assets.RegisterAssetRoutes(api, app.Service, app.Blobs)
	show.SetupRouter(router, app.Service)
	router.GET("/hubs/show", gin.WrapF(app.Hub.ServeHTTP))
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
	router.GET("/scalar", func(c *gin.Context) {
		c.Data(200, "text/html; charset=utf-8", []byte(scalarHTML))
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
	snapshot, err := app.Service.Snapshot(nilContext())
	if err != nil {
		log.Fatal().Err(err).Msg("load snapshot")
	}
	if err := app.Service.SetTickRate(snapshot.TickRate); err != nil {
		log.Fatal().Err(err).Msg("apply tick rate")
	}

	app.Clock.Start()
	log.Info().Int("port", cfg.Port).Msg("listening")
	if err := router.Run(fmt.Sprintf(":%d", cfg.Port)); err != nil {
		log.Fatal().Err(err).Msg("serve")
	}
}
