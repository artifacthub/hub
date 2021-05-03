package source

import (
	"fmt"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"gopkg.in/yaml.v2"
)

// ParseChangesAnnotation parses the provided changes annotation returning a
// slice of changes entries. Changes entries are also validated an normalized.
func ParseChangesAnnotation(annotation string) ([]*hub.Change, error) {
	var changes []*hub.Change
	if err := yaml.Unmarshal([]byte(annotation), &changes); err != nil {
		var changesDescriptions []string
		if err := yaml.Unmarshal([]byte(annotation), &changesDescriptions); err != nil {
			return nil, fmt.Errorf("invalid changes annotation: %s", annotation)
		}
		for _, description := range changesDescriptions {
			changes = append(changes, &hub.Change{Description: description})
		}
	}
	for _, change := range changes {
		if err := pkg.ValidateChange(change); err != nil {
			return nil, err
		}
		pkg.NormalizeChange(change)
	}
	return changes, nil
}
