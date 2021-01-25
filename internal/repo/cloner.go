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

const (
	DefaultBranch = "master"
)

// Cloner is a hub.RepositoryCloner implementation.
type Cloner struct{}

// CloneRepository implements the hub.RepositoryCloner interface.
func (c *Cloner) CloneRepository(ctx context.Context, r *hub.Repository) (string, string, error) {
	// Parse repository url
	var repoBaseURL, packagesPath string
	switch r.Kind {
	case hub.Falco, hub.HelmPlugin, hub.Krew, hub.OLM, hub.OPA, hub.TBAction:
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
	branch := r.Branch
	if branch == "" {
		branch = DefaultBranch
	}
	_, err = git.PlainCloneContext(ctx, tmpDir, false, &git.CloneOptions{
		URL:           repoBaseURL,
		ReferenceName: plumbing.NewBranchReferenceName(branch),
		SingleBranch:  true,
		Depth:         1,
	})
	if err != nil {
		return "", "", err
	}

	return tmpDir, packagesPath, nil
}
