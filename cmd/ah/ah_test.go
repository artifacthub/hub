package main

import (
	"flag"
	"os"
	"testing"
)

var (
	update = flag.Bool("update", false, "Update tests golden files")
)

func TestMain(m *testing.M) {
	flag.Parse()
	os.Exit(m.Run())
}
