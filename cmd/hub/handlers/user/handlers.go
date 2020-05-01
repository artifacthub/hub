package user

import (
	"context"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/user"
	"github.com/go-chi/chi"
	"github.com/google/go-github/github"
	"github.com/gorilla/securecookie"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/satori/uuid"
	"github.com/spf13/viper"
	"golang.org/x/oauth2"
	oagithub "golang.org/x/oauth2/github"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/option"
	"google.golang.org/api/people/v1"
)

const (
	sessionCookieName    = "sid"
	oauthStateCookieName = "oas"
	sessionDuration      = 30 * 24 * time.Hour
	oauthFailedURL       = "/oauth-failed"
)

// Handlers represents a group of http handlers in charge of handling
// users operations.
type Handlers struct {
	userManager hub.UserManager
	cfg         *viper.Viper
	sc          *securecookie.SecureCookie
	oauthConfig map[string]*oauth2.Config
	logger      zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(userManager hub.UserManager, cfg *viper.Viper) *Handlers {
	rand.Seed(time.Now().UTC().UnixNano())

	// Setup secure cookie instance
	sc := securecookie.New([]byte(cfg.GetString("server.cookie.hashKey")), nil)
	sc.MaxAge(int(sessionDuration.Seconds()))

	// Setup oauth providers configuration
	oauthConfig := make(map[string]*oauth2.Config)
	for provider := range cfg.GetStringMap("server.oauth") {
		var endpoint oauth2.Endpoint
		switch provider {
		case "github":
			endpoint = oagithub.Endpoint
		case "google":
			endpoint = google.Endpoint
		default:
			continue
		}
		baseCfgKey := fmt.Sprintf("server.oauth.%s.", provider)
		oauthConfig[provider] = &oauth2.Config{
			ClientID:     cfg.GetString(baseCfgKey + "clientID"),
			ClientSecret: cfg.GetString(baseCfgKey + "clientSecret"),
			Endpoint:     endpoint,
			Scopes:       cfg.GetStringSlice(baseCfgKey + "scopes"),
			RedirectURL:  cfg.GetString(baseCfgKey + "redirectURL"),
		}
	}

	return &Handlers{
		userManager: userManager,
		cfg:         cfg,
		sc:          sc,
		oauthConfig: oauthConfig,
		logger:      log.With().Str("handlers", "user").Logger(),
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

// CheckAvailability is an http handler that checks the availability of a given
// value for the provided resource kind.
func (h *Handlers) CheckAvailability(w http.ResponseWriter, r *http.Request) {
	resourceKind := chi.URLParam(r, "resourceKind")
	value := r.FormValue("v")
	w.Header().Set("Cache-Control", helpers.BuildCacheControlHeader(0))
	available, err := h.userManager.CheckAvailability(r.Context(), resourceKind, value)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "CheckAvailability").Send()
		if errors.Is(err, user.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
	if available {
		w.WriteHeader(http.StatusNotFound)
	}
}

// GetProfile is an http handler used to get a logged in user profile.
func (h *Handlers) GetProfile(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.userManager.GetProfileJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetProfile").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0)
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
	checkCredentialsOutput, err := h.userManager.CheckCredentials(r.Context(), email, password)
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
	sessionID, err := h.userManager.RegisterSession(r.Context(), session)
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
			err = h.userManager.DeleteSession(r.Context(), sessionID)
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

// newUserFromGithubProfile builds a new hub.User instance from the user's
// Github profile.
func (h *Handlers) newUserFromGithubProfile(
	ctx context.Context,
	oauthToken *oauth2.Token,
) (*hub.User, error) {
	// Get user profile and emails
	httpClient := oauth2.NewClient(ctx, oauth2.StaticTokenSource(oauthToken))
	githubClient := github.NewClient(httpClient)
	profile, _, err := githubClient.Users.Get(ctx, "")
	if err != nil {
		return nil, err
	}
	emails, _, err := githubClient.Users.ListEmails(ctx, nil)
	if err != nil {
		return nil, err
	}

	// Prepare user alias
	alias := profile.GetLogin()
	available, err := h.userManager.CheckAvailability(ctx, "userAlias", alias)
	if err != nil {
		return nil, err
	}
	if !available {
		alias += strconv.Itoa(rand.Intn(1000))
	}

	// Get user's primary email and check if it has been verified
	var email string
	for _, entry := range emails {
		if entry.GetPrimary() && entry.GetVerified() {
			email = entry.GetEmail()
		}
	}
	if email == "" {
		return nil, errors.New("no valid email available for use")
	}

	return &hub.User{
		Alias:     alias,
		Email:     email,
		FirstName: profile.GetName(),
	}, nil
}

// newUserFromGoogleProfile builds a new hub.User instance from the user's
// Google profile.
func (h *Handlers) newUserFromGoogleProfile(
	ctx context.Context,
	providerConfig *oauth2.Config,
	oauthToken *oauth2.Token,
) (*hub.User, error) {
	// Get user profile
	opt := option.WithTokenSource(providerConfig.TokenSource(ctx, oauthToken))
	peopleService, err := people.NewService(ctx, opt)
	if err != nil {
		return nil, err
	}
	profile, err := peopleService.People.
		Get("people/me").
		PersonFields("names,emailAddresses").
		Do()
	if err != nil {
		return nil, err
	}

	// Get user's primary email and check if it has been verified
	var email string
	for _, entry := range profile.EmailAddresses {
		if entry.Metadata.Primary && entry.Metadata.Verified {
			email = entry.Value
		}
	}
	if email == "" {
		return nil, errors.New("no valid email available for use")
	}

	// Prepare user alias
	alias := strings.Split(email, "@")[0]
	available, err := h.userManager.CheckAvailability(ctx, "userAlias", alias)
	if err != nil {
		return nil, err
	}
	if !available {
		alias += strconv.Itoa(rand.Intn(1000))
	}

	return &hub.User{
		Alias:     alias,
		Email:     email,
		FirstName: profile.Names[0].GivenName,
		LastName:  profile.Names[0].FamilyName,
	}, nil
}

// OauthCallback is an http handler in charge of completing the oauth
// authentication process, registering the user if needed.
func (h *Handlers) OauthCallback(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With().Str("method", "OauthCallback").Logger()

	// Validate oauth code and state
	code := r.FormValue("code")
	if code == "" {
		logger.Error().Msg("oauth code not provided")
		http.Redirect(w, r, oauthFailedURL, http.StatusSeeOther)
		return
	}
	state, err := NewOauthState(r.FormValue("state"))
	if err != nil {
		logger.Error().Msg("oauth state not provided")
		http.Redirect(w, r, oauthFailedURL, http.StatusSeeOther)
		return
	}
	stateCookie, err := r.Cookie(oauthStateCookieName)
	if err != nil {
		logger.Error().Err(err).Msg("state cookie not provided")
		http.Redirect(w, r, oauthFailedURL, http.StatusSeeOther)
		return
	}
	if state.Random != stateCookie.Value {
		logger.Error().Err(err).Msg("invalid state cookie")
		http.Redirect(w, r, oauthFailedURL, http.StatusSeeOther)
		return
	}
	stateCookie = &http.Cookie{
		Name:    oauthStateCookieName,
		Path:    "/",
		Expires: time.Now().Add(-24 * time.Hour),
	}
	http.SetCookie(w, stateCookie)

	// Register user if needed, or return his id if already registered
	provider := chi.URLParam(r, "provider")
	providerConfig := h.oauthConfig[provider]
	oauthToken, err := providerConfig.Exchange(r.Context(), code)
	if err != nil {
		logger.Error().Err(err).Msg("oauth code exchange failed")
		http.Redirect(w, r, oauthFailedURL, http.StatusSeeOther)
		return
	}
	userID, err := h.registerUserWithOauth(r.Context(), provider, providerConfig, oauthToken)
	if err != nil {
		logger.Error().Err(err).Msg("oauth code exchange failed")
		http.Redirect(w, r, oauthFailedURL, http.StatusSeeOther)
		return
	}

	// Register user session and set session cookie
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	session := &hub.Session{
		UserID:    userID,
		IP:        ip,
		UserAgent: r.UserAgent(),
	}
	sessionID, err := h.userManager.RegisterSession(r.Context(), session)
	if err != nil {
		logger.Error().Err(err).Msg("registerSession failed")
		http.Redirect(w, r, oauthFailedURL, http.StatusSeeOther)
		return
	}
	encodedSessionID, err := h.sc.Encode(sessionCookieName, sessionID)
	if err != nil {
		logger.Error().Err(err).Msg("sessionID encoding failed")
		http.Redirect(w, r, oauthFailedURL, http.StatusSeeOther)
		return
	}
	sessionCookie := &http.Cookie{
		Name:     sessionCookieName,
		Value:    encodedSessionID,
		Path:     "/",
		Expires:  time.Now().Add(sessionDuration),
		HttpOnly: true,
	}
	if h.cfg.GetBool("server.cookie.secure") {
		sessionCookie.Secure = true
	}
	http.SetCookie(w, sessionCookie)
	http.Redirect(w, r, state.RedirectURL, http.StatusSeeOther)
}

// OauthRedirect is an http handler that redirects the user to the oauth
// provider to proceed with the authorization.
func (h *Handlers) OauthRedirect(w http.ResponseWriter, r *http.Request) {
	// Generate random value for oauth session and store it in browser. It'll
	// be used later to validate the callback request is done by the same user.
	random := uuid.NewV4().String()
	cookie := &http.Cookie{
		Name:     oauthStateCookieName,
		Value:    random,
		Path:     "/",
		HttpOnly: true,
	}
	if h.cfg.GetBool("server.cookie.secure") {
		cookie.Secure = true
	}
	http.SetCookie(w, cookie)

	// Prepare oauth state and redirect user to oauth provider
	redirectURL := r.FormValue("redirect_url")
	if redirectURL == "" {
		redirectURL = r.Referer()
	}
	if redirectURL == "" {
		redirectURL = "/"
	}
	providerConfig := h.oauthConfig[chi.URLParam(r, "provider")]
	state := &OauthState{
		Random:      random,
		RedirectURL: redirectURL,
	}
	authCodeURL := providerConfig.AuthCodeURL(state.String())
	http.Redirect(w, r, authCodeURL, http.StatusSeeOther)
}

// RegisterUser is an http handler used to register a user in the hub database.
func (h *Handlers) RegisterUser(w http.ResponseWriter, r *http.Request) {
	u := &hub.User{}
	err := json.NewDecoder(r.Body).Decode(&u)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "RegisterUser").Msg("invalid user")
		http.Error(w, "user provided is not valid", http.StatusBadRequest)
		return
	}
	u.EmailVerified = false
	if u.Password == "" {
		errMsg := "password not provided"
		h.logger.Error().Err(err).Str("method", "RegisterUser").Msg(errMsg)
		http.Error(w, errMsg, http.StatusBadRequest)
		return
	}
	err = h.userManager.RegisterUser(r.Context(), u, helpers.GetBaseURL(r))
	if err != nil {
		h.logger.Error().Err(err).Str("method", "RegisterUser").Send()
		if errors.Is(err, user.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
}

// registerUserWithOauth is a helper function that registers a user using the
// details from his oauth provider if he's not already registered, returning
// the user id.
func (h *Handlers) registerUserWithOauth(
	ctx context.Context,
	provider string,
	providerConfig *oauth2.Config,
	oauthToken *oauth2.Token,
) (string, error) {
	// Build user from profile from oauth provider
	var u *hub.User
	var err error
	switch provider {
	case "github":
		u, err = h.newUserFromGithubProfile(ctx, oauthToken)
	case "google":
		u, err = h.newUserFromGoogleProfile(ctx, providerConfig, oauthToken)
	}
	if err != nil {
		return "", err
	}

	// Check if user exists
	userID, err := h.userManager.GetUserID(ctx, u.Email)
	if err != nil && !errors.Is(err, user.ErrNotFound) {
		return "", err
	}

	// Register user if needed
	if userID == "" {
		u.EmailVerified = true
		err := h.userManager.RegisterUser(ctx, u, "")
		if err != nil {
			return "", err
		}
		userID, err = h.userManager.GetUserID(ctx, u.Email)
		if err != nil {
			return "", err
		}
	}

	return userID, nil
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
		checkSessionOutput, err := h.userManager.CheckSession(r.Context(), sessionID, sessionDuration)
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

// UpdatePassword is an http handler used to update the password in the hub
// database.
func (h *Handlers) UpdatePassword(w http.ResponseWriter, r *http.Request) {
	old := r.FormValue("old")
	new := r.FormValue("new")
	err := h.userManager.UpdatePassword(r.Context(), old, new)
	if err != nil {
		if errors.Is(err, user.ErrInvalidPassword) {
			http.Error(w, "", http.StatusUnauthorized)
		} else if errors.Is(err, user.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			h.logger.Error().Err(err).Str("method", "UpdatePassword").Send()
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
}

// UpdateProfile is an http handler used to update the user in the hub database.
func (h *Handlers) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	u := &hub.User{}
	err := json.NewDecoder(r.Body).Decode(&u)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "UpdateUserProfile").Msg("invalid user")
		http.Error(w, "user provided is not valid", http.StatusBadRequest)
		return
	}
	err = h.userManager.UpdateProfile(r.Context(), u)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "UpdateUserProfile").Send()
		if errors.Is(err, user.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
}

// VerifyEmail is an http handler used to verify a user's email address.
func (h *Handlers) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	code := r.FormValue("code")
	verified, err := h.userManager.VerifyEmail(r.Context(), code)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "VerifyEmail").Send()
		if errors.Is(err, user.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
	if !verified {
		w.WriteHeader(http.StatusGone)
	}
}

// OauthState represents the state of an oauth authorization session, used to
// increase the security of the process and to restore the state of the
// application.
type OauthState struct {
	Random      string
	RedirectURL string
}

// String returns an OauthState instance as a string.
func (s *OauthState) String() string {
	dataJSON, _ := json.Marshal(s)
	return base64.StdEncoding.EncodeToString(dataJSON)
}

// NewOauthState creates a new OauthState instance from the string
// representation provided.
func NewOauthState(s string) (*OauthState, error) {
	dataJSON, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}
	var state *OauthState
	if err := json.Unmarshal(dataJSON, &state); err != nil {
		return nil, err
	}
	return state, nil
}
