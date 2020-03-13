package tests

import (
	"context"

	"github.com/jackc/pgconn"
	"github.com/jackc/pgx/v4"
	"github.com/stretchr/testify/mock"
)

// DBMock is a mock implementation of the DB interface.
type DBMock struct {
	mock.Mock
}

// QueryRow implements the DB interface.
func (m *DBMock) QueryRow(ctx context.Context, query string, params ...interface{}) pgx.Row {
	args := m.Called(append([]interface{}{query}, params...)...)
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

// Exec implements the DB interface.
func (m *DBMock) Exec(ctx context.Context, query string, params ...interface{}) (pgconn.CommandTag, error) {
	args := m.Called(append([]interface{}{query}, params...)...)
	return nil, args.Error(0)
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
			case *bool:
				*v = e.(bool)
			case *int64:
				*v = e.(int64)
			}
		}
	}
	return m.err
}
