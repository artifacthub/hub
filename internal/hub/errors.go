package hub

import "errors"

var (
	// ErrInvalidInput indicates that the input provided is not valid.
	ErrInvalidInput = errors.New("invalid input")

	// ErrInsufficientPrivilege indicates that the user does not have the
	// required privilege to perform the operation.
	ErrInsufficientPrivilege = errors.New("insufficient_privilege")

	// ErrNotFound indicates that the requested item was not found.
	ErrNotFound = errors.New("not found")
)

// ErrorsCollector interface defines the methods that an errors collector
// implementation should provide.
type ErrorsCollector interface {
	Append(repositoryID string, err string)
	Flush()
	Init(repositoryID string)
}
