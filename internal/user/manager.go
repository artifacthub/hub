package user

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"image/png"
	"time"

	_ "embed" // Used by templates

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/jackc/pgx/v4"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
	"github.com/satori/uuid"
	"github.com/spf13/viper"
	pwvalidator "github.com/wagslane/go-password-validator"
	"golang.org/x/crypto/bcrypt"
)

const (
	// Database queries
	approveSessionDBQ            = `select approve_session($1::text, $2::text)`
	checkUserAliasAvailDBQ       = `select user_id from "user" where alias = $1::text`
	checkUserCredsDBQ            = `select user_id, password from "user" where email = $1 and password is not null and email_verified = true` //#nosec
	deleteSessionDBQ             = `delete from session where session_id = $1`
	deleteUserDBQ                = `select delete_user($1::uuid, $2::text)`
	disableTFADBQ                = `update "user" set tfa_enabled = false, tfa_url = null, tfa_recovery_codes = null where user_id = $1 and tfa_enabled = true`
	enableTFADBQ                 = `update "user" set tfa_enabled = true where user_id = $1`
	getSessionDBQ                = `select user_id, floor(extract(epoch from created_at)), approved from session where session_id = $1`
	getTFAConfigDBQ              = `select get_user_tfa_config($1::uuid)`
	getUserEmailDBQ              = `select email from "user" where user_id = $1`
	getUserIDFromEmailDBQ        = `select user_id from "user" where email = $1`
	getUserIDFromSessionIDDBQ    = `select user_id from session where session_id = $1`
	getUserPasswordDBQ           = `select password from "user" where user_id = $1 and password is not null`
	getUserProfileDBQ            = `select get_user_profile($1::uuid)`
	registerPasswordResetCodeDBQ = `select register_password_reset_code($1::text, $2::text)`
	registerSessionDBQ           = `select register_session($1::jsonb)`
	registerUserDBQ              = `select register_user($1::jsonb)`
	registerDeleteUserCodeDBQ    = `select register_delete_user_code($1::uuid, $2::text)`
	resetUserPasswordDBQ         = `select reset_user_password($1::text, $2::text)`
	updateTFAInfoDBQ             = `update "user" set tfa_url = $2, tfa_recovery_codes = $3 where user_id = $1`
	updateUserPasswordDBQ        = `select update_user_password($1::uuid, $2::text, $3::text)`
	updateUserProfileDBQ         = `select update_user_profile($1::uuid, $2::jsonb)`
	verifyEmailDBQ               = `select verify_email($1::uuid)`
	verifyPasswordResetCodeDBQ   = `select verify_password_reset_code($1::text)`

	numRecoveryCodes = 10
)

const (
	// PasswordMinEntropyBits represents the minimum amount of entropy bits
	// required for a password.
	PasswordMinEntropyBits = 50
)

type templateID int

const (
	confirmUserDeletionEmail templateID = iota
	passwordResetEmail
	passwordResetSuccessEmail
	tfaDisabledEmail
	tfaEnabledEmail
	userDeletedEmail
	verificationEmail
)

var (
	//go:embed template/confirm_user_deletion_email.tmpl
	confirmUserDeletionEmailTmpl string

	//go:embed template/password_reset_email.tmpl
	passwordResetEmailTmpl string

	//go:embed template/password_reset_success_email.tmpl
	passwordResetSuccessEmailTmpl string

	//go:embed template/tfa_disabled_email.tmpl
	tfaDisabledEmailTmpl string

	//go:embed template/tfa_enabled_email.tmpl
	tfaEnabledEmailTmpl string

	//go:embed template/user_deleted_email.tmpl
	userDeletedEmailTmpl string

	//go:embed template/verification_email.tmpl
	verificationEmailTmpl string
)

var (
	// ErrInvalidDeleteUserCode indicates that the delete user code provided is
	// not valid.
	ErrInvalidDeleteUserCode = errors.New("invalid delete user code")

	// ErrInvalidPassword indicates that the password provided is not valid.
	ErrInvalidPassword = errors.New("invalid password")

	// ErrInvalidPasswordResetCode indicates that the password reset code
	// provided is not valid.
	ErrInvalidPasswordResetCode = errors.New("invalid password reset code")

	// errInvalidDeleteUserCodeDB represents the error returned from the
	// database when the delete user code is not valid.
	errInvalidDeleteUserCodeDB = errors.New("ERROR: invalid delete user code (SQLSTATE P0001)")

	// errInvalidPasswordResetCodeDB represents the error returned from the
	// database when the password reset code is not valid.
	errInvalidPasswordResetCodeDB = errors.New("ERROR: invalid password reset code (SQLSTATE P0001)")

	// errInvalidTFAPasscode indicates that the TFA passcode provided is not
	// valid.
	errInvalidTFAPasscode = fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid passcode")

	// ErrNotFound indicates that the user does not exist.
	ErrNotFound = errors.New("user not found")
)

// Manager provides an API to manage users.
type Manager struct {
	cfg  *viper.Viper
	db   hub.DB
	es   hub.EmailSender
	tmpl map[templateID]*template.Template
}

// NewManager creates a new Manager instance.
func NewManager(cfg *viper.Viper, db hub.DB, es hub.EmailSender) *Manager {
	return &Manager{
		cfg: cfg,
		db:  db,
		es:  es,
		tmpl: map[templateID]*template.Template{
			confirmUserDeletionEmail:  template.Must(template.New("").Parse(email.BaseTmpl + confirmUserDeletionEmailTmpl)),
			passwordResetEmail:        template.Must(template.New("").Parse(email.BaseTmpl + passwordResetEmailTmpl)),
			passwordResetSuccessEmail: template.Must(template.New("").Parse(email.BaseTmpl + passwordResetSuccessEmailTmpl)),
			tfaDisabledEmail:          template.Must(template.New("").Parse(email.BaseTmpl + tfaDisabledEmailTmpl)),
			tfaEnabledEmail:           template.Must(template.New("").Parse(email.BaseTmpl + tfaEnabledEmailTmpl)),
			userDeletedEmail:          template.Must(template.New("").Parse(email.BaseTmpl + userDeletedEmailTmpl)),
			verificationEmail:         template.Must(template.New("").Parse(email.BaseTmpl + verificationEmailTmpl)),
		},
	}
}

// ApproveSession approves a given session using the TFA passcode provided.
func (m *Manager) ApproveSession(ctx context.Context, sessionID, passcode string) error {
	// Validate input
	if len(sessionID) == 0 {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "sessionID not provided")
	}
	if passcode == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "passcode not provided")
	}

	// Get id of the user the session belongs to
	var userID string
	err := m.db.QueryRow(ctx, getUserIDFromSessionIDDBQ, hash(sessionID)).Scan(&userID)
	if err != nil {
		return err
	}

	// Get TFA config from database
	var c *hub.TFAConfig
	if err := util.DBQueryUnmarshal(ctx, m.db, &c, getTFAConfigDBQ, userID); err != nil {
		return err
	}

	// Validate passcode provided by user
	key, err := otp.NewKeyFromURL(c.URL)
	if err != nil {
		return err
	}
	validRecoveryCodeProvided := isValidRecoveryCode(c.RecoveryCodes, passcode)
	if !(totp.Validate(passcode, key.Secret()) || validRecoveryCodeProvided) {
		return errInvalidTFAPasscode
	}

	// Approve session
	var recoveryCode string
	if validRecoveryCodeProvided {
		recoveryCode = passcode
	}
	_, err = m.db.Exec(ctx, approveSessionDBQ, hash(sessionID), recoveryCode)
	return err
}

// CheckAvailability checks the availability of a given value for the provided
// resource kind.
func (m *Manager) CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error) {
	var available bool
	var query string

	// Validate input
	validResourceKinds := []string{
		"userAlias",
	}
	isResourceKindValid := func(resourceKind string) bool {
		for _, k := range validResourceKinds {
			if resourceKind == k {
				return true
			}
		}
		return false
	}
	if !isResourceKindValid(resourceKind) {
		return available, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid resource kind")
	}
	if value == "" {
		return available, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid value")
	}

	// Check availability in database
	switch resourceKind {
	case "userAlias":
		query = checkUserAliasAvailDBQ
	}
	query = fmt.Sprintf("select not exists (%s)", query)
	err := m.db.QueryRow(ctx, query, value).Scan(&available)
	return available, err
}

// CheckCredentials checks if the credentials provided are valid.
func (m *Manager) CheckCredentials(
	ctx context.Context,
	email,
	password string,
) (*hub.CheckCredentialsOutput, error) {
	// Validate input
	if email == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "email not provided")
	}
	if password == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "password not provided")
	}

	// Get password for email provided from database
	var userID, hashedPassword string
	err := m.db.QueryRow(ctx, checkUserCredsDBQ, email).Scan(&userID, &hashedPassword)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &hub.CheckCredentialsOutput{Valid: false}, nil
		}
		return nil, err
	}

	// Check if the password provided is valid
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		return &hub.CheckCredentialsOutput{Valid: false}, nil
	}

	return &hub.CheckCredentialsOutput{
		Valid:  true,
		UserID: userID,
	}, err
}

// CheckSession checks if the user session provided is valid.
func (m *Manager) CheckSession(
	ctx context.Context,
	sessionID string,
	duration time.Duration,
) (*hub.CheckSessionOutput, error) {
	// Validate input
	if len(sessionID) == 0 {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "session id not provided")
	}
	if duration == 0 {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "duration not provided")
	}

	// Get session details from database
	var userID string
	var createdAt int64
	var approved bool
	err := m.db.QueryRow(ctx, getSessionDBQ, hash(sessionID)).Scan(&userID, &createdAt, &approved)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &hub.CheckSessionOutput{Valid: false}, nil
		}
		return nil, err
	}

	// Check if the session has expired
	if time.Unix(createdAt, 0).Add(duration).Before(time.Now()) {
		return &hub.CheckSessionOutput{Valid: false}, nil
	}

	// Check if the session is approved. When user has enabled TFA, sessions
	// need to be approved by providing a valid TFA passcode.
	if !approved {
		return &hub.CheckSessionOutput{Valid: false}, nil
	}

	return &hub.CheckSessionOutput{
		Valid:  true,
		UserID: userID,
	}, nil
}

// DeleteSession deletes a user session from the database.
func (m *Manager) DeleteSession(ctx context.Context, sessionID string) error {
	// Validate input
	if len(sessionID) == 0 {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "session id not provided")
	}

	// Delete session from database
	_, err := m.db.Exec(ctx, deleteSessionDBQ, hash(sessionID))
	return err
}

// DeleteUser deletes a user account from the database. The confirmation code
// received by the user via email is expected to be provided.
func (m *Manager) DeleteUser(ctx context.Context, code string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Delete user from database
	var userEmail string
	if err := m.db.QueryRow(ctx, deleteUserDBQ, userID, hash(code)).Scan(&userEmail); err != nil {
		if err.Error() == errInvalidDeleteUserCodeDB.Error() {
			return ErrInvalidDeleteUserCode
		}
		return err
	}

	// Notify user by email that the account has been deleted
	if m.es != nil {
		var emailBody bytes.Buffer
		if err := m.tmpl[userDeletedEmail].Execute(&emailBody, baseTemplateData(m.cfg)); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      userEmail,
			Subject: "Your account has been deleted",
			Body:    emailBody.Bytes(),
		}
		if err := m.es.SendEmail(emailData); err != nil {
			return err
		}
	}

	return nil
}

// DisableTFA disables two-factor authentication for the requesting user.
func (m *Manager) DisableTFA(ctx context.Context, passcode string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if passcode == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "passcode not provided")
	}

	// Get TFA config from database
	var c *hub.TFAConfig
	if err := util.DBQueryUnmarshal(ctx, m.db, &c, getTFAConfigDBQ, userID); err != nil {
		return err
	}

	// Validate passcode provided by user
	key, err := otp.NewKeyFromURL(c.URL)
	if err != nil {
		return err
	}
	if !(totp.Validate(passcode, key.Secret()) || isValidRecoveryCode(c.RecoveryCodes, passcode)) {
		return errInvalidTFAPasscode
	}

	// Set TFA as disabled in the database
	if _, err := m.db.Exec(ctx, disableTFADBQ, userID); err != nil {
		return err
	}

	// Notify user by email that TFA has been disabled
	if m.es != nil {
		var userEmail string
		if err := m.db.QueryRow(ctx, getUserEmailDBQ, userID).Scan(&userEmail); err != nil {
			return err
		}
		var emailBody bytes.Buffer
		if err := m.tmpl[tfaDisabledEmail].Execute(&emailBody, baseTemplateData(m.cfg)); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      userEmail,
			Subject: "Two-factor authentication disabled",
			Body:    emailBody.Bytes(),
		}
		if err := m.es.SendEmail(emailData); err != nil {
			return err
		}
	}

	return nil
}

// EnableTFA enables two-factor authentication for the requesting user. The
// user must have set it up first (see SetupTFA method).
func (m *Manager) EnableTFA(ctx context.Context, passcode string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if passcode == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "passcode not provided")
	}

	// Get TFA config from database
	var c *hub.TFAConfig
	if err := util.DBQueryUnmarshal(ctx, m.db, &c, getTFAConfigDBQ, userID); err != nil {
		return err
	}

	// Validate passcode provided by user
	key, err := otp.NewKeyFromURL(c.URL)
	if err != nil {
		return err
	}
	if !totp.Validate(passcode, key.Secret()) {
		return errInvalidTFAPasscode
	}

	// Set TFA as enabled in the database
	if _, err := m.db.Exec(ctx, enableTFADBQ, userID); err != nil {
		return err
	}

	// Notify user by email that TFA has been enabled
	if m.es != nil {
		var userEmail string
		if err := m.db.QueryRow(ctx, getUserEmailDBQ, userID).Scan(&userEmail); err != nil {
			return err
		}
		var emailBody bytes.Buffer
		if err := m.tmpl[tfaEnabledEmail].Execute(&emailBody, baseTemplateData(m.cfg)); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      userEmail,
			Subject: "Two-factor authentication enabled",
			Body:    emailBody.Bytes(),
		}
		if err := m.es.SendEmail(emailData); err != nil {
			return err
		}
	}

	return nil
}

// GetProfile returns the profile of the user doing the request.
func (m *Manager) GetProfile(ctx context.Context) (*hub.User, error) {
	dataJSON, err := m.GetProfileJSON(ctx)
	if err != nil {
		return nil, err
	}
	u := &hub.User{}
	if err := json.Unmarshal(dataJSON, &u); err != nil {
		return nil, err
	}
	return u, nil
}

// GetProfileJSON returns the profile of the user doing the request as a json
// object.
func (m *Manager) GetProfileJSON(ctx context.Context) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	var profile []byte
	err := m.db.QueryRow(ctx, getUserProfileDBQ, userID).Scan(&profile)
	return profile, err
}

// GetUserID returns the id of the user with the email provided.
func (m *Manager) GetUserID(ctx context.Context, email string) (string, error) {
	// Validate input
	if email == "" {
		return "", fmt.Errorf("%w: %s", hub.ErrInvalidInput, "email not provided")
	}

	// Get user id from database
	var userID string
	err := m.db.QueryRow(ctx, getUserIDFromEmailDBQ, email).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	return userID, nil
}

// RegisterDeleteUserCode registers a code that allows the user doing the
// request to initiate the process to delete his account. A link containing the
// code will be emailed to the user.
func (m *Manager) RegisterDeleteUserCode(ctx context.Context) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Register delete user code in database
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return err
	}
	code := base64.URLEncoding.EncodeToString(randomBytes)
	_, err := m.db.Exec(ctx, registerDeleteUserCodeDBQ, userID, hash(code))
	if err != nil {
		return err
	}

	// Send account deletion confirmation email
	if m.es != nil {
		var userEmail string
		if err := m.db.QueryRow(ctx, getUserEmailDBQ, userID).Scan(&userEmail); err != nil {
			return err
		}
		templateData := baseTemplateData(m.cfg)
		templateData["Link"] = fmt.Sprintf("%s/delete-user?code=%s", templateData["BaseURL"], code)
		var emailBody bytes.Buffer
		if err := m.tmpl[confirmUserDeletionEmail].Execute(&emailBody, templateData); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      userEmail,
			Subject: "Confirm account deletion",
			Body:    emailBody.Bytes(),
		}
		if err := m.es.SendEmail(emailData); err != nil {
			return err
		}
	}

	return nil
}

// RegisterPasswordResetCode registers a code that allows the user identified
// by the email provided to reset the password. A link containing the code will
// be emailed to the user to initiate the password reset process.
func (m *Manager) RegisterPasswordResetCode(ctx context.Context, userEmail string) error {
	// Validate input
	if userEmail == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "email not provided")
	}

	// Register password reset code in database
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return err
	}
	code := base64.URLEncoding.EncodeToString(randomBytes)
	_, err := m.db.Exec(ctx, registerPasswordResetCodeDBQ, userEmail, hash(code))
	if err != nil {
		return err
	}

	// Send password reset email
	if m.es != nil {
		templateData := baseTemplateData(m.cfg)
		templateData["Link"] = fmt.Sprintf("%s/reset-password?code=%s", templateData["BaseURL"], code)
		var emailBody bytes.Buffer
		if err := m.tmpl[passwordResetEmail].Execute(&emailBody, templateData); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      userEmail,
			Subject: "Password reset",
			Body:    emailBody.Bytes(),
		}
		if err := m.es.SendEmail(emailData); err != nil {
			return err
		}
	}

	return nil
}

// RegisterSession registers a user session in the database.
func (m *Manager) RegisterSession(ctx context.Context, session *hub.Session) (*hub.Session, error) {
	// Validate input
	if session.UserID == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "user id not provided")
	}
	if _, err := uuid.FromString(session.UserID); err != nil {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid user id")
	}

	// Generate session id
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return nil, err
	}
	sessionID := base64.StdEncoding.EncodeToString(randomBytes)
	sessionIDHashed := hash(sessionID)

	// Register session in database
	session.SessionID = sessionIDHashed
	sessionJSON, _ := json.Marshal(session)
	var approved bool
	err := m.db.QueryRow(ctx, registerSessionDBQ, sessionJSON).Scan(&approved)
	if err != nil {
		return nil, err
	}

	return &hub.Session{
		SessionID: sessionID,
		UserID:    session.UserID,
		Approved:  approved,
	}, nil
}

// RegisterUser registers the user provided in the database. When the user is
// registered a verification email will be sent to the email address provided.
// The base url provided will be used to build the url the user will need to
// click to complete the verification. When a user is registered using oauth,
// the email is verified automatically and no email is sent.
func (m *Manager) RegisterUser(ctx context.Context, user *hub.User) error {
	// Validate input
	if user.Alias == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "alias not provided")
	}
	if user.Email == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "email not provided")
	}
	if user.ProfileImageID != "" {
		if _, err := uuid.FromString(user.ProfileImageID); err != nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid profile image id")
		}
	}
	if !user.EmailVerified {
		if err := pwvalidator.Validate(user.Password, PasswordMinEntropyBits); err != nil {
			return fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
		}
	}

	// Hash password
	if user.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		user.Password = string(hashedPassword)
	}

	// Register user in database
	userJSON, _ := json.Marshal(user)
	var code *string
	err := m.db.QueryRow(ctx, registerUserDBQ, userJSON).Scan(&code)
	if err != nil {
		return err
	}

	// Send email verification code
	if code != nil && m.es != nil {
		templateData := baseTemplateData(m.cfg)
		templateData["Link"] = fmt.Sprintf("%s/verify-email?code=%s", templateData["BaseURL"], *code)
		var emailBody bytes.Buffer
		if err := m.tmpl[verificationEmail].Execute(&emailBody, templateData); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      user.Email,
			Subject: "Verify your email address",
			Body:    emailBody.Bytes(),
		}
		if err := m.es.SendEmail(emailData); err != nil {
			return err
		}
	}

	return nil
}

// ResetPassword resets the user password in the database.
func (m *Manager) ResetPassword(ctx context.Context, code, newPassword string) error {
	// Validate input
	if code == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "code not provided")
	}
	if newPassword == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "new password not provided")
	}
	if err := pwvalidator.Validate(newPassword, PasswordMinEntropyBits); err != nil {
		return fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
	}

	// Hash new password
	newHashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Reset user password in database
	var userEmail string
	err = m.db.QueryRow(ctx, resetUserPasswordDBQ, hash(code), string(newHashed)).Scan(&userEmail)
	if err != nil {
		if err.Error() == errInvalidPasswordResetCodeDB.Error() {
			return ErrInvalidPasswordResetCode
		}
		return err
	}

	// Send password reset success email
	if m.es != nil {
		templateData := baseTemplateData(m.cfg)
		var emailBody bytes.Buffer
		if err := m.tmpl[passwordResetSuccessEmail].Execute(&emailBody, templateData); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      userEmail,
			Subject: "Your password has been reset",
			Body:    emailBody.Bytes(),
		}
		if err := m.es.SendEmail(emailData); err != nil {
			return err
		}
	}

	return nil
}

// SetupTFA sets up two-factor authentication for the requesting user. This
// generates a new TOTP key and some recovery codes for the user and stores
// them in the database. To complete the process, the user must enable TFA
// (see EnableTFA method).
func (m *Manager) SetupTFA(ctx context.Context) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Get requesting user email
	var userEmail string
	if err := m.db.QueryRow(ctx, getUserEmailDBQ, userID).Scan(&userEmail); err != nil {
		return nil, err
	}

	// Generate TOTP key
	opts := totp.GenerateOpts{
		Issuer:      m.cfg.GetString("theme.siteName"),
		AccountName: userEmail,
	}
	key, err := totp.Generate(opts)
	if err != nil {
		return nil, err
	}

	// Generate recovery codes
	recoveryCodes := make([]string, 0, numRecoveryCodes)
	for i := 0; i < numRecoveryCodes; i++ {
		code := uuid.NewV4().String()
		recoveryCodes = append(recoveryCodes, code)
	}

	// Store TOTP key and recovery codes in database
	_, err = m.db.Exec(ctx, updateTFAInfoDBQ, userID, key.URL(), recoveryCodes)
	if err != nil {
		return nil, err
	}

	// Prepare output with QR-Code image, recovery codes and secret
	var buf bytes.Buffer
	img, err := key.Image(300, 300)
	if err != nil {
		return nil, err
	}
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	base64Img := base64.StdEncoding.EncodeToString(buf.Bytes())
	output := &hub.SetupTFAOutput{
		QRCode:        fmt.Sprintf("data:image/png;base64,%s", base64Img),
		RecoveryCodes: recoveryCodes,
		Secret:        key.Secret(),
	}
	return json.Marshal(output)
}

// UpdatePassword updates the user password in the database.
func (m *Manager) UpdatePassword(ctx context.Context, old, new string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if old == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "old password not provided")
	}
	if new == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "new password not provided")
	}
	if err := pwvalidator.Validate(new, PasswordMinEntropyBits); err != nil {
		return fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
	}

	// Validate old password
	var oldHashed string
	err := m.db.QueryRow(ctx, getUserPasswordDBQ, userID).Scan(&oldHashed)
	if err != nil {
		return err
	}
	err = bcrypt.CompareHashAndPassword([]byte(oldHashed), []byte(old))
	if err != nil {
		return ErrInvalidPassword
	}

	// Hash new password
	newHashed, err := bcrypt.GenerateFromPassword([]byte(new), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update user password in database
	_, err = m.db.Exec(ctx, updateUserPasswordDBQ, userID, oldHashed, string(newHashed))
	return err
}

// UpdateProfile updates the user profile in the database.
func (m *Manager) UpdateProfile(ctx context.Context, user *hub.User) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if user.Alias == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "alias not provided")
	}
	if user.ProfileImageID != "" {
		if _, err := uuid.FromString(user.ProfileImageID); err != nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid profile image id")
		}
	}

	// Update user profile in database
	userJSON, _ := json.Marshal(user)
	_, err := m.db.Exec(ctx, updateUserProfileDBQ, userID, userJSON)
	return err
}

// VerifyEmail verifies a user's email using the email verification code
// provided.
func (m *Manager) VerifyEmail(ctx context.Context, code string) (bool, error) {
	var verified bool

	// Validate input
	if code == "" {
		return verified, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "code not provided")
	}

	// Verify email in database
	err := m.db.QueryRow(ctx, verifyEmailDBQ, code).Scan(&verified)
	return verified, err
}

// VerifyPasswordResetCode verifies if the provided code is valid.
func (m *Manager) VerifyPasswordResetCode(ctx context.Context, code string) error {
	// Validate input
	if code == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "code not provided")
	}

	// Verify password reset code in database
	_, err := m.db.Exec(ctx, verifyPasswordResetCodeDBQ, hash(code))
	if err != nil && err.Error() == errInvalidPasswordResetCodeDB.Error() {
		return ErrInvalidPasswordResetCode
	}
	return err
}

// hash is a helper function that creates a sha512 hash of the text provided.
func hash(text string) string {
	return fmt.Sprintf("%x", sha512.Sum512([]byte(text)))
}

// isValidRecoveryCode checks if the code provided is a valid recovery code.
func isValidRecoveryCode(recoveryCodes []string, code string) bool {
	for _, recoveryCode := range recoveryCodes {
		if recoveryCode == code {
			return true
		}
	}
	return false
}

// baseTemplateData creates a new base template data from the configuration
// provided.
func baseTemplateData(cfg *viper.Viper) map[string]interface{} {
	return map[string]interface{}{
		"BaseURL": cfg.GetString("server.baseURL"),
		"Theme": map[string]string{
			"PrimaryColor":   cfg.GetString("theme.colors.primary"),
			"SecondaryColor": cfg.GetString("theme.colors.secondary"),
			"SiteName":       cfg.GetString("theme.siteName"),
		},
	}
}
