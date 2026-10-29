package labeler

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"

	"github.com/artifacthub/hub/internal/category/catalog"
	"github.com/artifacthub/hub/internal/category/dataset"
)

// Label represents the label assigned by an agent to a package.
type Label struct {
	// Category represents the category assigned: a catalog category name or
	// none.
	Category string

	// Confidence represents the confidence of the label (high, medium or
	// low).
	Confidence string

	// Suspicious indicates whether the agent flagged the package as
	// suspicious (for example, because its content tries to steer the
	// labelling).
	Suspicious bool
}

// replyLabel represents a label in an agent's reply. Fields are pointers so
// that missing fields can be detected.
type replyLabel struct {
	ID         *string `json:"id"`
	Category   *string `json:"category"`
	Confidence *string `json:"confidence"`
	Suspicious *bool   `json:"suspicious"`
}

// ParseReply parses and validates an agent's reply to a request to label n
// packages. The labels are returned in the same order as the packages in the
// request. Any validation error wraps ErrInvalidReply. Only the labels are
// read from the reply: nothing in it is ever executed or used as a path.
func ParseReply(data []byte, n int) ([]Label, error) {
	invalid := func(format string, a ...any) ([]Label, error) {
		return nil, fmt.Errorf("%w: %s", ErrInvalidReply, fmt.Sprintf(format, a...))
	}

	// Decode reply (unknown fields are not allowed)
	var reply struct {
		Labels *[]replyLabel `json:"labels"`
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&reply); err != nil {
		return invalid("error decoding reply: %v", err)
	}
	if _, err := dec.Token(); !errors.Is(err, io.EOF) {
		return invalid("unexpected data after reply")
	}
	if reply.Labels == nil {
		return invalid("labels not provided")
	}

	// Validate labels
	ids := make(map[string]int, n)
	for i := range n {
		ids[itemID(i)] = i
	}
	labels := make([]Label, n)
	seen := make([]bool, n)
	for _, l := range *reply.Labels {
		switch {
		case l.ID == nil:
			return invalid("label id not provided")
		case l.Category == nil:
			return invalid("%s: category not provided", *l.ID)
		case l.Confidence == nil:
			return invalid("%s: confidence not provided", *l.ID)
		case l.Suspicious == nil:
			return invalid("%s: suspicious not provided", *l.ID)
		}
		i, ok := ids[*l.ID]
		if !ok {
			return invalid("unknown id %q", *l.ID)
		}
		if seen[i] {
			return invalid("duplicate id %q", *l.ID)
		}
		seen[i] = true
		if _, ok := catalog.ByName(*l.Category); !ok && *l.Category != catalog.None {
			return invalid("%s: invalid category %q", *l.ID, *l.Category)
		}
		switch *l.Confidence {
		case dataset.ConfidenceHigh, dataset.ConfidenceMedium, dataset.ConfidenceLow:
		default:
			return invalid("%s: invalid confidence %q", *l.ID, *l.Confidence)
		}
		labels[i] = Label{
			Category:   *l.Category,
			Confidence: *l.Confidence,
			Suspicious: *l.Suspicious,
		}
	}
	for i := range n {
		if !seen[i] {
			return invalid("label for %s not provided", itemID(i))
		}
	}
	return labels, nil
}
