package oci

import (
	"context"

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
