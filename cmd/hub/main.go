package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/artifacthub/hub/internal/apikey"
	"github.com/artifacthub/hub/internal/authz"
	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/event"
	"github.com/artifacthub/hub/internal/handlers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img/pg"
	"github.com/artifacthub/hub/internal/notification"
	"github.com/artifacthub/hub/internal/oci"
	"github.com/artifacthub/hub/internal/org"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/stats"
	"github.com/artifacthub/hub/internal/subscription"
	"github.com/artifacthub/hub/internal/user"
	"github.com/artifacthub/hub/internal/util"
	"github.com/artifacthub/hub/internal/webhook"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog/log"
)

func main() {
	// Setup configuration and logger
	cfg, err := util.SetupConfig("hub")
	if err != nil {
		log.Fatal().Err(err).Msg("configuration setup failed")
	}
	fields := map[string]interface{}{"cmd": "hub"}
	if err := util.SetupLogger(cfg, fields); err != nil {
		log.Fatal().Err(err).Msg("logger setup failed")
	}

	// Setup services
	db, err := util.SetupDB(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("database setup failed")
	}
	var es hub.EmailSender
	if s := email.NewSender(cfg); s != nil {
		es = s
	}
	az, err := authz.NewAuthorizer(db)
	if err != nil {
		log.Fatal().Err(err).Msg("authorizer setup failed")
	}
	hc := util.SetupHTTPClient(cfg.GetBool("restrictedHTTPClient"), util.HTTPClientDefaultTimeout)
	vt := pkg.NewViewsTracker(db)

	// Setup and launch http server
	ctx, stop := context.WithCancel(context.Background())
	hSvc := &handlers.Services{
		OrganizationManager: org.NewManager(cfg, db, es, az),
		UserManager:         user.NewManager(cfg, db, es),
		RepositoryManager:   repo.NewManager(cfg, db, az, hc),
		PackageManager:      pkg.NewManager(db),
		SubscriptionManager: subscription.NewManager(db),
		WebhookManager:      webhook.NewManager(db),
		APIKeyManager:       apikey.NewManager(db),
		StatsManager:        stats.NewManager(db),
		ImageStore:          pg.NewImageStore(cfg, db, hc),
		Authorizer:          az,
		HTTPClient:          hc,
		OCIPuller:           oci.NewPuller(cfg),
		ViewsTracker:        vt,
	}
	h, err := handlers.Setup(ctx, cfg, hSvc)
	if err != nil {
		log.Fatal().Err(err).Msg("handlers setup failed")
	}
	addr := cfg.GetString("server.addr")
	srv := &http.Server{
		Addr:              addr,
		ReadTimeout:       5 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       1 * time.Minute,
		Handler:           h.Router,
	}
	go func() {
		if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			log.Fatal().Err(err).Msg("hub server ListenAndServe failed")
		}
	}()
	log.Info().Str("addr", addr).Int("pid", os.Getpid()).Msg("hub server running!")

	// Setup and launch metrics server
	go func() {
		handler := http.NewServeMux()
		handler.Handle("/metrics", promhttp.Handler())
		metricsSrv := &http.Server{
			Addr:         cfg.GetString("server.metricsAddr"),
			ReadTimeout:  5 * time.Second,
			WriteTimeout: 5 * time.Second,
			Handler:      handler,
		}
		if err := metricsSrv.ListenAndServe(); err != nil {
			log.Fatal().Err(err).Msg("metrics server ListenAndServe failed")
		}
	}()

	// Launch views tracker flusher
	var wg sync.WaitGroup
	wg.Add(1)
	go vt.Flusher(ctx, &wg)

	// Setup and launch events dispatcher
	eSvc := &event.Services{
		DB:                  db,
		EventManager:        event.NewManager(),
		SubscriptionManager: subscription.NewManager(db),
		WebhookManager:      webhook.NewManager(db),
		NotificationManager: notification.NewManager(),
	}
	eventsDispatcher := event.NewDispatcher(eSvc)
	wg.Add(1)
	go eventsDispatcher.Run(ctx, &wg)

	// Setup and launch notifications dispatcher
	nSvc := &notification.Services{
		Cfg:                 cfg,
		DB:                  db,
		ES:                  es,
		NotificationManager: notification.NewManager(),
		SubscriptionManager: subscription.NewManager(db),
		RepositoryManager:   repo.NewManager(cfg, db, az, hc),
		PackageManager:      pkg.NewManager(db),
		HTTPClient:          util.SetupHTTPClient(cfg.GetBool("restrictedHTTPClient"), handlers.WebhooksHTTPClientTimeout),
	}
	notificationsDispatcher := notification.NewDispatcher(nSvc)
	wg.Add(1)
	go notificationsDispatcher.Run(ctx, &wg)

	// Shutdown server gracefully when SIGINT or SIGTERM signal is received
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)
	<-shutdown
	log.Info().Msg("hub server shutting down..")
	stop()
	wg.Wait()
	ctx, cancel := context.WithTimeout(context.Background(), cfg.GetDuration("server.shutdownTimeout"))
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("hub server shutdown failed")
		return
	}
	log.Info().Msg("hub server stopped")
}
