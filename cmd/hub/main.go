package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img/pg"
	"github.com/artifacthub/hub/internal/util"
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

	// Setup hub api and image store instances
	db, err := util.SetupDB(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Database setup failed")
	}
	var es hub.EmailSender
	if s := email.NewSender(cfg); s != nil {
		es = s
	}
	hubAPI := hub.New(db, es)
	imageStore := pg.NewImageStore(db)

	// Setup and launch server
	addr := cfg.GetString("server.addr")
	srv := &http.Server{
		Addr:         addr,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
		IdleTimeout:  1 * time.Minute,
		Handler:      setupHandlers(cfg, hubAPI, imageStore).router,
	}
	go func() {
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Hub server ListenAndServe failed")
		}
	}()
	log.Info().Str("addr", addr).Int("pid", os.Getpid()).Msg("Hub server running!")

	// Shutdown server gracefully when SIGINT or SIGTERM signal is received
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)
	<-shutdown
	log.Info().Msg("Hub server shutting down..")
	ctx, cancel := context.WithTimeout(context.Background(), cfg.GetDuration("server.shutdownTimeout"))
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("Hub server shutdown failed")
	}
	log.Info().Msg("Hub server stopped")
}
