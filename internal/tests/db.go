package tests

import (
	"context"
	"errors"

	"github.com/jackc/pgconn"
	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/stretchr/testify/mock"
)

// ErrFakeDB represents a fake database error.
var ErrFakeDB = errors.New("fake database failure")

// DBMock is a mock implementation of the DB interface.
type DBMock struct {
	mock.Mock
}

// Acquire implements the DB interface.
func (m *DBMock) Acquire(ctx context.Context) (*pgxpool.Conn, error) {
	args := m.Called(ctx)
	return nil, args.Error(1)
}

// Begin implements the DB interface.
func (m *DBMock) Begin(ctx context.Context) (pgx.Tx, error) {
	args := m.Called(ctx)
	tx, _ := args.Get(0).(pgx.Tx)
	return tx, args.Error(1)
}

// Exec implements the DB interface.
func (m *DBMock) Exec(ctx context.Context, query string, params ...interface{}) (pgconn.CommandTag, error) {
	args := m.Called(append([]interface{}{ctx, query}, params...)...)
	return nil, args.Error(0)
}

// QueryRow implements the DB interface.
func (m *DBMock) QueryRow(ctx context.Context, query string, params ...interface{}) pgx.Row {
	args := m.Called(append([]interface{}{ctx, query}, params...)...)
	rowMock := &RowMock{
		err: args.Error(1),
	}
	switch v := args.Get(0).(type) {
	case []interface{}:
		rowMock.data = v
	case interface{}:
		rowMock.data = []interface{}{args.Get(0)}
	}
	return rowMock
}

// TXMock is a mock implementation of the pgx.Tx interface.
type TXMock struct {
	mock.Mock
}

// Begin implements the pgx.Tx interface.
func (m *TXMock) Begin(ctx context.Context) (pgx.Tx, error) {
	// NOTE: not used
	return nil, nil
}

// BeginFunc implements the pgx.Tx interface.
func (m *TXMock) BeginFunc(ctx context.Context, f func(pgx.Tx) error) error {
	// NOTE: not used
	return nil
}

// Commit implements the pgx.Tx interface.
func (m *TXMock) Commit(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

// Conn implements the pgx.Tx interface.
func (m *TXMock) Conn() *pgx.Conn {
	// NOTE: not used
	return nil
}

// CopyFrom implements the pgx.Tx interface.
func (m *TXMock) CopyFrom(
	ctx context.Context,
	tableName pgx.Identifier,
	columnNames []string,
	rowSrc pgx.CopyFromSource,
) (int64, error) {
	// NOTE: not used
	return 0, nil
}

// Exec implements the pgx.Tx interface.
func (m *TXMock) Exec(ctx context.Context, query string, params ...interface{}) (pgconn.CommandTag, error) {
	args := m.Called(append([]interface{}{ctx, query}, params...)...)
	return nil, args.Error(0)
}

// LargeObjects implements the pgx.Tx interface.
func (m *TXMock) LargeObjects() pgx.LargeObjects {
	// NOTE: not used
	return pgx.LargeObjects{}
}

// Prepare implements the pgx.Tx interface.
func (m *TXMock) Prepare(ctx context.Context, name, sql string) (*pgconn.StatementDescription, error) {
	// NOTE: not used
	return nil, nil
}

// Query implements the pgx.Tx interface.
func (m *TXMock) Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
	// NOTE: not used
	return nil, nil
}

// QueryFunc implements the pgx.Tx interface.
func (m *TXMock) QueryFunc(
	ctx context.Context,
	sql string,
	args []interface{},
	scans []interface{},
	f func(pgx.QueryFuncRow) error,
) (pgconn.CommandTag, error) {
	// NOTE: not used
	return nil, nil
}

// QueryRow implements the pgx.Tx interface.
func (m *TXMock) QueryRow(ctx context.Context, query string, params ...interface{}) pgx.Row {
	args := m.Called(append([]interface{}{ctx, query}, params...)...)
	rowMock := &RowMock{
		err: args.Error(1),
	}
	switch v := args.Get(0).(type) {
	case []interface{}:
		rowMock.data = v
	case interface{}:
		rowMock.data = []interface{}{args.Get(0)}
	}
	return rowMock
}

// Rollback implements the pgx.Tx interface.
func (m *TXMock) Rollback(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

// SendBatch implements the pgx.Tx interface.
func (m *TXMock) SendBatch(ctx context.Context, b *pgx.Batch) pgx.BatchResults {
	// NOTE: not used
	return nil
}

// RowMock is a mock implementation of the pgx.Row interface.
type RowMock struct {
	data []interface{}
	err  error
}

// Scan implements pgx.Row interface.
func (m *RowMock) Scan(dest ...interface{}) error {
	for i, e := range m.data {
		if e != nil {
			switch v := dest[i].(type) {
			case *[]byte:
				*v = e.([]byte)
			case *string:
				*v = e.(string)
			case **string:
				*v = e.(*string)
			case *bool:
				*v = e.(bool)
			case *int:
				*v = e.(int)
			case *int64:
				*v = e.(int64)
			}
		}
	}
	return m.err
}
