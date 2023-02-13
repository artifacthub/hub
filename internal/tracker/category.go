package tracker

import (
	"os"
	"strings"

	"github.com/artifacthub/hub/internal/hub"
	tf "github.com/galeone/tensorflow/tensorflow/go"
	tg "github.com/galeone/tfgo"
)

// PackageCategoryClassifierML classifies packages by category using a ML model.
type PackageCategoryClassifierML struct {
	model *tg.Model
}

// NewPackageCategoryClassifierML creates a new CategoryClassifier instance.
func NewPackageCategoryClassifierML(modelPath string) *PackageCategoryClassifierML {
	// Set TF log level to INFO
	os.Setenv("TF_CPP_MIN_LOG_LEVEL", "2")

	return &PackageCategoryClassifierML{
		model: tg.LoadModel(modelPath, []string{"serve"}, nil),
	}
}

// Predict returns the predicted category according to the model for the
// package provided. The prediction is based on the package's keywords.
func (c *PackageCategoryClassifierML) Predict(p *hub.Package) hub.PackageCategory {
	defer func() {
		// model.Exec panics on error. If this happens, the predicted category
		// will be unknown.
		_ = recover()
	}()

	// The prediction is based on the keywords, so they are required to proceed
	if p == nil || len(p.Keywords) == 0 {
		return hub.UnknownCategory
	}

	// Prepare input tensor
	keywords := strings.ToLower(strings.Join(p.Keywords, ","))
	input, err := tf.NewTensor([][]string{{keywords}})
	if err != nil {
		return hub.UnknownCategory
	}

	// Get prediction from model
	results := c.model.Exec([]tf.Output{
		c.model.Op("StatefulPartitionedCall", 0),
	}, map[tf.Output]*tf.Tensor{
		c.model.Op("serving_default_input_1", 0): input,
	})
	var prediction []float32
	if len(results) == 1 {
		v, ok := results[0].Value().([][]float32)
		if ok && len(v) == 1 {
			prediction = v[0]
		}
	}
	if prediction == nil {
		return hub.UnknownCategory
	}

	// Return corresponding category from prediction
	var max float32
	var maxIndex int
	for i, v := range prediction {
		if v > max {
			max = v
			maxIndex = i
		}
	}
	return hub.PackageCategory(maxIndex)
}
