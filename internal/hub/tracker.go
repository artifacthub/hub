package hub

// GitCloner describes the methods a GitCloner implementation must provide.
type GitCloner interface {
	// CloneRepository clones the operators repository provided in a temporary
	// dir, returning the temporary directory path and the path where the
	// operators are located. It's the caller's responsibility to delete them
	// temporary dir when done.
	CloneRepository(r *Repository) (string, string, error)
}
