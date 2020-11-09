package helm

import (
	"context"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/mock"
)

// OCITagsGetterMock is a mock implementation of the OCITagsGetter interface.
type OCITagsGetterMock struct {
	mock.Mock
}

// Tags implements the OCITagsGetter interface.
func (m *OCITagsGetterMock) Tags(ctx context.Context, r *hub.Repository) ([]string, error) {
	args := m.Called(ctx, r)
	tags, _ := args.Get(0).([]string)
	return tags, args.Error(1)
}
