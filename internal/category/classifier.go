package category

import (
	"errors"
	"fmt"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/model"
	"github.com/artifacthub/hub/internal/hub"
)

// Classifier classifies packages by category using a package category model.
// It's immutable once built, so it's safe for concurrent use.
type Classifier struct {
	model *model.Model
	ids   map[string]hub.PackageCategory
}

// NewClassifier creates a new Classifier instance using the model provided.
// The model's categories are mapped to their catalog ids, so all of them must
// exist in the catalog.
func NewClassifier(m *model.Model) (*Classifier, error) {
	if m == nil {
		return nil, errors.New("model not provided")
	}
	ids := make(map[string]hub.PackageCategory, len(m.Categories))
	for _, name := range m.Categories {
		c, ok := catalog.ByName(name)
		if !ok {
			return nil, fmt.Errorf("model category %q not found in catalog", name)
		}
		ids[name] = hub.PackageCategory(c.ID)
	}
	return &Classifier{
		model: m,
		ids:   ids,
	}, nil
}

// Predict returns the category predicted for the package provided, based on
// its name, keywords and description. The unknown category is returned when
// the package has no features known by the model, when the prediction's
// confidence is below the threshold of the category predicted or when it is
// suppressed.
func (c *Classifier) Predict(p *hub.Package) hub.PackageCategory {
	if c == nil || p == nil {
		return hub.UnknownCategory
	}
	return c.predict(p.Name, p.Keywords, p.Description)
}

// predict returns the category predicted for the package details provided.
func (c *Classifier) predict(name string, keywords []string, description string) hub.PackageCategory {
	category, _ := c.model.Predict(model.Input{
		Name:        name,
		Keywords:    keywords,
		Description: description,
	})
	if category == "" {
		return hub.UnknownCategory
	}
	id, ok := c.ids[category]
	if !ok {
		return hub.UnknownCategory
	}
	return id
}
