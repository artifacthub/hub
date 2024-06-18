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

// SignatureCheckerMock is a mock implementation of the hub.OCISignatureChecker
// interface.
type SignatureCheckerMock struct {
	mock.Mock
}

// HasCosignSignature implements the OCITagsGetter interface.
func (m *SignatureCheckerMock) HasCosignSignature(
	ctx context.Context,
	ref,
	username,
	password string,
) (bool, error) {
	args := m.Called(ctx, ref, username, password)
	return args.Bool(0), args.Error(1)
}

// TagsGetterMock is a mock implementation of the hub.OCITagsGetter interface.
type TagsGetterMock struct {
	mock.Mock
}

// Tags implements the OCITagsGetter interface.
func (m *TagsGetterMock) Tags(
	ctx context.Context,
	r *hub.Repository,
	onlySemver bool,
	restorePlusSign bool,
) ([]string, error) {
	args := m.Called(ctx, r, onlySemver)
	tags, _ := args.Get(0).([]string)
	return tags, args.Error(1)
}
