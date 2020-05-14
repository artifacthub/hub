package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/artifacthub/hub/cmd/hub/handlers"
	"github.com/artifacthub/hub/internal/chartrepo"
	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/event"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img/pg"
	"github.com/artifacthub/hub/internal/notification"
	"github.com/artifacthub/hub/internal/org"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/subscription"
	"github.com/artifacthub/hub/internal/user"
	"github.com/artifacthub/hub/internal/util"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog/log"
)

func main() {
	// Setup configuration and logger
	cfg, err := util.SetupConfig("hub")
	if err != nil {
		log.Fatal().Err(err).Msg("Configuration setup failed")
	}
	fields := map[string]interface{}{"cmd": "hub"}
	if err := util.SetupLogger(cfg, fields); err != nil {
		log.Fatal().Err(err).Msg("Logger setup failed")
	}

	// Setup database and email services
	db, err := util.SetupDB(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Database setup failed")
	}
	var es hub.EmailSender
	if s := email.NewSender(cfg); s != nil {
		es = s
	}

	// Setup and launch http server
	hSvc := &handlers.Services{
		OrganizationManager:    org.NewManager(db, es),
		UserManager:            user.NewManager(db, es),
		PackageManager:         pkg.NewManager(db),
		SubscriptionManager:    subscription.NewManager(db),
		ChartRepositoryManager: chartrepo.NewManager(db),
		ImageStore:             pg.NewImageStore(db),
	}
	addr := cfg.GetString("server.addr")
	srv := &http.Server{
		Addr:         addr,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  1 * time.Minute,
		Handler:      handlers.Setup(cfg, hSvc).Router,
	}
	go func() {
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Hub server ListenAndServe failed")
		}
	}()
	log.Info().Str("addr", addr).Int("pid", os.Getpid()).Msg("Hub server running!")

	// Setup and launch metrics server
	go func() {
		http.Handle("/metrics", promhttp.Handler())
		err := http.ListenAndServe(cfg.GetString("server.metricsAddr"), nil)
		if err != nil {
			log.Fatal().Err(err).Msg("Metrics server ListenAndServe failed")
		}
	}()

	// Setup and launch events dispatcher
	ctx, stop := context.WithCancel(context.Background())
	var wg sync.WaitGroup
	eSvc := &event.Services{
		DB:                  db,
		EventManager:        event.NewManager(),
		NotificationManager: notification.NewManager(),
		SubscriptionManager: subscription.NewManager(db),
	}
	eventsDispatcher := event.NewDispatcher(eSvc)
	wg.Add(1)
	go eventsDispatcher.Run(ctx, &wg)

	// Setup and launch notifications dispatcher
	nSvc := &notification.Services{
		DB:                  db,
		ES:                  es,
		NotificationManager: notification.NewManager(),
		SubscriptionManager: subscription.NewManager(db),
		PackageManager:      pkg.NewManager(db),
	}
	notificationsDispatcher := notification.NewDispatcher(cfg, nSvc)
	wg.Add(1)
	go notificationsDispatcher.Run(ctx, &wg)

	// Shutdown server gracefully when SIGINT or SIGTERM signal is received
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)
	<-shutdown
	log.Info().Msg("Hub server shutting down..")
	stop()
	wg.Wait()
	ctx, cancel := context.WithTimeout(context.Background(), cfg.GetDuration("server.shutdownTimeout"))
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("Hub server shutdown failed")
	}
	log.Info().Msg("Hub server stopped")
}
