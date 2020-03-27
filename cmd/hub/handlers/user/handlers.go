package user

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/api"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/gorilla/securecookie"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

const (
	sessionCookieName = "sid"
	sessionDuration   = 30 * 24 * time.Hour
)

// Handlers represents a group of http handlers in charge of handling
// users operations.
type Handlers struct {
	hubAPI *api.API
	cfg    *viper.Viper
	sc     *securecookie.SecureCookie
	logger zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(hubAPI *api.API, cfg *viper.Viper) *Handlers {
	sc := securecookie.New([]byte(cfg.GetString("server.cookie.hashKey")), nil)
	sc.MaxAge(int(sessionDuration.Seconds()))
	return &Handlers{
		hubAPI: hubAPI,
		cfg:    cfg,
		sc:     sc,
		logger: log.With().Str("handlers", "user").Logger(),
	}
}

// BasicAuth is a middleware that provides basic auth support.
func (h *Handlers) BasicAuth(next http.Handler) http.Handler {
	validUser := []byte(h.cfg.GetString("server.basicAuth.username"))
	validPass := []byte(h.cfg.GetString("server.basicAuth.password"))
	realm := "Hub"

	areCredentialsValid := func(user, pass []byte) bool {
		if subtle.ConstantTimeCompare(user, validUser) != 1 {
			return false
		}
		if subtle.ConstantTimeCompare(pass, validPass) != 1 {
			return false
		}
		return true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		if !ok || !areCredentialsValid([]byte(user), []byte(pass)) {
			w.Header().Set("WWW-Authenticate", "Basic realm="+realm+`"`)
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte("Unauthorized\n"))
			return
		}
		next.ServeHTTP(w, r)
	})
}

// GetAlias is an http handler used to get a logged in user alias.
func (h *Handlers) GetAlias(w http.ResponseWriter, r *http.Request) {
	alias, err := h.hubAPI.User.GetAlias(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetAlias").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	jsonData := []byte(fmt.Sprintf(`{"alias": "%s"}`, alias))
	helpers.RenderJSON(w, jsonData, 0)
}

// Login is an http handler used to log a user in.
func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	// Extract credentials from request
	email := r.FormValue("email")
	password := r.FormValue("password")
	if email == "" || password == "" {
		errMsg := "credentials not provided"
		h.logger.Error().Str("method", "Login").Msg(errMsg)
		http.Error(w, errMsg, http.StatusBadRequest)
		return
	}

	// Check if the credentials provided are valid
	checkCredentialsOutput, err := h.hubAPI.User.CheckCredentials(r.Context(), email, password)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "Login").Msg("checkCredentials failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	if !checkCredentialsOutput.Valid {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Register user session
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	session := &hub.Session{
		UserID:    checkCredentialsOutput.UserID,
		IP:        ip,
		UserAgent: r.UserAgent(),
	}
	sessionID, err := h.hubAPI.User.RegisterSession(r.Context(), session)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "Login").Msg("registerSession failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}

	// Generate and set session cookie
	encodedSessionID, err := h.sc.Encode(sessionCookieName, sessionID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "Login").Msg("sessionID encoding failed")
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	cookie := &http.Cookie{
		Name:     sessionCookieName,
		Value:    encodedSessionID,
		Path:     "/",
		Expires:  time.Now().Add(sessionDuration),
		HttpOnly: true,
	}
	if h.cfg.GetBool("server.cookie.secure") {
		cookie.Secure = true
	}
	http.SetCookie(w, cookie)
}

// Logout is an http handler used to log a user out.
func (h *Handlers) Logout(w http.ResponseWriter, r *http.Request) {
	// Delete user session
	cookie, err := r.Cookie(sessionCookieName)
	if err == nil {
		var sessionID []byte
		err = h.sc.Decode(sessionCookieName, cookie.Value, &sessionID)
		if err == nil {
			err = h.hubAPI.User.DeleteSession(r.Context(), sessionID)
			if err != nil {
				h.logger.Error().Err(err).Str("method", "Logout").Msg("deleteSession failed")
			}
		}
	}

	// Request browser to delete session cookie
	cookie = &http.Cookie{
		Name:    sessionCookieName,
		Expires: time.Now().Add(-24 * time.Hour),
	}
	http.SetCookie(w, cookie)
}

// RegisterUser is an http handler used to register a user in the hub database.
func (h *Handlers) RegisterUser(w http.ResponseWriter, r *http.Request) {
	user := &hub.User{}
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "RegisterUser").Msg("invalid user")
		http.Error(w, "user provided is not valid", http.StatusBadRequest)
		return
	}
	if err := validateUser(user); err != nil {
		log.Error().Err(err).Msg("invalid user")
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err = h.hubAPI.User.RegisterUser(r.Context(), user, helpers.GetBaseURL(r))
	if err != nil {
		h.logger.Error().Err(err).Str("method", "RegisterUser").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
}

// validateUser validates a user instance before we attempt to register it in
// the database.
func validateUser(user *hub.User) error {
	if user.Alias == "" {
		return fmt.Errorf("alias not provided")
	}
	if user.Email == "" {
		return fmt.Errorf("email not provided")
	}
	if user.Password == "" {
		return fmt.Errorf("password not provided")
	}
	return nil
}

// RequireLogin is a middleware that verifies if a user is logged in.
func (h *Handlers) RequireLogin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract and validate cookie from request
		cookie, err := r.Cookie(sessionCookieName)
		if err != nil {
			http.Error(w, "", http.StatusUnauthorized)
			return
		}
		var sessionID []byte
		if err = h.sc.Decode(sessionCookieName, cookie.Value, &sessionID); err != nil {
			h.logger.Error().Err(err).Str("method", "RequireLogin").Msg("sessionID decoding failed")
			http.Error(w, "", http.StatusUnauthorized)
			return
		}

		// Check the session provided is valid
		checkSessionOutput, err := h.hubAPI.User.CheckSession(r.Context(), sessionID, sessionDuration)
		if err != nil {
			h.logger.Error().Err(err).Str("method", "RequireLogin").Msg("checkSession failed")
			http.Error(w, "", http.StatusInternalServerError)
			return
		}
		if !checkSessionOutput.Valid {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		// Inject userID in context and call next handler
		ctx := context.WithValue(r.Context(), hub.UserIDKey, checkSessionOutput.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// VerifyEmail is an http handler used to verify a user's email address.
func (h *Handlers) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	code := r.FormValue("code")
	if code == "" {
		errMsg := "email verification code not provided"
		h.logger.Error().Str("method", "VerifyEmail").Msg(errMsg)
		http.Error(w, errMsg, http.StatusBadRequest)
		return
	}
	verified, err := h.hubAPI.User.VerifyEmail(r.Context(), code)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "VerifyEmail").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	if !verified {
		w.WriteHeader(http.StatusGone)
	}
}
