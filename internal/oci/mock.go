package oci

import (
	"context"

	"github.com/artifacthub/hub/internal/hub"
	ocispec "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/stretchr/testify/mock"
)

// PullerMock is a mock hub.OCIPuller implementation.
type PullerMock struct {
	mock.Mock
}

// PullLayer implements the hub.OCIPuller interface.
func (m *PullerMock) PullLayer(
	ctx context.Context,
	ref,
	mediaType,
	username,
	password string,
) (ocispec.Descriptor, []byte, error) {
	args := m.Called(ctx, ref, mediaType, username, password)
	desc, _ := args.Get(0).(ocispec.Descriptor)
	data, _ := args.Get(1).([]byte)
	return desc, data, args.Error(2)
}

// TagsGetterMock is a mock implementation of the hub.OCITagsGetter interface.
type TagsGetterMock struct {
	mock.Mock
}

// Tags implements the OCITagsGetter interface.
func (m *TagsGetterMock) Tags(ctx context.Context, r *hub.Repository) ([]string, error) {
	args := m.Called(ctx, r)
	tags, _ := args.Get(0).([]string)
	return tags, args.Error(1)
}
