package repo

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseGitURL(t *testing.T) {
	testCases := []struct {
		name        string
		url         string
		expected    *GitURL
		expectError bool
	}{
		{
			name: "github repo without path",
			url:  "https://github.com/user/repo",
			expected: &GitURL{
				RepoBaseURL:  "https://github.com/user/repo",
				WebBaseURL:   "https://github.com/user/repo",
				Host:         "github.com",
				PackagesPath: "",
			},
		},
		{
			name: "github repo with path and trailing slash",
			url:  "https://github.com/user/repo/path/to/packages/",
			expected: &GitURL{
				RepoBaseURL:  "https://github.com/user/repo",
				WebBaseURL:   "https://github.com/user/repo",
				Host:         "github.com",
				PackagesPath: "path/to/packages",
			},
		},
		{
			name: "codeberg repo",
			url:  "https://codeberg.org/k8s-gateway/k8s_gateway",
			expected: &GitURL{
				RepoBaseURL:  "https://codeberg.org/k8s-gateway/k8s_gateway",
				WebBaseURL:   "https://codeberg.org/k8s-gateway/k8s_gateway",
				Host:         "codeberg.org",
				PackagesPath: "",
			},
		},
		{
			name: "sourcehut repo with tilde user",
			url:  "https://git.sr.ht/~user/repo/packages",
			expected: &GitURL{
				RepoBaseURL:  "https://git.sr.ht/~user/repo",
				WebBaseURL:   "https://git.sr.ht/~user/repo",
				Host:         "git.sr.ht",
				PackagesPath: "packages",
			},
		},
		{
			name: "gitlab subgroup repo with .git delimiter",
			url:  "https://gitlab.com/testing-farm/integrations/tekton.git",
			expected: &GitURL{
				RepoBaseURL:  "https://gitlab.com/testing-farm/integrations/tekton.git",
				WebBaseURL:   "https://gitlab.com/testing-farm/integrations/tekton",
				Host:         "gitlab.com",
				PackagesPath: "",
			},
		},
		{
			name: "gitlab subgroup repo with .git delimiter and packages path",
			url:  "https://gitlab.com/MaxIV/kubernetes/mortalgpu.git/assets/kyverno/",
			expected: &GitURL{
				RepoBaseURL:  "https://gitlab.com/MaxIV/kubernetes/mortalgpu.git",
				WebBaseURL:   "https://gitlab.com/MaxIV/kubernetes/mortalgpu",
				Host:         "gitlab.com",
				PackagesPath: "assets/kyverno",
			},
		},
		{
			name: "standard repo with .git delimiter and trailing slash",
			url:  "https://github.com/user/repo.git/",
			expected: &GitURL{
				RepoBaseURL:  "https://github.com/user/repo.git",
				WebBaseURL:   "https://github.com/user/repo",
				Host:         "github.com",
				PackagesPath: "",
			},
		},
		{
			name: "repo name containing .git in middle",
			url:  "https://github.com/user/my.git.repo/packages",
			expected: &GitURL{
				RepoBaseURL:  "https://github.com/user/my.git.repo",
				WebBaseURL:   "https://github.com/user/my.git.repo",
				Host:         "github.com",
				PackagesPath: "packages",
			},
		},
		{
			name: "mixed-case hostname is normalized",
			url:  "https://GitHub.COM/user/repo/path",
			expected: &GitURL{
				RepoBaseURL:  "https://GitHub.COM/user/repo",
				WebBaseURL:   "https://GitHub.COM/user/repo",
				Host:         "github.com",
				PackagesPath: "path",
			},
		},
		{
			name: "self-hosted repo with explicit port",
			url:  "https://git.example.com:8443/team/sub/project.git/packages",
			expected: &GitURL{
				RepoBaseURL:  "https://git.example.com:8443/team/sub/project.git",
				WebBaseURL:   "https://git.example.com:8443/team/sub/project",
				Host:         "git.example.com",
				PackagesPath: "packages",
			},
		},
		{
			name:        "codeberg pages url with single segment",
			url:         "https://k8s-gateway.codeberg.page/k8s_gateway/",
			expectError: true,
		},
		{
			name:        "incomplete url",
			url:         "https://github.com/incomplete",
			expectError: true,
		},
		{
			name:        "http scheme not allowed",
			url:         "http://github.com/user/repo",
			expectError: true,
		},
		{
			name:        "empty name before .git",
			url:         "https://gitlab.com/group/.git",
			expectError: true,
		},
		{
			name:        "empty name before .git in subgroup",
			url:         "https://gitlab.com/group/subgroup/.git",
			expectError: true,
		},
		{
			name:        "query string not allowed",
			url:         "https://github.com/user/repo?ref=main",
			expectError: true,
		},
		{
			name:        "query string after .git not allowed",
			url:         "https://gitlab.com/group/subgroup/repo.git?ref=main",
			expectError: true,
		},
		{
			name:        "invalid char in repo name does not split without slash",
			url:         "https://git.example.org/group/repo+name.git/catalog",
			expectError: true,
		},
		{
			name:        "path traversal in packages path rejected",
			url:         "https://github.com/user/repo/../../etc",
			expectError: true,
		},
		{
			name:        "path traversal after .git rejected",
			url:         "https://gitlab.com/group/subgroup/repo.git/../secret",
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got, err := ParseGitURL(tc.url)
			if tc.expectError {
				assert.Error(t, err)
				assert.Nil(t, got)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.expected, got)
		})
	}
}
