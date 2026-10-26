// Package catalog provides the package categories supported by Artifact Hub.
//
// The categories are defined in the embedded categories.yaml file, which is
// the single source of truth for their IDs, names, display names and
// descriptions. This package must remain a leaf package (it must not import
// internal/hub), so that it can be used from anywhere without creating import
// cycles.
package catalog

import (
	"bytes"
	"crypto/sha256"
	_ "embed" // Used by the categories file
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"regexp"
	"sort"
	"strings"

	"gopkg.in/yaml.v3"
)

const (
	// SkipPrediction is a reserved name publishers can use to request that no
	// category is predicted for their package.
	SkipPrediction = "skip-prediction"

	// None is a reserved name used to label packages that don't belong to any
	// of the categories available.
	None = "none"
)

var (
	// categoriesYAML represents the raw content of the categories file.
	//go:embed categories.yaml
	categoriesYAML []byte

	// nameRE is the regular expression used to validate category names.
	nameRE = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

	// reservedNames represents the names that cannot be used by categories.
	reservedNames = map[string]struct{}{
		SkipPrediction: {},
		None:           {},
	}
)

var (
	// categories represents the categories available, sorted by ID.
	categories []Category

	// categoriesByID represents the categories available indexed by ID.
	categoriesByID map[int]Category

	// categoriesByName represents the categories available indexed by name.
	categoriesByName map[string]Category

	// labelingDigest represents the digest of the categories file.
	labelingDigest string

	// modelDigest represents the digest of the categories' IDs and names.
	modelDigest string
)

func init() {
	var err error
	categories, err = Parse(categoriesYAML)
	if err != nil {
		panic(fmt.Sprintf("invalid embedded categories file: %v", err))
	}
	categoriesByID = make(map[int]Category, len(categories))
	categoriesByName = make(map[string]Category, len(categories))
	for _, c := range categories {
		categoriesByID[c.ID] = c
		categoriesByName[c.Name] = c
	}
	labelingDigest = digest(categoriesYAML)
	modelDigest = computeModelDigest(categories)
}

// Category represents a package category.
type Category struct {
	ID          int    `yaml:"id"`
	Name        string `yaml:"name"`
	DisplayName string `yaml:"display_name"`
	Description string `yaml:"description"`
}

// Parse parses and validates the categories file provided, returning the
// categories it contains sorted by ID.
func Parse(data []byte) ([]Category, error) {
	// Decode categories (unknown fields are not allowed)
	var cs []Category
	dec := yaml.NewDecoder(bytes.NewReader(data))
	dec.KnownFields(true)
	if err := dec.Decode(&cs); err != nil {
		if errors.Is(err, io.EOF) {
			return nil, errors.New("no categories found")
		}
		return nil, fmt.Errorf("error decoding categories: %w", err)
	}
	var extra any
	if err := dec.Decode(&extra); !errors.Is(err, io.EOF) {
		return nil, errors.New("categories file must contain a single document")
	}
	if len(cs) == 0 {
		return nil, errors.New("no categories found")
	}

	// Validate categories
	ids := make(map[int]struct{}, len(cs))
	names := make(map[string]struct{}, len(cs))
	for _, c := range cs {
		if c.ID <= 0 {
			return nil, fmt.Errorf("category %q: id must be positive", c.Name)
		}
		if _, ok := ids[c.ID]; ok {
			return nil, fmt.Errorf("category %q: duplicate id %d", c.Name, c.ID)
		}
		ids[c.ID] = struct{}{}
		if !nameRE.MatchString(c.Name) {
			return nil, fmt.Errorf("category %d: name %q must be kebab-case", c.ID, c.Name)
		}
		if _, ok := reservedNames[c.Name]; ok {
			return nil, fmt.Errorf("category %d: name %q is reserved", c.ID, c.Name)
		}
		if _, ok := names[c.Name]; ok {
			return nil, fmt.Errorf("category %d: duplicate name %q", c.ID, c.Name)
		}
		names[c.Name] = struct{}{}
		if strings.TrimSpace(c.DisplayName) == "" {
			return nil, fmt.Errorf("category %q: display name not provided", c.Name)
		}
		if strings.TrimSpace(c.Description) == "" {
			return nil, fmt.Errorf("category %q: description not provided", c.Name)
		}
	}

	sort.Slice(cs, func(i, j int) bool { return cs[i].ID < cs[j].ID })
	return cs, nil
}

// All returns all the categories available, sorted by ID.
func All() []Category {
	cs := make([]Category, len(categories))
	copy(cs, categories)
	return cs
}

// ByID returns the category with the ID provided, if it exists.
func ByID(id int) (Category, bool) {
	c, ok := categoriesByID[id]
	return c, ok
}

// ByName returns the category with the name provided, if it exists. Reserved
// names (like skip-prediction or none) are never returned.
func ByName(name string) (Category, bool) {
	c, ok := categoriesByName[name]
	return c, ok
}

// Names returns the names of all the categories available, sorted by ID.
func Names() []string {
	names := make([]string, 0, len(categories))
	for _, c := range categories {
		names = append(names, c.Name)
	}
	return names
}

// LabelingDigest returns the digest of the whole categories file (including
// the descriptions). It's recorded with the labelling metadata.
func LabelingDigest() string {
	return labelingDigest
}

// ModelDigest returns the digest of the categories' IDs and names, which is
// all models depend on. It's recorded in the models, and it doesn't change
// when other fields (like the descriptions) are updated.
func ModelDigest() string {
	return modelDigest
}

// computeModelDigest computes the model digest of the categories provided,
// which must be sorted by ID. Each category is encoded as a "<id>:<name>\n"
// line (names are kebab-case, so the encoding is unambiguous).
func computeModelDigest(cs []Category) string {
	var b bytes.Buffer
	for _, c := range cs {
		fmt.Fprintf(&b, "%d:%s\n", c.ID, c.Name)
	}
	return digest(b.Bytes())
}

// digest returns the sha256 digest of the data provided, in the
// "sha256:<hex>" format.
func digest(data []byte) string {
	sum := sha256.Sum256(data)
	return "sha256:" + hex.EncodeToString(sum[:])
}
