package repo

import (
	"context"
	"errors"
	"fmt"
	"io/ioutil"
	"strings"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
)

const (
	// DefaultBranch represents the branch used by default when cloning a
	// repository if no branch has been configured on it.
	DefaultBranch = "master"
)

// Cloner is a hub.RepositoryCloner implementation.
type Cloner struct{}

// CloneRepository implements the hub.RepositoryCloner interface.
func (c *Cloner) CloneRepository(ctx context.Context, r *hub.Repository) (string, string, error) {
	// Parse repository url
	var repoBaseURL, packagesPath string
	switch r.Kind {
	case hub.Falco,
		hub.HelmPlugin,
		hub.Krew,
		hub.OLM,
		hub.OPA,
		hub.TBAction,
		hub.TektonTask,
		hub.KedaScaler,
		hub.CoreDNS:
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
	default:
		return "", "", errors.New("repository kind not supported")
	}

	// Clone git repository
	tmpDir, err := ioutil.TempDir("", "artifact-hub")
	if err != nil {
		return "", "", fmt.Errorf("error creating temp dir: %w", err)
	}
	cloneOptions := &git.CloneOptions{
		URL:           repoBaseURL,
		ReferenceName: plumbing.NewBranchReferenceName(GetBranch(r)),
		SingleBranch:  true,
		Depth:         1,
	}
	if r.AuthPass != "" {
		cloneOptions.Auth = &http.BasicAuth{
			Username: "artifact-hub",
			Password: r.AuthPass,
		}
	}
	_, err = git.PlainCloneContext(ctx, tmpDir, false, cloneOptions)
	if err != nil {
		return "", "", err
	}

	return tmpDir, packagesPath, nil
}

// GetBranch returns the branch configured in the repository or the default one
// if none was provided.
func GetBranch(r *hub.Repository) string {
	branch := r.Branch
	if branch == "" {
		branch = DefaultBranch
	}
	return branch
}
