package tests

import (
	"context"

	"github.com/jackc/pgconn"
	"github.com/jackc/pgproto3"
	"github.com/jackc/pgx/v4"
)

const Default = ""

type DBMock struct {
	data map[string][]byte
	err  map[string]error
}

func (m *DBMock) Data(query string) []byte {
	return m.data[query]
}

func (m *DBMock) Error(query string) error {
	return m.err[query]
}

func (m *DBMock) SetData(query string, data []byte) {
	if m.data == nil {
		m.data = make(map[string][]byte)
	}
	m.data[query] = data
}

func (m *DBMock) SetError(query string, err error) {
	if m.err == nil {
		m.err = make(map[string]error)
	}
	m.err[query] = err
}

func (m *DBMock) QueryRow(ctx context.Context, query string, args ...interface{}) pgx.Row {
	data := m.data[query]
	if data == nil {
		data = m.data[""]
	}
	err := m.err[query]
	if err == nil {
		err = m.err[""]
	}
	return &RowMock{
		data: data,
		err:  err,
	}
}

func (m *DBMock) Exec(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
	err := m.err[query]
	if err == nil {
		err = m.err[""]
	}
	return nil, err
}

type RowMock struct {
	data []byte
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
	switch v := dest[0].(type) {
	case *[]byte:
		*v = m.data
	case *string:
		*v = string(m.data)
	}
	return m.err
}
