package generic

// GKExample represents an example in a Gatekeeper policy.
type GKExample struct {
	Name  string           `json:"name"`
	Cases []*GKExampleCase `json:"cases"`
}

// GKExampleCase represents an example's case in a Gatekeeper policy.
type GKExampleCase struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Content string `json:"content"`
}
