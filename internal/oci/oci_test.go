package oci

import (
	"bytes"
	"context"
	"io"
	"testing"

	"github.com/google/go-containerregistry/pkg/name"
	v1 "github.com/google/go-containerregistry/pkg/v1"
	v1empty "github.com/google/go-containerregistry/pkg/v1/empty"
	ggcrremote "github.com/google/go-containerregistry/pkg/v1/remote"
	"github.com/opencontainers/go-digest"
	ocispec "github.com/opencontainers/image-spec/specs-go/v1"
	csoci "github.com/sigstore/cosign/v3/pkg/oci"
	csremote "github.com/sigstore/cosign/v3/pkg/oci/remote"
	cstypes "github.com/sigstore/cosign/v3/pkg/types"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	oraserdef "oras.land/oras-go/v2/errdef"
)

// registryRepositoryMock is a test double for registryRepository.
type registryRepositoryMock struct {
	fetch func(ctx context.Context, target ocispec.Descriptor) (io.ReadCloser, error)

	fetchReference func(
		ctx context.Context,
		reference string,
	) (ocispec.Descriptor, io.ReadCloser, error)
}

// Fetch implements the registryRepository interface.
func (m *registryRepositoryMock) Fetch(
	ctx context.Context,
	target ocispec.Descriptor,
) (io.ReadCloser, error) {
	return m.fetch(ctx, target)
}

// FetchReference implements the registryRepository interface.
func (m *registryRepositoryMock) FetchReference(
	ctx context.Context,
	reference string,
) (ocispec.Descriptor, io.ReadCloser, error) {
	return m.fetchReference(ctx, reference)
}

// newMockRepositoryFactory returns a registryRepositoryFactory that always
// returns the provided mock.
func newMockRepositoryFactory(repo registryRepository) registryRepositoryFactory {
	return func(_ name.Reference, _ string, _ string) (registryRepository, error) {
		return repo, nil
	}
}

// signaturesMock is a test double for cosign signatures.
type signaturesMock struct {
	v1.Image
	get func() ([]csoci.Signature, error)
}

// Get implements the cosign signatures interface.
func (m *signaturesMock) Get() ([]csoci.Signature, error) {
	return m.get()
}

// signedEntityMock is a test double for a cosign signed entity.
type signedEntityMock struct {
	digest     func() (v1.Hash, error)
	signatures func() (csoci.Signatures, error)
}

// Attachment implements the cosign signed entity interface.
func (m *signedEntityMock) Attachment(_ string) (csoci.File, error) {
	return nil, nil
}

// Attestations implements the cosign signed entity interface.
func (m *signedEntityMock) Attestations() (csoci.Signatures, error) {
	return nil, nil
}

// Digest implements the cosign signed entity interface.
func (m *signedEntityMock) Digest() (v1.Hash, error) {
	if m.digest != nil {
		return m.digest()
	}
	return v1.Hash{Algorithm: "sha256", Hex: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}, nil
}

// Signatures implements the cosign signed entity interface.
func (m *signedEntityMock) Signatures() (csoci.Signatures, error) {
	return m.signatures()
}

// TestHasCosignSignature verifies signature lookup behavior.
func TestHasCosignSignature(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("returns false when the artifact is not found", func(t *testing.T) {
		t.Parallel()

		sc := &SignatureChecker{
			getSignedEntity: func(
				_ name.Reference,
				_ ...csremote.Option,
			) (csoci.SignedEntity, error) {
				return nil, csremote.NewEntityNotFoundError(assert.AnError)
			},
		}

		hasSignature, err := sc.HasCosignSignature(ctx, "registry.io/ns/repo:1.0.0", "", "")
		require.NoError(t, err)
		assert.False(t, hasSignature)
	})

	t.Run("returns signature lookup errors", func(t *testing.T) {
		t.Parallel()

		sc := &SignatureChecker{
			getSignedEntity: func(
				_ name.Reference,
				_ ...csremote.Option,
			) (csoci.SignedEntity, error) {
				return nil, assert.AnError
			},
		}

		hasSignature, err := sc.HasCosignSignature(ctx, "registry.io/ns/repo:1.0.0", "", "")
		require.Error(t, err)
		assert.ErrorIs(t, err, assert.AnError)
		assert.False(t, hasSignature)
	})

	t.Run("returns signatures retrieval errors", func(t *testing.T) {
		t.Parallel()

		sc := &SignatureChecker{
			getSignedEntity: func(
				_ name.Reference,
				_ ...csremote.Option,
			) (csoci.SignedEntity, error) {
				return &signedEntityMock{
					signatures: func() (csoci.Signatures, error) {
						return nil, assert.AnError
					},
				}, nil
			},
		}

		hasSignature, err := sc.HasCosignSignature(ctx, "registry.io/ns/repo:1.0.0", "", "")
		require.Error(t, err)
		assert.ErrorIs(t, err, assert.AnError)
		assert.False(t, hasSignature)
	})

	t.Run("returns signatures list retrieval errors", func(t *testing.T) {
		t.Parallel()

		sc := &SignatureChecker{
			getSignedEntity: func(
				_ name.Reference,
				_ ...csremote.Option,
			) (csoci.SignedEntity, error) {
				return &signedEntityMock{
					signatures: func() (csoci.Signatures, error) {
						return &signaturesMock{
							Image: v1empty.Image,
							get: func() ([]csoci.Signature, error) {
								return nil, assert.AnError
							},
						}, nil
					},
				}, nil
			},
		}

		hasSignature, err := sc.HasCosignSignature(ctx, "registry.io/ns/repo:1.0.0", "", "")
		require.Error(t, err)
		assert.ErrorIs(t, err, assert.AnError)
		assert.False(t, hasSignature)
	})

	t.Run("returns false when no signatures are available", func(t *testing.T) {
		t.Parallel()

		sc := &SignatureChecker{
			getManifest: func(
				_ name.Reference,
				_ ...ggcrremote.Option,
			) (*v1.Manifest, error) {
				// Return a manifest for an attestation (not a signature)
				return &v1.Manifest{
					Annotations: map[string]string{
						csremote.BundlePredicateType: "https://slsa.dev/provenance/v1",
					},
				}, nil
			},
			getReferrers: func(
				_ name.Digest,
				_ string,
				_ ...csremote.Option,
			) (*v1.IndexManifest, error) {
				return &v1.IndexManifest{
					Manifests: []v1.Descriptor{{
						ArtifactType: "application/vnd.dev.sigstore.bundle.v0.3+json",
						Digest: v1.Hash{
							Algorithm: "sha256",
							Hex:       "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
						},
					}},
				}, nil
			},
			getSignedEntity: func(
				_ name.Reference,
				_ ...csremote.Option,
			) (csoci.SignedEntity, error) {
				return &signedEntityMock{
					signatures: func() (csoci.Signatures, error) {
						return &signaturesMock{
							Image: v1empty.Image,
							get: func() ([]csoci.Signature, error) {
								return []csoci.Signature{}, nil
							},
						}, nil
					},
				}, nil
			},
		}

		hasSignature, err := sc.HasCosignSignature(ctx, "registry.io/ns/repo:1.0.0", "", "")
		require.NoError(t, err)
		assert.False(t, hasSignature)
	})

	t.Run("returns true when signatures are available via tags", func(t *testing.T) {
		t.Parallel()

		// getReferrers is nil; if the code mistakenly fell through to the
		// referrers path it would panic, confirming the short-circuit.
		sc := &SignatureChecker{
			getSignedEntity: func(
				_ name.Reference,
				_ ...csremote.Option,
			) (csoci.SignedEntity, error) {
				return &signedEntityMock{
					signatures: func() (csoci.Signatures, error) {
						return &signaturesMock{
							Image: v1empty.Image,
							get: func() ([]csoci.Signature, error) {
								return []csoci.Signature{nil}, nil
							},
						}, nil
					},
				}, nil
			},
		}

		hasSignature, err := sc.HasCosignSignature(ctx, "registry.io/ns/repo:1.0.0", "", "")
		require.NoError(t, err)
		assert.True(t, hasSignature)
	})

	t.Run("returns true when signatures are available via referrers", func(t *testing.T) {
		t.Parallel()

		sc := &SignatureChecker{
			getManifest: func(
				_ name.Reference,
				_ ...ggcrremote.Option,
			) (*v1.Manifest, error) {
				return &v1.Manifest{
					Annotations: map[string]string{
						csremote.BundlePredicateType: cstypes.CosignSignPredicateType,
					},
				}, nil
			},
			getReferrers: func(
				_ name.Digest,
				_ string,
				_ ...csremote.Option,
			) (*v1.IndexManifest, error) {
				return &v1.IndexManifest{
					Manifests: []v1.Descriptor{{
						ArtifactType: "application/vnd.dev.sigstore.bundle.v0.3+json",
						Digest: v1.Hash{
							Algorithm: "sha256",
							Hex:       "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
						},
					}},
				}, nil
			},
			getSignedEntity: func(
				_ name.Reference,
				_ ...csremote.Option,
			) (csoci.SignedEntity, error) {
				return &signedEntityMock{
					signatures: func() (csoci.Signatures, error) {
						return &signaturesMock{
							Image: v1empty.Image,
							get: func() ([]csoci.Signature, error) {
								return []csoci.Signature{}, nil
							},
						}, nil
					},
				}, nil
			},
		}

		hasSignature, err := sc.HasCosignSignature(ctx, "registry.io/ns/repo:1.0.0", "", "")
		require.NoError(t, err)
		assert.True(t, hasSignature)
	})

	t.Run("returns true when signatures are available via referrers using old artifact type", func(t *testing.T) {
		t.Parallel()

		sc := &SignatureChecker{
			getReferrers: func(
				_ name.Digest,
				_ string,
				_ ...csremote.Option,
			) (*v1.IndexManifest, error) {
				return &v1.IndexManifest{
					Manifests: []v1.Descriptor{{
						ArtifactType: cosignSigArtifactType,
					}},
				}, nil
			},
			getSignedEntity: func(
				_ name.Reference,
				_ ...csremote.Option,
			) (csoci.SignedEntity, error) {
				return &signedEntityMock{
					signatures: func() (csoci.Signatures, error) {
						return &signaturesMock{
							Image: v1empty.Image,
							get: func() ([]csoci.Signature, error) {
								return []csoci.Signature{}, nil
							},
						}, nil
					},
				}, nil
			},
		}

		hasSignature, err := sc.HasCosignSignature(ctx, "registry.io/ns/repo:1.0.0", "", "")
		require.NoError(t, err)
		assert.True(t, hasSignature)
	})

	t.Run("returns referrers check errors", func(t *testing.T) {
		t.Parallel()

		sc := &SignatureChecker{
			getReferrers: func(
				_ name.Digest,
				_ string,
				_ ...csremote.Option,
			) (*v1.IndexManifest, error) {
				return nil, assert.AnError
			},
			getSignedEntity: func(
				_ name.Reference,
				_ ...csremote.Option,
			) (csoci.SignedEntity, error) {
				return &signedEntityMock{
					signatures: func() (csoci.Signatures, error) {
						return &signaturesMock{
							Image: v1empty.Image,
							get: func() ([]csoci.Signature, error) {
								return []csoci.Signature{}, nil
							},
						}, nil
					},
				}, nil
			},
		}

		hasSignature, err := sc.HasCosignSignature(ctx, "registry.io/ns/repo:1.0.0", "", "")
		require.Error(t, err)
		assert.ErrorIs(t, err, assert.AnError)
		assert.False(t, hasSignature)
	})

	t.Run("returns manifest retrieval errors during referrers check", func(t *testing.T) {
		t.Parallel()

		sc := &SignatureChecker{
			getManifest: func(
				_ name.Reference,
				_ ...ggcrremote.Option,
			) (*v1.Manifest, error) {
				return nil, assert.AnError
			},
			getReferrers: func(
				_ name.Digest,
				_ string,
				_ ...csremote.Option,
			) (*v1.IndexManifest, error) {
				return &v1.IndexManifest{
					Manifests: []v1.Descriptor{{
						ArtifactType: "application/vnd.dev.sigstore.bundle.v0.3+json",
						Digest: v1.Hash{
							Algorithm: "sha256",
							Hex:       "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
						},
					}},
				}, nil
			},
			getSignedEntity: func(
				_ name.Reference,
				_ ...csremote.Option,
			) (csoci.SignedEntity, error) {
				return &signedEntityMock{
					signatures: func() (csoci.Signatures, error) {
						return &signaturesMock{
							Image: v1empty.Image,
							get: func() ([]csoci.Signature, error) {
								return []csoci.Signature{}, nil
							},
						}, nil
					},
				}, nil
			},
		}

		hasSignature, err := sc.HasCosignSignature(ctx, "registry.io/ns/repo:1.0.0", "", "")
		require.Error(t, err)
		assert.ErrorIs(t, err, assert.AnError)
		assert.False(t, hasSignature)
	})

	t.Run("returns digest retrieval errors during referrers check", func(t *testing.T) {
		t.Parallel()

		sc := &SignatureChecker{
			getSignedEntity: func(
				_ name.Reference,
				_ ...csremote.Option,
			) (csoci.SignedEntity, error) {
				return &signedEntityMock{
					digest: func() (v1.Hash, error) {
						return v1.Hash{}, assert.AnError
					},
					signatures: func() (csoci.Signatures, error) {
						return &signaturesMock{
							Image: v1empty.Image,
							get: func() ([]csoci.Signature, error) {
								return []csoci.Signature{}, nil
							},
						}, nil
					},
				}, nil
			},
		}

		hasSignature, err := sc.HasCosignSignature(ctx, "registry.io/ns/repo:1.0.0", "", "")
		require.Error(t, err)
		assert.ErrorIs(t, err, assert.AnError)
		assert.False(t, hasSignature)
	})

	t.Run("returns errors for invalid references", func(t *testing.T) {
		t.Parallel()

		sc := &SignatureChecker{}
		hasSignature, err := sc.HasCosignSignature(ctx, "%%%%", "", "")
		require.Error(t, err)
		assert.False(t, hasSignature)
	})

}

// TestPrepareRegistryCredentials verifies credential precedence and Docker Hub
// fallback behavior.
func TestPrepareRegistryCredentials(t *testing.T) {
	t.Parallel()

	cfg := viper.New()
	cfg.Set("creds.dockerPassword", "pass")
	cfg.Set("creds.dockerUsername", "user")

	dockerHubRef, err := name.ParseReference("docker.io/library/nginx:latest")
	require.NoError(t, err)

	nonDockerHubRef, err := name.ParseReference("ghcr.io/org/repo:1.0.0")
	require.NoError(t, err)

	t.Run("provided credentials have preference", func(t *testing.T) {
		t.Parallel()

		username, password := prepareRegistryCredentials(cfg, dockerHubRef, "provided-user", "provided-pass")
		assert.Equal(t, "provided-user", username)
		assert.Equal(t, "provided-pass", password)
	})

	t.Run("docker hub credentials fall back to config", func(t *testing.T) {
		t.Parallel()

		username, password := prepareRegistryCredentials(cfg, dockerHubRef, "", "")
		assert.Equal(t, "user", username)
		assert.Equal(t, "pass", password)
	})

	t.Run("non docker hub registries do not use docker hub credentials", func(t *testing.T) {
		t.Parallel()

		username, password := prepareRegistryCredentials(cfg, nonDockerHubRef, "", "")
		assert.Empty(t, username)
		assert.Empty(t, password)
	})
}

// TestPullLayer verifies layer retrieval through the ORAS repository client.
func TestPullLayer(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("returns artifact not found when the manifest is not available", func(t *testing.T) {
		t.Parallel()

		p := &Puller{
			newRepository: newMockRepositoryFactory(&registryRepositoryMock{
				fetchReference: func(
					_ context.Context,
					_ string,
				) (ocispec.Descriptor, io.ReadCloser, error) {
					return ocispec.Descriptor{}, nil, oraserdef.ErrNotFound
				},
			}),
		}

		_, _, err := p.PullLayer(ctx, "registry.io/ns/repo:1.0.0", "application/test", "", "")
		assert.ErrorIs(t, err, ErrArtifactNotFound)
	})

	t.Run("returns error for invalid references", func(t *testing.T) {
		t.Parallel()

		p := &Puller{}
		_, _, err := p.PullLayer(ctx, "%%%%", "application/test", "", "")
		require.Error(t, err)
	})

	t.Run("returns the requested layer when it is present", func(t *testing.T) {
		t.Parallel()

		layer := ocispec.Descriptor{
			Digest:    digest.Digest("sha256:d34db33f"),
			MediaType: "application/test",
			Size:      4,
		}
		manifest := []byte(`{
			"schemaVersion": 2,
			"config": {
				"digest": "sha256:c0ffee",
				"mediaType": "application/vnd.oci.empty.v1+json",
				"size": 2
			},
			"layers": [
				{
					"digest": "sha256:d34db33f",
					"mediaType": "application/test",
					"size": 4
				}
			]
		}`)

		p := &Puller{
			newRepository: newMockRepositoryFactory(&registryRepositoryMock{
				fetch: func(_ context.Context, target ocispec.Descriptor) (io.ReadCloser, error) {
					assert.Equal(t, layer.Digest, target.Digest)
					return io.NopCloser(bytes.NewReader([]byte("data"))), nil
				},
				fetchReference: func(
					_ context.Context,
					reference string,
				) (ocispec.Descriptor, io.ReadCloser, error) {
					assert.Equal(t, "1.0.0", reference)
					return ocispec.Descriptor{
						Digest:    digest.Digest("sha256:cafebabe"),
						MediaType: ocispec.MediaTypeImageManifest,
					}, io.NopCloser(bytes.NewReader(manifest)), nil
				},
			}),
		}

		desc, data, err := p.PullLayer(ctx, "registry.io/ns/repo:1.0.0", "application/test", "", "")
		require.NoError(t, err)
		assert.Equal(t, layer, desc)
		assert.Equal(t, []byte("data"), data)
	})

	t.Run("returns layer not found when no layer matches the media type", func(t *testing.T) {
		t.Parallel()

		manifest := []byte(`{
			"schemaVersion": 2,
			"config": {
				"digest": "sha256:c0ffee",
				"mediaType": "application/vnd.oci.empty.v1+json",
				"size": 2
			},
			"layers": [
				{
					"digest": "sha256:d34db33f",
					"mediaType": "application/other",
					"size": 4
				}
			]
		}`)

		p := &Puller{
			newRepository: newMockRepositoryFactory(&registryRepositoryMock{
				fetchReference: func(
					_ context.Context,
					_ string,
				) (ocispec.Descriptor, io.ReadCloser, error) {
					return ocispec.Descriptor{
						Digest:    digest.Digest("sha256:cafebabe"),
						MediaType: ocispec.MediaTypeImageManifest,
					}, io.NopCloser(bytes.NewReader(manifest)), nil
				},
			}),
		}

		_, _, err := p.PullLayer(ctx, "registry.io/ns/repo:1.0.0", "application/test", "", "")
		assert.ErrorIs(t, err, ErrLayerNotFound)
	})

	t.Run("traverses indexes to find the requested layer", func(t *testing.T) {
		t.Parallel()

		index := []byte(`{
			"schemaVersion": 2,
			"mediaType": "application/vnd.oci.image.index.v1+json",
			"manifests": [
				{
					"digest": "sha256:d34db33f",
					"mediaType": "application/vnd.oci.image.manifest.v1+json",
					"size": 4
				}
			]
		}`)
		layer := ocispec.Descriptor{
			Digest:    digest.Digest("sha256:5eed5eed"),
			MediaType: "application/test",
			Size:      4,
		}
		manifest := []byte(`{
			"schemaVersion": 2,
			"mediaType": "application/vnd.oci.image.manifest.v1+json",
			"config": {
				"digest": "sha256:c0ffee",
				"mediaType": "application/vnd.oci.empty.v1+json",
				"size": 2
			},
			"layers": [
				{
					"digest": "sha256:5eed5eed",
					"mediaType": "application/test",
					"size": 4
				}
			]
		}`)

		p := &Puller{
			newRepository: newMockRepositoryFactory(&registryRepositoryMock{
				fetch: func(_ context.Context, target ocispec.Descriptor) (io.ReadCloser, error) {
					switch target.Digest {
					case digest.Digest("sha256:d34db33f"):
						return io.NopCloser(bytes.NewReader(manifest)), nil
					case layer.Digest:
						return io.NopCloser(bytes.NewReader([]byte("data"))), nil
					default:
						return nil, assert.AnError
					}
				},
				fetchReference: func(
					_ context.Context,
					reference string,
				) (ocispec.Descriptor, io.ReadCloser, error) {
					assert.Equal(t, "1.0.0", reference)
					return ocispec.Descriptor{
						Digest:    digest.Digest("sha256:index"),
						MediaType: ocispec.MediaTypeImageIndex,
					}, io.NopCloser(bytes.NewReader(index)), nil
				},
			}),
		}

		desc, data, err := p.PullLayer(ctx, "registry.io/ns/repo:1.0.0", "application/test", "", "")
		require.NoError(t, err)
		assert.Equal(t, layer, desc)
		assert.Equal(t, []byte("data"), data)
	})

	t.Run("detects cycles in descriptor graph and returns layer not found", func(t *testing.T) {
		t.Parallel()

		// An index whose only child has the same digest as the index itself,
		// creating a cycle that the visited map should break.
		cyclicIndex := []byte(`{
			"schemaVersion": 2,
			"mediaType": "application/vnd.oci.image.index.v1+json",
			"manifests": [
				{
					"digest": "sha256:cyclic",
					"mediaType": "application/vnd.oci.image.index.v1+json",
					"size": 4
				}
			]
		}`)

		p := &Puller{
			newRepository: newMockRepositoryFactory(&registryRepositoryMock{
				fetch: func(_ context.Context, _ ocispec.Descriptor) (io.ReadCloser, error) {
					return io.NopCloser(bytes.NewReader(cyclicIndex)), nil
				},
				fetchReference: func(
					_ context.Context,
					_ string,
				) (ocispec.Descriptor, io.ReadCloser, error) {
					return ocispec.Descriptor{
						Digest:    digest.Digest("sha256:cyclic"),
						MediaType: ocispec.MediaTypeImageIndex,
					}, io.NopCloser(bytes.NewReader(cyclicIndex)), nil
				},
			}),
		}

		_, _, err := p.PullLayer(ctx, "registry.io/ns/repo:1.0.0", "application/test", "", "")
		assert.ErrorIs(t, err, ErrLayerNotFound)
	})
}
