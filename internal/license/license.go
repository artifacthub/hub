package license

import (
	"github.com/go-enry/go-license-detector/v4/licensedb"
	"github.com/go-enry/go-license-detector/v4/licensedb/filer"
)

// Detect detects the license used in the file provided.
func Detect(data []byte) string {
	var license string
	matches, err := licensedb.Detect(&Filer{Data: data})
	if err == nil && len(matches) > 0 {
		var highestConfidence float32
		for name, match := range matches {
			if match.Confidence > highestConfidence {
				license = name
				highestConfidence = match.Confidence
			}
		}
	}
	return license
}

// Filer is an implementation the licensedb.Filer interface that returns a
// single file data previously provided.
type Filer struct {
	Data []byte
}

// Close implements the licensedb.Filer interface.
func (f *Filer) Close() {}

// PathsAreAlwaysSlash implements the licensedb.Filer interface.
func (f *Filer) PathsAreAlwaysSlash() bool {
	return false
}

// ReadDir implements the licensedb.Filer interface.
func (f *Filer) ReadDir(path string) ([]filer.File, error) {
	return []filer.File{{Name: "LICENSE"}}, nil
}

// ReadFile implements the licensedb.Filer interface.
func (f *Filer) ReadFile(path string) (content []byte, err error) {
	return f.Data, nil
}
