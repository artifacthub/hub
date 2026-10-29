package model

import (
	"bufio"
	"bytes"
	"crypto/sha256"
	_ "embed" // Used by the stop words file
	"encoding/hex"
	"encoding/json"
	"slices"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

const (
	// FeaturesVersion represents the version of the features extraction. It
	// must be bumped whenever the tokenization, the normalization, the stop
	// words, the description cut-off or the vocabulary rules change, as
	// models built with a different version are not compatible.
	FeaturesVersion = 1

	// MaxDescriptionLength represents the maximum number of characters of the
	// description used by the model (the rest is ignored).
	MaxDescriptionLength = 1000

	// Features prefixes.
	keywordPrefix     = "kw:"
	namePrefix        = "name:"
	descriptionPrefix = "desc:"

	// minDescriptionTokenLength represents the minimum number of characters
	// a description token must have to be used.
	minDescriptionTokenLength = 2
)

var (
	// stopWordsData represents the raw content of the stop words file.
	//go:embed stopwords.txt
	stopWordsData []byte

	// stopWords represents the English stop words dropped from the
	// description tokens.
	stopWords = parseStopWords(stopWordsData)
)

// Input represents the information about a package used by the model.
type Input struct {
	Name        string
	Keywords    []string
	Description string
}

// Features returns the features extracted from the input provided, sorted
// and deduplicated. Features are binary: only their presence matters.
func Features(in Input) []string {
	set := make(map[string]struct{})

	// Keywords: each normalized keyword and its parts
	for _, kw := range normalizeKeywords(in.Keywords) {
		set[keywordPrefix+kw] = struct{}{}
		for _, part := range splitParts(kw) {
			set[keywordPrefix+part] = struct{}{}
		}
	}

	// Name parts
	for _, part := range splitParts(normalizeText(in.Name)) {
		set[namePrefix+part] = struct{}{}
	}

	// Description words
	description := normalizeText(TruncateDescription(in.Description))
	for _, word := range strings.FieldsFunc(description, isNotLetterOrDigit) {
		if !isValidDescriptionToken(word) {
			continue
		}
		set[descriptionPrefix+word] = struct{}{}
	}

	features := make([]string, 0, len(set))
	for f := range set {
		features = append(features, f)
	}
	slices.Sort(features)
	return features
}

// ContentKey returns a key that identifies the normalized model inputs of a
// package: its name, its sorted and deduplicated keywords and the first
// MaxDescriptionLength characters of its description. Packages with the same
// content key have identical features.
func ContentKey(name string, keywords []string, description string) string {
	// Encoding the normalized inputs as JSON makes the key unambiguous
	data, _ := json.Marshal(struct {
		Name        string   `json:"name"`
		Keywords    []string `json:"keywords"`
		Description string   `json:"description"`
	}{
		Name:        normalizeText(name),
		Keywords:    normalizeKeywords(keywords),
		Description: normalizeText(TruncateDescription(description)),
	})
	sum := sha256.Sum256(data)
	return "sha256:" + hex.EncodeToString(sum[:])
}

// TruncateDescription returns the first MaxDescriptionLength characters of
// the description provided.
func TruncateDescription(description string) string {
	n := 0
	for i := range description {
		if n == MaxDescriptionLength {
			return description[:i]
		}
		n++
	}
	return description
}

// normalizeText returns the text provided normalized (NFKC), lowercased and
// with its whitespace trimmed and collapsed.
func normalizeText(s string) string {
	return strings.Join(strings.Fields(strings.ToLower(norm.NFKC.String(s))), " ")
}

// normalizeKeywords returns the keywords provided normalized, sorted and
// deduplicated. Keywords that are empty once normalized are dropped.
func normalizeKeywords(keywords []string) []string {
	normalized := make([]string, 0, len(keywords))
	for _, kw := range keywords {
		if kw = normalizeText(kw); kw != "" {
			normalized = append(normalized, kw)
		}
	}
	slices.Sort(normalized)
	return slices.Compact(normalized)
}

// splitParts splits the normalized text provided in parts. Parts are
// separated by dashes, underscores, dots, slashes and whitespace.
func splitParts(s string) []string {
	return strings.FieldsFunc(s, func(r rune) bool {
		switch r {
		case '-', '_', '.', '/':
			return true
		default:
			return unicode.IsSpace(r)
		}
	})
}

// isNotLetterOrDigit checks if the rune provided is not a letter or a digit.
func isNotLetterOrDigit(r rune) bool {
	return !unicode.IsLetter(r) && !unicode.IsDigit(r)
}

// isValidDescriptionToken checks if the description token provided can be
// used as a feature. Short tokens, pure numbers and stop words are dropped.
func isValidDescriptionToken(token string) bool {
	n := 0
	allDigits := true
	for _, r := range token {
		n++
		if !unicode.IsDigit(r) {
			allDigits = false
		}
	}
	if n < minDescriptionTokenLength || allDigits {
		return false
	}
	_, isStopWord := stopWords[token]
	return !isStopWord
}

// parseStopWords parses the stop words file provided. Empty lines and lines
// starting with # are ignored.
func parseStopWords(data []byte) map[string]struct{} {
	words := make(map[string]struct{})
	scanner := bufio.NewScanner(bytes.NewReader(data))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		words[normalizeText(line)] = struct{}{}
	}
	return words
}
