package tests

import (
	"context"

	"github.com/jackc/pgconn"
	"github.com/jackc/pgproto3"
	"github.com/jackc/pgx/v4"
	"github.com/stretchr/testify/mock"
)

type DBMock struct {
	mock.Mock
}

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

func (m *DBMock) Exec(ctx context.Context, query string, params ...interface{}) (pgconn.CommandTag, error) {
	args := m.Called(append([]interface{}{query}, params...)...)
	return nil, args.Error(0)
}

type RowMock struct {
	data []interface{}
	err  error
}

// Implement pgx.Row interface
func (m *RowMock) Close()                                         {}
func (m *RowMock) Err() error                                     { return nil }
func (m *RowMock) CommandTag() pgconn.CommandTag                  { return nil }
func (m *RowMock) FieldDescriptions() []pgproto3.FieldDescription { return nil }
func (m *RowMock) Next() bool                                     { return false }
func (m *RowMock) Values() ([]interface{}, error)                 { return nil, nil }
func (m *RowMock) RawValues() [][]byte                            { return nil }

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
