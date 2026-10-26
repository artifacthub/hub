package labeler

import (
	"crypto/sha256"
	_ "embed" // Used by the guidelines document
	"encoding/hex"
)

var (
	// guidelines represents the labelling guidelines document, which is
	// included in every request sent to the agents.
	//go:embed guidelines.md
	guidelines []byte

	// guidelinesDigest represents the digest of the guidelines document.
	guidelinesDigest = digest(guidelines)
)

// GuidelinesDigest returns the digest of the labelling guidelines document.
// It's recorded in every dataset row.
func GuidelinesDigest() string {
	return guidelinesDigest
}

// digest returns the sha256 digest of the data provided, in the
// "sha256:<hex>" format.
func digest(data []byte) string {
	sum := sha256.Sum256(data)
	return "sha256:" + hex.EncodeToString(sum[:])
}
