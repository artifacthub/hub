package hub

import "errors"

var (
	// ErrInsufficientPrivilege indicates that the user does not have the
	// required privilege to perform the operation.
	ErrInsufficientPrivilege = errors.New("insufficient_privilege")
)
