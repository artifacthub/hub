package img

import (
	"flag"
	"fmt"
	"io/ioutil"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var update = flag.Bool("update", false, "Write image versions to testdata directory")

func TestGenerateImageVersions(t *testing.T) {
	// Read sample images
	validImgData, err := ioutil.ReadFile("testdata/valid.png")
	require.NoError(t, err)
	invalidImgData, err := ioutil.ReadFile("testdata/invalid.png")
	require.NoError(t, err)

	// Check the data provided must be a valid image
	_, err = GenerateImageVersions(invalidImgData)
	require.Error(t, err)

	// Generate image1 versions and check we get the expected results
	imgVersions, err := GenerateImageVersions(validImgData)
	require.NoError(t, err)
	if *update {
		// Update image1 versions in testdata
		for _, iv := range imgVersions {
			name := fmt.Sprintf("testdata/valid@%s.png", iv.Version)
			err := ioutil.WriteFile(name, iv.Data, 0600)
			require.NoError(t, err)
		}
	}
	for _, iv := range imgVersions {
		name := fmt.Sprintf("testdata/valid@%s.png", iv.Version)
		ivGolden, err := ioutil.ReadFile(name)
		require.NoError(t, err)
		assert.Equal(t, ivGolden, iv.Data)
	}
}
