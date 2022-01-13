package pkg

import (
	"context"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestViewsTracker(t *testing.T) {
	package1ID := "00000000-0000-0000-0000-000000000001"
	package2ID := "00000000-0000-0000-0000-000000000002"
	version := "1.0.0"

	t.Run("invalid input for TrackView", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}

		vt := NewViewsTracker(db)
		assert.Error(t, vt.TrackView("invalid", version))
	})

	t.Run("custom flushing frequency", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}

		vt := NewViewsTracker(db, WithFlushFrequency(2*time.Second))
		assert.NotNil(t, vt)
		assert.Equal(t, 2*time.Second, vt.flushFrequency)
	})

	t.Run("nothing to flush", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		ctx, cancel := context.WithCancel(context.Background())
		var wg sync.WaitGroup

		vt := NewViewsTracker(db)
		wg.Add(1)
		go vt.Flusher(ctx, &wg)
		cancel()
		wg.Wait()
		db.AssertExpectations(t)
	})

	t.Run("ctx cancelled, flush and stop", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		day := time.Now().Format("2006-01-02")
		db.On("Exec", context.Background(), updatePackagesViewsDBQ,
			util.DBLockKeyUpdatePackagesViews,
			[]byte(fmt.Sprintf(`[["00000000-0000-0000-0000-000000000001","1.0.0","%s",1]]`, day)),
		).Return(nil)
		ctx, cancel := context.WithCancel(context.Background())
		var wg sync.WaitGroup

		vt := NewViewsTracker(db)
		wg.Add(1)
		go vt.Flusher(ctx, &wg)
		assert.Nil(t, vt.TrackView(package1ID, version))
		cancel()
		wg.Wait()
		db.AssertExpectations(t)
	})

	t.Run("db error flushing", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		day := time.Now().Format("2006-01-02")
		db.On("Exec", context.Background(), updatePackagesViewsDBQ,
			util.DBLockKeyUpdatePackagesViews,
			[]byte(fmt.Sprintf(`[["00000000-0000-0000-0000-000000000001","1.0.0","%s",1]]`, day)),
		).Return(tests.ErrFakeDB)
		ctx, cancel := context.WithCancel(context.Background())
		var wg sync.WaitGroup

		vt := NewViewsTracker(db)
		wg.Add(1)
		go vt.Flusher(ctx, &wg)
		assert.Nil(t, vt.TrackView(package1ID, version))
		cancel()
		wg.Wait()
		db.AssertExpectations(t)
	})

	t.Run("some package views flushed by timer successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		day := time.Now().Format("2006-01-02")
		db.On("Exec", context.Background(), updatePackagesViewsDBQ,
			util.DBLockKeyUpdatePackagesViews,
			[]byte(fmt.Sprintf(`[["00000000-0000-0000-0000-000000000001","1.0.0","%s",2],["00000000-0000-0000-0000-000000000002","1.0.0","%s",1]]`, day, day)),
		).Return(nil)
		ctx, cancel := context.WithCancel(context.Background())
		var wg sync.WaitGroup

		vt := NewViewsTracker(db, WithFlushFrequency(1*time.Second))
		wg.Add(1)
		go vt.Flusher(ctx, &wg)
		assert.Nil(t, vt.TrackView(package1ID, version))
		assert.Nil(t, vt.TrackView(package1ID, version))
		assert.Nil(t, vt.TrackView(package2ID, version))
		time.Sleep(1500 * time.Millisecond)
		db.AssertExpectations(t)
		cancel()
		wg.Wait()
	})
}
