package labeler

import (
	"bufio"
	"bytes"
	"cmp"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"slices"
	"strings"

	"github.com/artifacthub/hub/internal/category/dataset"
	"github.com/artifacthub/hub/internal/category/model"
)

// maxInputLineSize represents the maximum size of an input line.
const maxInputLineSize = 4 << 20

// Package represents a package to label, as exported by the
// get_packages_for_category_labelling database function.
type Package struct {
	PackageID      string   `json:"package_id"`
	RepositoryKind int      `json:"repository_kind"`
	RepositoryName string   `json:"repository_name"`
	Name           string   `json:"name"`
	Description    string   `json:"description"`
	Keywords       []string `json:"keywords"`
	Readme         string   `json:"readme"`
}

// inputRow represents an input line. Required fields are pointers so that
// missing fields can be detected.
type inputRow struct {
	PackageID      string   `json:"package_id"`
	RepositoryKind *int     `json:"repository_kind"`
	RepositoryName *string  `json:"repository_name"`
	Name           *string  `json:"name"`
	Description    string   `json:"description"`
	Keywords       []string `json:"keywords"`
	Readme         string   `json:"readme"`
}

// ReadPackages reads the packages to label from the reader provided, in JSONL
// format (one package per line). Lines are decoded strictly: unknown fields
// and duplicate keys are not allowed, and the repository kind, repository
// name and name are required. Packages must be unique. The first invalid line
// causes an error that includes its number.
func ReadPackages(r io.Reader) ([]*Package, error) {
	var pkgs []*Package
	ids := make(map[string]int)
	names := make(map[string]int)
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 0, 64*1024), maxInputLineSize)
	line := 0
	for scanner.Scan() {
		line++
		p, err := parsePackage(scanner.Bytes())
		if err != nil {
			return nil, fmt.Errorf("line %d: %w", line, err)
		}
		if p.PackageID != "" {
			if prev, ok := ids[p.PackageID]; ok {
				return nil, fmt.Errorf("line %d: duplicate package id %s (first seen on line %d)", line, p.PackageID, prev)
			}
			ids[p.PackageID] = line
		}
		key := fmt.Sprintf("%d/%s/%s", p.RepositoryKind, p.RepositoryName, p.Name)
		if prev, ok := names[key]; ok {
			return nil, fmt.Errorf("line %d: duplicate package %s/%s (first seen on line %d)", line, p.RepositoryName, p.Name, prev)
		}
		names[key] = line
		pkgs = append(pkgs, p)
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("line %d: error reading input: %w", line+1, err)
	}
	return pkgs, nil
}

// parsePackage parses and validates an input line.
func parsePackage(data []byte) (*Package, error) {
	if len(bytes.TrimSpace(data)) == 0 {
		return nil, errors.New("empty line")
	}
	if err := dataset.CheckDuplicateKeys(data); err != nil {
		return nil, err
	}
	var row inputRow
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&row); err != nil {
		return nil, fmt.Errorf("invalid package: %w", err)
	}
	if _, err := dec.Token(); !errors.Is(err, io.EOF) {
		return nil, errors.New("invalid package: unexpected data after package")
	}
	switch {
	case row.RepositoryKind == nil:
		return nil, errors.New("repository_kind not provided")
	case *row.RepositoryKind < 0:
		return nil, errors.New("invalid repository_kind")
	case row.RepositoryName == nil || strings.TrimSpace(*row.RepositoryName) == "":
		return nil, errors.New("repository_name not provided")
	case row.Name == nil || strings.TrimSpace(*row.Name) == "":
		return nil, errors.New("name not provided")
	}
	return &Package{
		PackageID:      row.PackageID,
		RepositoryKind: *row.RepositoryKind,
		RepositoryName: *row.RepositoryName,
		Name:           *row.Name,
		Description:    row.Description,
		Keywords:       row.Keywords,
		Readme:         row.Readme,
	}, nil
}

// Group represents a group of packages that share the same content key (the
// model inputs: name, keywords and description). Only one package per group,
// the representative, is labelled.
type Group struct {
	// ContentKey represents the content key of the packages in the group.
	ContentKey string

	// Packages represents the packages in the group. The first one is the
	// representative.
	Packages []*Package
}

// Representative returns the package of the group that is labelled.
func (g *Group) Representative() *Package {
	return g.Packages[0]
}

// GroupPackages groups the packages provided by content key. Groups are
// returned sorted by content key. The representative of each group is the
// first of its packages that has a readme (as it gives the agent more
// context), sorted by repository name, name and repository kind.
func GroupPackages(pkgs []*Package) []*Group {
	groupsByKey := make(map[string]*Group)
	for _, p := range pkgs {
		key := model.ContentKey(p.Name, p.Keywords, p.Description)
		g, ok := groupsByKey[key]
		if !ok {
			g = &Group{ContentKey: key}
			groupsByKey[key] = g
		}
		g.Packages = append(g.Packages, p)
	}
	groups := make([]*Group, 0, len(groupsByKey))
	for _, g := range groupsByKey {
		slices.SortFunc(g.Packages, comparePackages)
		groups = append(groups, g)
	}
	slices.SortFunc(groups, func(a, b *Group) int { return strings.Compare(a.ContentKey, b.ContentKey) })
	return groups
}

// comparePackages compares two packages to choose a group's representative.
func comparePackages(a, b *Package) int {
	aHasReadme, bHasReadme := strings.TrimSpace(a.Readme) != "", strings.TrimSpace(b.Readme) != ""
	if aHasReadme != bHasReadme {
		if aHasReadme {
			return -1
		}
		return 1
	}
	return cmp.Or(
		strings.Compare(a.RepositoryName, b.RepositoryName),
		strings.Compare(a.Name, b.Name),
		cmp.Compare(a.RepositoryKind, b.RepositoryKind),
		strings.Compare(a.PackageID, b.PackageID),
	)
}

// Sample returns a deterministic sample of n groups. Content keys are sha256
// hashes, so the groups with the lowest content keys are a uniform sample
// that doesn't depend on the input order. Two runs on the same input select
// the same groups, which is what agreement runs need. All groups are
// returned when n is not positive or not lower than the number of groups.
func Sample(groups []*Group, n int) []*Group {
	sorted := slices.Clone(groups)
	slices.SortFunc(sorted, func(a, b *Group) int { return strings.Compare(a.ContentKey, b.ContentKey) })
	if n <= 0 || n >= len(sorted) {
		return sorted
	}
	return sorted[:n]
}
