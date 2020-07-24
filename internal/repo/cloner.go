package repo

import (
	"context"
	"fmt"
	"io/ioutil"
	"strings"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
)

// Cloner is a hub.RepositoryCloner implementation.
type Cloner struct{}

// CloneRepository implements the hub.RepositoryCloner interface.
func (c *Cloner) CloneRepository(ctx context.Context, r *hub.Repository) (string, string, error) {
	// Parse repository url
	var repoBaseURL, packagesPath string
	switch r.Kind {
	case hub.Falco, hub.OLM, hub.OPA:
		matches := GitRepoURLRE.FindStringSubmatch(r.URL)
		if len(matches) < 2 {
			return "", "", fmt.Errorf("invalid repository url")
		}
		if len(matches) >= 3 {
			repoBaseURL = matches[1]
		}
		if len(matches) == 4 {
			packagesPath = strings.TrimSuffix(matches[3], "/")
		}
	}

	// Clone git repository
	tmpDir, err := ioutil.TempDir("", "artifact-hub")
	if err != nil {
		return "", "", fmt.Errorf("error creating temp dir: %w", err)
	}
	_, err = git.PlainCloneContext(ctx, tmpDir, false, &git.CloneOptions{
		URL:           repoBaseURL,
		ReferenceName: plumbing.NewBranchReferenceName("master"),
		SingleBranch:  true,
		Depth:         1,
	})
	if err != nil {
		return "", "", err
	}

	return tmpDir, packagesPath, nil
}
