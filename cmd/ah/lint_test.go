package main

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLintCmd(t *testing.T) {
	testCases := []struct {
		kind          string
		path          string
		desc          string
		expectedError error
	}{
		{
			"helm",
			"test1",
			"one package found, no errors",
			nil,
		},
		{
			"helm",
			"test2",
			"two packages found, no errors",
			nil,
		},
		{
			"helm",
			"test3",
			"one package found, one with errors (invalid annotation)",
			errLintFailed,
		},
		{
			"helm",
			"test4",
			"no packages found",
			errNoPackagesFound,
		},
		{
			"opa",
			"test5",
			"one package found",
			nil,
		},
		{
			"opa",
			"test6",
			"two packages found, no errors",
			nil,
		},
		{
			"opa",
			"test7",
			"one package found, one with errors",
			errLintFailed,
		},
		{
			"helm-plugin",
			"test8",
			"one package found, no errors",
			nil,
		},
		{
			"helm-plugin",
			"test9",
			"one package found, one with errors",
			errLintFailed,
		},
		{
			"krew",
			"test10",
			"one package found, no errors",
			nil,
		},
		{
			"krew",
			"test11",
			"one package found, one with errors",
			errLintFailed,
		},
		{
			"tekton-task",
			"test12",
			"one package found, no errors",
			nil,
		},
		{
			"tekton-task",
			"test13",
			"one package found, one with errors",
			errLintFailed,
		},
		{
			"olm",
			"test14",
			"one package found, no errors",
			nil,
		},
		{
			"olm",
			"test15",
			"two packages found, no errors",
			nil,
		},
		{
			"olm",
			"test16",
			"one package found, one with errors",
			errLintFailed,
		},
		{
			"olm",
			"test17",
			"no packages found",
			errNoPackagesFound,
		},
		{
			"kyverno",
			"test18",
			"four packages found, two with errors",
			errLintFailed,
		},
	}

	for _, tc := range testCases {
		t.Run(fmt.Sprintf("%s: %s", tc.kind, tc.desc), func(t *testing.T) {
			t.Parallel()

			// Prepare command and execute it
			var b bytes.Buffer
			cmd := newLintCmd()
			cmd.SilenceUsage = true
			cmd.SilenceErrors = true
			cmd.SetOut(&b)
			cmd.SetArgs([]string{"--kind", tc.kind, "--path", filepath.Join("testdata", "lint", tc.path, "pkgs")})
			cmdErr := cmd.Execute()

			// Read command output and check it matches what we expect
			cmdOutput, err := io.ReadAll(&b)
			require.NoError(t, err)
			goldenPath := filepath.Join("testdata", "lint", tc.path, "output.golden")
			if *update {
				// Update tests golden files
				golden, err := os.Create(goldenPath)
				require.NoError(t, err)
				_, err = golden.Write(cmdOutput)
				require.NoError(t, err)
			}
			expectedOutput, err := os.ReadFile(goldenPath)
			require.NoError(t, err)
			assert.Equal(t, expectedOutput, cmdOutput)
			assert.Equal(t, tc.expectedError, cmdErr)
		})
	}
}

func TestLintCmdIgnore(t *testing.T) {
	testCases := []struct {
		kind          string
		path          string
		ignore        []string
		golden        string
		desc          string
		expectedError error
	}{
		{
			"helm",
			"test1",
			[]string{`test@^0\.0\.1$`},
			"output-ignore.golden",
			"package without errors ignored",
			nil,
		},
		{
			"helm",
			"test3",
			[]string{`test@^0\.0\.1$`},
			"output-ignore.golden",
			"package with errors ignored",
			nil,
		},
		{
			"opa",
			"test7",
			[]string{"pkg1"},
			"output-ignore.golden",
			"package with invalid metadata ignored (all versions)",
			nil,
		},
		{
			"helm-plugin",
			"test9",
			[]string{`test-plugin@^0\.1\.0$`},
			"output-ignore.golden",
			"package with invalid metadata ignored",
			nil,
		},
		{
			"krew",
			"test11",
			[]string{"test-plugin"},
			"output-ignore.golden",
			"package with unknown version ignored (all versions)",
			nil,
		},
		{
			"krew",
			"test11",
			[]string{"test-plugin@.*"},
			"output-ignore-version.golden",
			"package with unknown version not ignored by version",
			errLintFailed,
		},
		{
			"tekton-task",
			"test13",
			[]string{`task1@^0\.1\.0$`},
			"output-ignore.golden",
			"package with invalid manifest ignored",
			nil,
		},
		{
			"tekton-task",
			"test13",
			[]string{`task1@^0\.2\.0$`},
			"output-ignore-version.golden",
			"package with invalid manifest not ignored (version mismatch)",
			errLintFailed,
		},
		{
			"olm",
			"test16",
			[]string{"test-operator"},
			"output-ignore.golden",
			"package with errors ignored",
			nil,
		},
		{
			"kyverno",
			"test18",
			[]string{`pkg1@^2\.0\.0$`},
			"output-ignore-partial.golden",
			"one of two packages with errors ignored",
			errLintFailed,
		},
		{
			"kyverno",
			"test18",
			[]string{`pkg1@^2\.0\.0$`, `pkg2@^1\.0\.0$`},
			"output-ignore.golden",
			"all packages with errors ignored",
			nil,
		},
	}

	for _, tc := range testCases {
		t.Run(fmt.Sprintf("%s: %s", tc.kind, tc.desc), func(t *testing.T) {
			t.Parallel()

			// Prepare command and execute it
			var b bytes.Buffer
			cmd := newLintCmd()
			cmd.SilenceUsage = true
			cmd.SilenceErrors = true
			cmd.SetOut(&b)
			args := []string{"--kind", tc.kind, "--path", filepath.Join("testdata", "lint", tc.path, "pkgs")}
			for _, entry := range tc.ignore {
				args = append(args, "--ignore", entry)
			}
			cmd.SetArgs(args)
			cmdErr := cmd.Execute()

			// Read command output and check it matches what we expect
			cmdOutput, err := io.ReadAll(&b)
			require.NoError(t, err)
			goldenPath := filepath.Join("testdata", "lint", tc.path, tc.golden)
			if *update {
				// Update tests golden files
				golden, err := os.Create(goldenPath)
				require.NoError(t, err)
				_, err = golden.Write(cmdOutput)
				require.NoError(t, err)
			}
			expectedOutput, err := os.ReadFile(goldenPath)
			require.NoError(t, err)
			assert.Equal(t, expectedOutput, cmdOutput)
			assert.Equal(t, tc.expectedError, cmdErr)
		})
	}

	t.Run("invalid ignore entry", func(t *testing.T) {
		t.Parallel()

		cmd := newLintCmd()
		cmd.SilenceUsage = true
		cmd.SilenceErrors = true
		cmd.SetOut(io.Discard)
		cmd.SetArgs([]string{"--path", filepath.Join("testdata", "lint", "test1", "pkgs"), "--ignore", "@1.0.0"})
		err := cmd.Execute()
		assert.EqualError(t, err, `invalid ignore entry "@1.0.0": name not provided`)
	})
}

func TestParseIgnoreEntries(t *testing.T) {
	t.Parallel()

	t.Run("valid entries", func(t *testing.T) {
		t.Parallel()
		ignore, err := parseIgnoreEntries([]string{"pkg1", `pkg2@^1\.0\.0$`, "pkg3@", " pkg4 @1.*"})
		require.NoError(t, err)
		assert.Equal(t, []*hub.RepositoryIgnoreEntry{
			{Name: "pkg1", Version: ""},
			{Name: "pkg2", Version: `^1\.0\.0$`},
			{Name: "pkg3", Version: ""},
			{Name: "pkg4", Version: "1.*"},
		}, ignore.Ignore)
	})

	t.Run("no entries", func(t *testing.T) {
		t.Parallel()
		ignore, err := parseIgnoreEntries(nil)
		require.NoError(t, err)
		assert.Empty(t, ignore.Ignore)
	})

	t.Run("name not provided", func(t *testing.T) {
		t.Parallel()
		_, err := parseIgnoreEntries([]string{" @1.0.0"})
		assert.EqualError(t, err, `invalid ignore entry " @1.0.0": name not provided`)
	})

	t.Run("invalid version regular expression", func(t *testing.T) {
		t.Parallel()
		_, err := parseIgnoreEntries([]string{"pkg1@["})
		assert.ErrorContains(t, err, `invalid ignore entry "pkg1@[": invalid version regular expression`)
	})
}

func TestLintTektonGitBasedCatalog(t *testing.T) {
	t.Parallel()

	t.Run("no tags found", func(t *testing.T) {
		t.Parallel()
		repoPath, _ := setupTektonGitRepo(t, "")

		report, err := lintTektonGitBasedCatalog(filepath.Join(repoPath, "task"), hub.TektonTask)
		assert.Nil(t, report)
		assert.Equal(t, errNoSemverTagsFound, err)
	})

	t.Run("no semver tags found", func(t *testing.T) {
		t.Parallel()
		repoPath, _ := setupTektonGitRepo(t, "release")

		report, err := lintTektonGitBasedCatalog(filepath.Join(repoPath, "task"), hub.TektonTask)
		assert.Nil(t, report)
		assert.Equal(t, errNoSemverTagsFound, err)
	})

	t.Run("working tree has uncommitted changes", func(t *testing.T) {
		t.Parallel()
		repoPath, gr := setupTektonGitRepo(t, "v0.1.0")
		headBefore, err := gr.Head()
		require.NoError(t, err)
		readmePath := filepath.Join(repoPath, "task", "task1", "README.md")
		require.NoError(t, os.WriteFile(readmePath, []byte("# Updated\n"), 0o600))

		report, err := lintTektonGitBasedCatalog(filepath.Join(repoPath, "task"), hub.TektonTask)
		assert.Nil(t, report)
		assert.Equal(t, errWorktreeNotClean, err)
		headAfter, err := gr.Head()
		require.NoError(t, err)
		assert.Equal(t, headBefore, headAfter)
		readme, err := os.ReadFile(readmePath)
		require.NoError(t, err)
		assert.Equal(t, "# Updated\n", string(readme))
	})

	t.Run("one package found, untracked files ignored, head restored", func(t *testing.T) {
		t.Parallel()
		repoPath, gr := setupTektonGitRepo(t, "v0.1.0")
		headBefore, err := gr.Head()
		require.NoError(t, err)
		untrackedPath := filepath.Join(repoPath, "untracked.txt")
		require.NoError(t, os.WriteFile(untrackedPath, []byte("untracked"), 0o600))

		report, err := lintTektonGitBasedCatalog(filepath.Join(repoPath, "task"), hub.TektonTask)
		require.NoError(t, err)
		require.Len(t, report.entries, 1)
		assert.NoError(t, report.entries[0].result.ErrorOrNil())
		assert.Equal(t, "task1", report.entries[0].pkg.Name)
		assert.Equal(t, "0.1.0", report.entries[0].pkg.Version)
		headAfter, err := gr.Head()
		require.NoError(t, err)
		assert.Equal(t, headBefore, headAfter)
		assert.FileExists(t, untrackedPath)
	})

	t.Run("version mismatch, package version ignored", func(t *testing.T) {
		t.Parallel()
		repoPath, _ := setupTektonGitRepo(t, "v0.2.0")
		opts := &lintOptions{
			kind:             "tekton-task",
			path:             filepath.Join(repoPath, "task"),
			tektonVersioning: hub.TektonGitBasedVersioning,
		}

		var b bytes.Buffer
		err := lint(opts, &output{&b})
		assert.Equal(t, errLintFailed, err)
		assert.Contains(t, b.String(), "version mismatch (0.1.0 != 0.2.0)")

		b.Reset()
		opts.ignore = []string{`task1@^0\.2\.0$`}
		err = lint(opts, &output{&b})
		require.NoError(t, err)
		assert.Contains(t, b.String(), "- task1 0.2.0")
		assert.Contains(t, b.String(), "Package lint IGNORED. 1 error(s) occurred and were discarded.")
		assert.Contains(t, b.String(), "1 package(s) found, 0 package(s) with errors, 1 package(s) ignored")
	})
}

// setupTektonGitRepo creates a git repository in a temporary directory that
// contains a Tekton catalog with a single task. When a tag name is provided,
// an annotated tag is created pointing to the commit that adds the task. An
// extra commit is always added afterwards, so that the branch head and the
// tag point to different commits.
func setupTektonGitRepo(t *testing.T, tagName string) (string, *git.Repository) {
	t.Helper()

	repoPath := t.TempDir()
	gr, err := git.PlainInit(repoPath, false)
	require.NoError(t, err)
	wt, err := gr.Worktree()
	require.NoError(t, err)
	sig := &object.Signature{Name: "test", Email: "test@example.com", When: time.Now()}

	// Add task and create tag (if requested)
	srcPath := filepath.Join("testdata", "lint", "test12", "pkgs", "task1", "0.1")
	require.NoError(t, os.CopyFS(filepath.Join(repoPath, "task", "task1"), os.DirFS(srcPath)))
	require.NoError(t, wt.AddGlob("task"))
	commit, err := wt.Commit("Add task1", &git.CommitOptions{Author: sig})
	require.NoError(t, err)
	if tagName != "" {
		_, err = gr.CreateTag(tagName, commit, &git.CreateTagOptions{Tagger: sig, Message: tagName})
		require.NoError(t, err)
	}

	// Add extra commit
	require.NoError(t, os.WriteFile(filepath.Join(repoPath, "README.md"), []byte("# Catalog\n"), 0o600))
	_, err = wt.Add("README.md")
	require.NoError(t, err)
	_, err = wt.Commit("Add README", &git.CommitOptions{Author: sig})
	require.NoError(t, err)

	return repoPath, gr
}
