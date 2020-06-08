package hub

import "errors"

var (
	// ErrInvalidInput indicates that the input provided is not valid.
	ErrInvalidInput = errors.New("invalid input")

	// ErrInsufficientPrivilege indicates that the user does not have the
	// required privilege to perform the operation.
	ErrInsufficientPrivilege = errors.New("insufficient_privilege")
)
