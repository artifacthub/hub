package helm

import (
	"context"

	"github.com/stretchr/testify/mock"
)

// OCITagsGetterMock is a mock implementation of the OCITagsGetter interface.
type OCITagsGetterMock struct {
	mock.Mock
}

// Tags implements the OCITagsGetter interface.
func (m *OCITagsGetterMock) Tags(ctx context.Context, rURL string) ([]string, error) {
	args := m.Called(ctx, rURL)
	tags, _ := args.Get(0).([]string)
	return tags, args.Error(1)
}
