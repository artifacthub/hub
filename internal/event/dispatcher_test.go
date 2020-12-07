package event

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestDispatcher(t *testing.T) {
	t.Parallel()

	// Setup dispatcher
	d := NewDispatcher(&Services{}, WithNumWorkers(0))

	// Run it
	ctx, stopDispatcher := context.WithCancel(context.Background())
	var wg sync.WaitGroup
	wg.Add(1)
	go d.Run(ctx, &wg)

	// Check it stops as expected when asked to do so
	stopDispatcher()
	assert.Eventually(t, func() bool {
		wg.Wait()
		return true
	}, 2*time.Second, 100*time.Millisecond)
}
