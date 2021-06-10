package hub

import (
	"context"
	"net/http"

	"github.com/artifacthub/hub/internal/email"
	"github.com/jackc/pgconn"
	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

// DB defines the methods the database handler must provide.
type DB interface {
	Acquire(ctx context.Context) (*pgxpool.Conn, error)
	Begin(ctx context.Context) (pgx.Tx, error)
	Exec(ctx context.Context, sql string, arguments ...interface{}) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

// EmailSender defines the methods the email sender must provide.
type EmailSender interface {
	SendEmail(data *email.Data) error
}

// HTTPClient defines the methods an HTTPClient implementation must provide.
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// JSONQueryResult represents the result of a database query that returns json
// data alongside some metadata.
type JSONQueryResult struct {
	Data       []byte `json:"data"`
	TotalCount int    `json:"total_count"`
}

// Pagination defines some information about the results page to fetch.
type Pagination struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}
