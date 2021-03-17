package hub

import "context"

// StatsManager describes the methods an StatsManager implementation must
// provide.
type StatsManager interface {
	GetJSON(ctx context.Context) ([]byte, error)
}
