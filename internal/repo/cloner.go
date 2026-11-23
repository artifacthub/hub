package repo

import (
	"context"
	"fmt"
	"net/url"
	"os"
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

// GitURL represents the parsed components of an HTTPS git repository URL.
type GitURL struct {
	RepoBaseURL  string
	WebBaseURL   string
	Host         string
	PackagesPath string
}

// ParseGitURL parses an HTTPS git repository URL into its base clone URL,
// web base URL (without trailing .git), host, and optional packages path.
func ParseGitURL(rawURL string) (*GitURL, error) {
	matches := gitRepoWithDotGitURLRE.FindStringSubmatch(rawURL)
	if len(matches) < 3 {
		matches = GitRepoURLRE.FindStringSubmatch(rawURL)
	}
	if len(matches) < 3 {
		return nil, fmt.Errorf("invalid repository url")
	}

	// Reject dot or .git segments anywhere in the path to prevent traversal
	// and malformed repository names.
	urlPath := strings.TrimPrefix(rawURL, "https://")
	if idx := strings.Index(urlPath, "/"); idx >= 0 {
		for _, seg := range strings.Split(urlPath[idx+1:], "/") {
			if seg == "." || seg == ".." || seg == ".git" {
				return nil, fmt.Errorf("invalid repository url")
			}
		}
	}

	var packagesPath string
	if len(matches) == 4 {
		packagesPath = strings.Trim(matches[3], "/")
	}

	return &GitURL{
		RepoBaseURL:  matches[1],
		WebBaseURL:   strings.TrimSuffix(matches[1], ".git"),
		Host:         strings.ToLower(matches[2]),
		PackagesPath: packagesPath,
	}, nil
}

// Cloner is a hub.RepositoryCloner implementation.
type Cloner struct{}

// CloneRepository implements the hub.RepositoryCloner interface.
func (c *Cloner) CloneRepository(ctx context.Context, r *hub.Repository) (string, string, error) {
	// Parse repository url
	gitURL, err := ParseGitURL(r.URL)
	if err != nil {
		return "", "", err
	}

	// Clone git repository
	tmpDir, err := os.MkdirTemp("", "artifact-hub")
	if err != nil {
		return "", "", fmt.Errorf("error creating temp dir: %w", err)
	}
	cloneOptions := &git.CloneOptions{
		URL:           gitURL.RepoBaseURL,
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

	return tmpDir, gitURL.PackagesPath, nil
}

// EscapeURLPath percent-encodes each path segment while preserving slash
// separators.
func EscapeURLPath(p string) string {
	segments := strings.Split(p, "/")
	for i, seg := range segments {
		segments[i] = url.PathEscape(seg)
	}
	return strings.Join(segments, "/")
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
