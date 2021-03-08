package handlers

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRealIP(t *testing.T) {
	checkRemoteAddr := func(expectedRemoteAddr string) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, expectedRemoteAddr, r.RemoteAddr)
		}
	}

	testCases := []struct {
		xForwardedFor      string
		xffIndex           int
		expectedRemoteAddr string
	}{
		{
			"",
			0,
			"1.1.1.1:",
		},
		{
			"",
			1,
			"1.1.1.1:",
		},
		{
			"2.2.2.2",
			0,
			"2.2.2.2:",
		},
		{
			"2.2.2.2",
			1,
			"1.1.1.1:",
		},
		{
			"2.2.2.2",
			5,
			"1.1.1.1:",
		},
		{
			"2.2.2.2",
			-1,
			"2.2.2.2:",
		},
		{
			"2.2.2.2",
			-5,
			"1.1.1.1:",
		},
		{
			"2.2.2.2, 3.3.3.3",
			-1,
			"3.3.3.3:",
		},
		{
			"2.2.2.2, 3.3.3.3",
			-2,
			"2.2.2.2:",
		},
		{
			"2.2.2.2, 3.3.3.3",
			1,
			"3.3.3.3:",
		},
		{
			"2.2.2.2, 3.3.3.3",
			2,
			"1.1.1.1:",
		},
		{
			"  2.2.2.2, 3.3.3.3,  4.4.4.4",
			0,
			"2.2.2.2:",
		},
		{
			"2.2.2.2, 3.3.3.3,  4.4.4.4",
			-1,
			"4.4.4.4:",
		},
		{
			"2.2.2.2, 3.3.3.3,  4.4.4.4",
			-2,
			"3.3.3.3:",
		},
	}
	for _, tc := range testCases {
		tc := tc
		desc := fmt.Sprintf("XFF: %s Index: %d", tc.xForwardedFor, tc.xffIndex)
		t.Run(desc, func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r := &http.Request{
				RemoteAddr: "1.1.1.1:",
				Header: http.Header{
					xForwardedFor: []string{tc.xForwardedFor},
				},
			}
			realIP(tc.xffIndex)(checkRemoteAddr(tc.expectedRemoteAddr)).ServeHTTP(w, r)
		})
	}
}
