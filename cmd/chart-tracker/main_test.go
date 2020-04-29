package main

import (
	"errors"
	"os"
	"testing"

	"github.com/rs/zerolog"
)

var errFake = errors.New("fake error for tests")

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}
