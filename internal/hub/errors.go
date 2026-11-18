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

	// ErrTooManyAttempts indicates that too many attempts of an operation have
	// been made and it must be retried later. The web application relies on
	// this message to tell this error apart from a 429 sent by a CDN or proxy
	// (TOO_MANY_ATTEMPTS_MESSAGE in web/src/api/index.ts).
	ErrTooManyAttempts = errors.New("too many attempts, please try again later")
)

// TooManyAttemptsError provides some details about an ErrTooManyAttempts error.
type TooManyAttemptsError struct {
	RetryAfter int // Seconds until the next attempt is allowed
}

// Error implements the error interface.
func (e *TooManyAttemptsError) Error() string { return ErrTooManyAttempts.Error() }

// Unwrap returns the ErrTooManyAttempts error this error provides details
// about.
func (e *TooManyAttemptsError) Unwrap() error { return ErrTooManyAttempts }

// ErrorsCollector interface defines the methods that an errors collector
// implementation should provide.
type ErrorsCollector interface {
	Append(repositoryID string, err string)
	Flush()
	Init(repositoryID string)
}
