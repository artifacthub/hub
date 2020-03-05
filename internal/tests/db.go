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
	return &RowMock{
		data: args.Get(0),
		err:  args.Error(1),
	}
}

func (m *DBMock) Exec(ctx context.Context, query string, params ...interface{}) (pgconn.CommandTag, error) {
	args := m.Called(append([]interface{}{query}, params...)...)
	return nil, args.Error(0)
}

type RowMock struct {
	data interface{}
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
	if m.data != nil {
		switch v := dest[0].(type) {
		case *[]byte:
			*v = m.data.([]byte)
		case *string:
			*v = m.data.(string)
		case *bool:
			*v = m.data.(bool)
		}
	}
	return m.err
}
