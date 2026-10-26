package labeler

import (
	"bufio"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGuidelinesInSync(t *testing.T) {
	t.Parallel()

	// Collect the level 3 headings of the categories section, and check
	// that no other section uses level 3 headings (they are reserved for
	// categories)
	var section string
	var categoriesSectionFound bool
	var headings []string
	inCodeBlock := false
	scanner := bufio.NewScanner(bytes.NewReader(guidelines))
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "```") {
			inCodeBlock = !inCodeBlock
			continue
		}
		switch {
		case inCodeBlock:
		case strings.HasPrefix(line, "## "):
			section = strings.TrimPrefix(line, "## ")
			if section == "Categories" {
				categoriesSectionFound = true
			}
		case strings.HasPrefix(line, "### "):
			require.Equal(t, "Categories", section, "level 3 heading %q outside the categories section", line)
			headings = append(headings, strings.TrimPrefix(line, "### "))
		}
	}
	require.NoError(t, scanner.Err())
	require.True(t, categoriesSectionFound, "categories section not found")

	// Every catalog category has a section, in catalog order, and every
	// section is a catalog category
	assert.Equal(t, catalog.Names(), headings)
}

func TestGuidelinesDigest(t *testing.T) {
	t.Parallel()

	sum := sha256.Sum256(guidelines)
	assert.Equal(t, "sha256:"+hex.EncodeToString(sum[:]), GuidelinesDigest())
}
