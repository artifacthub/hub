package hub

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/artifacthub/hub/internal/email"
	"github.com/jackc/pgconn"
	"github.com/jackc/pgx/v4"
	"golang.org/x/crypto/bcrypt"
)

// DB defines the methods the database handler must provide.
type DB interface {
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
	Exec(ctx context.Context, sql string, arguments ...interface{}) (pgconn.CommandTag, error)
}

// EmailSender defines the methods the email sender must provide.
type EmailSender interface {
	SendEmail(data *email.Data) error
}

// Hub provides an API to manage repositories, packages, etc.
type Hub struct {
	db DB
	es EmailSender
}

// New creates a new Hub instance.
func New(db DB, es EmailSender) *Hub {
	return &Hub{
		db: db,
		es: es,
	}
}

// GetChartRepositoryByName returns the chart repository identified by the name
// provided.
func (h *Hub) GetChartRepositoryByName(ctx context.Context, name string) (*ChartRepository, error) {
	var r *ChartRepository
	err := h.dbQueryUnmarshal(ctx, &r, "select get_chart_repository_by_name($1::text)", name)
	return r, err
}

// GetChartRepositoryPackagesDigest returns the digests for all packages in the
// repository identified by the id provided.
func (h *Hub) GetChartRepositoryPackagesDigest(
	ctx context.Context,
	chartRepositoryID string,
) (map[string]string, error) {
	pd := make(map[string]string)
	query := "select get_chart_repository_packages_digest($1::uuid)"
	err := h.dbQueryUnmarshal(ctx, &pd, query, chartRepositoryID)
	return pd, err
}

// GetChartRepositories returns all available chart repositories.
func (h *Hub) GetChartRepositories(ctx context.Context) ([]*ChartRepository, error) {
	var r []*ChartRepository
	err := h.dbQueryUnmarshal(ctx, &r, "select get_chart_repositories()")
	return r, err
}

// GetUserChartRepositoriesJSON returns all chart repositories that belong to
// the user making the request.
func (h *Hub) GetUserChartRepositoriesJSON(ctx context.Context) ([]byte, error) {
	query := "select get_user_chart_repositories($1::uuid)"
	userID := ctx.Value(UserIDKey).(string)
	return h.dbQueryJSON(ctx, query, userID)
}

// GetOrgChartRepositoriesJSON returns all chart repositories that belong to
// the user making the request.
func (h *Hub) GetOrgChartRepositoriesJSON(ctx context.Context, orgName string) ([]byte, error) {
	query := "select get_org_chart_repositories($1::uuid, $2::text)"
	userID := ctx.Value(UserIDKey).(string)
	return h.dbQueryJSON(ctx, query, userID, orgName)
}

// AddChartRepository adds the provided chart repository to the database.
func (h *Hub) AddChartRepository(ctx context.Context, orgName string, r *ChartRepository) error {
	query := "select add_chart_repository($1::uuid, $2::text, $3::jsonb)"
	userID := ctx.Value(UserIDKey).(string)
	rJSON, _ := json.Marshal(r)
	_, err := h.db.Exec(ctx, query, userID, orgName, rJSON)
	return err
}

// UpdateChartRepository updates the provided chart repository in the database.
func (h *Hub) UpdateChartRepository(ctx context.Context, r *ChartRepository) error {
	query := "select update_chart_repository($1::uuid, $2::jsonb)"
	userID := ctx.Value(UserIDKey).(string)
	rJSON, _ := json.Marshal(r)
	_, err := h.db.Exec(ctx, query, userID, rJSON)
	return err
}

// DeleteChartRepository deletes the provided chart repository from the
// database.
func (h *Hub) DeleteChartRepository(ctx context.Context, name string) error {
	query := "select delete_chart_repository($1::uuid, $2::text)"
	userID := ctx.Value(UserIDKey).(string)
	_, err := h.db.Exec(ctx, query, userID, name)
	return err
}

// SetChartRepositoryLastTrackingResults updates the timestamp and errors of
// the last tracking of the provided repository in the database.
func (h *Hub) SetChartRepositoryLastTrackingResults(ctx context.Context, chartRepositoryID, errs string) error {
	query := `
	update chart_repository set
		last_tracking_ts = current_timestamp,
		last_tracking_errors = nullif($2, '')
	where chart_repository_id = $1`
	_, err := h.db.Exec(ctx, query, chartRepositoryID, errs)
	return err
}

// GetPackagesStatsJSON returns a json object describing the number of packages
// and releases available in the database. The json object is built by the
// database.
func (h *Hub) GetPackagesStatsJSON(ctx context.Context) ([]byte, error) {
	return h.dbQueryJSON(ctx, "select get_packages_stats()")
}

// SearchPackagesJSON returns a json object with the search results produced by
// the input provided. The json object is built by the database.
func (h *Hub) SearchPackagesJSON(ctx context.Context, input *SearchPackageInput) ([]byte, error) {
	inputJSON, _ := json.Marshal(input)
	return h.dbQueryJSON(ctx, "select search_packages($1::jsonb)", inputJSON)
}

// RegisterPackage registers the package provided in the database.
func (h *Hub) RegisterPackage(ctx context.Context, pkg *Package) error {
	return h.dbExec(ctx, "select register_package($1::jsonb)", pkg)
}

// GetPackageJSON returns the package identified by the input provided as a
// json object. The json object is built by the database.
func (h *Hub) GetPackageJSON(ctx context.Context, input *GetPackageInput) ([]byte, error) {
	inputJSON, _ := json.Marshal(input)
	return h.dbQueryJSON(ctx, "select get_package($1::jsonb)", inputJSON)
}

// GetPackagesUpdatesJSON returns a json object with the latest packages added
// as well as those which have been updated more recently. The json object is
// built by the database.
func (h *Hub) GetPackagesUpdatesJSON(ctx context.Context) ([]byte, error) {
	return h.dbQueryJSON(ctx, "select get_packages_updates()")
}

// RegisterUser registers the user provided in the database. When the user is
// registered a verification email will be sent to the email address provided.
// The base url provided will be used to build the url the user will need to
// click to complete the verification.
func (h *Hub) RegisterUser(ctx context.Context, user *User, baseURL string) error {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.Password = string(hashedPassword)

	// Register user in database
	userJSON, _ := json.Marshal(user)
	var code string
	err = h.db.QueryRow(ctx, "select register_user($1::jsonb)", userJSON).Scan(&code)
	if err != nil {
		return err
	}

	// Send email verification code
	if h.es != nil {
		templateData := map[string]string{
			"link": fmt.Sprintf("%s/verify-email?code=%s", baseURL, code),
		}
		var emailBody bytes.Buffer
		if err := emailVerificationTmpl.Execute(&emailBody, templateData); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      user.Email,
			Subject: "Verify your email address",
			Body:    emailBody.Bytes(),
		}
		if err := h.es.SendEmail(emailData); err != nil {
			return err
		}
	}

	return nil
}

// VerifyEmail verifies a user's email using the email verification code
// provided.
func (h *Hub) VerifyEmail(ctx context.Context, code string) (bool, error) {
	var verified bool
	err := h.db.QueryRow(ctx, "select verify_email($1::uuid)", code).Scan(&verified)
	return verified, err
}

// CheckCredentials checks if the credentials provided are valid.
func (h *Hub) CheckCredentials(ctx context.Context, email, password string) (*CheckCredentialsOutput, error) {
	// Get password for email provided from database
	var userID, hashedPassword string
	query := `select user_id, password from "user" where email = $1`
	err := h.db.QueryRow(ctx, query, email).Scan(&userID, &hashedPassword)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &CheckCredentialsOutput{Valid: false}, nil
		}
		return nil, err
	}

	// Check if the password provided is valid
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		return &CheckCredentialsOutput{Valid: false}, nil
	}

	return &CheckCredentialsOutput{
		Valid:  true,
		UserID: userID,
	}, err
}

// RegisterSession registers a user session in the database.
func (h *Hub) RegisterSession(ctx context.Context, session *Session) ([]byte, error) {
	sessionJSON, _ := json.Marshal(session)
	var sessionID []byte
	err := h.db.QueryRow(ctx, "select register_session($1::jsonb)", sessionJSON).Scan(&sessionID)
	return sessionID, err
}

// CheckSession checks if the user session provided is valid.
func (h *Hub) CheckSession(ctx context.Context, sessionID []byte, duration time.Duration) (*CheckSessionOutput, error) {
	// Get session details from database
	var userID string
	var createdAt int64
	query := `
	select user_id, floor(extract(epoch from created_at))
	from session where session_id = $1
	`
	err := h.db.QueryRow(ctx, query, sessionID).Scan(&userID, &createdAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &CheckSessionOutput{Valid: false}, nil
		}
		return nil, err
	}

	// Check if the session has expired
	if time.Unix(createdAt, 0).Add(duration).Before(time.Now()) {
		return &CheckSessionOutput{Valid: false}, nil
	}

	return &CheckSessionOutput{
		Valid:  true,
		UserID: userID,
	}, nil
}

// DeleteSession deletes a user session from the database.
func (h *Hub) DeleteSession(ctx context.Context, sessionID []byte) error {
	_, err := h.db.Exec(ctx, "delete from session where session_id = $1", sessionID)
	return err
}

// GetUserAlias returns the alias of the user doing the request.
func (h *Hub) GetUserAlias(ctx context.Context) (string, error) {
	userID := ctx.Value(UserIDKey).(string)
	var alias string
	err := h.db.QueryRow(ctx, `select alias from "user" where user_id = $1`, userID).Scan(&alias)
	return alias, err
}

// GetUserOrganizationsJSON returns the organizations the user doing the
// request belongs to as a json object.
func (h *Hub) GetUserOrganizationsJSON(ctx context.Context) ([]byte, error) {
	query := "select get_user_organizations($1::uuid)"
	userID := ctx.Value(UserIDKey).(string)
	return h.dbQueryJSON(ctx, query, userID)
}

// AddOrganization adds the provided organization to the database.
func (h *Hub) AddOrganization(ctx context.Context, org *Organization) error {
	query := "select add_organization($1::uuid, $2::jsonb)"
	userID := ctx.Value(UserIDKey).(string)
	orgJSON, _ := json.Marshal(org)
	_, err := h.db.Exec(ctx, query, userID, orgJSON)
	return err
}

// UpdateOrganization updates the provided organization in the database.
func (h *Hub) UpdateOrganization(ctx context.Context, org *Organization) error {
	query := "select update_organization($1::uuid, $2::jsonb)"
	userID := ctx.Value(UserIDKey).(string)
	orgJSON, _ := json.Marshal(org)
	_, err := h.db.Exec(ctx, query, userID, orgJSON)
	return err
}

// GetOrganizationMembersJSON returns the members of the provided organization
// as a json object.
func (h *Hub) GetOrganizationMembersJSON(ctx context.Context, orgName string) ([]byte, error) {
	query := "select get_organization_members($1::uuid, $2::text)"
	userID := ctx.Value(UserIDKey).(string)
	return h.dbQueryJSON(ctx, query, userID, orgName)
}

// AddOrganizationMember adds a new member to the provided organization. The
// new member must be a registered user. The user will receive an email to
// confirm her willingness to join the organization. The user doing the request
// must be a member of the organization.
func (h *Hub) AddOrganizationMember(ctx context.Context, orgName, userAlias, baseURL string) error {
	query := "select add_organization_member($1::uuid, $2::text, $3::text)"
	userID := ctx.Value(UserIDKey).(string)
	_, err := h.db.Exec(ctx, query, userID, orgName, userAlias)
	if err != nil {
		return err
	}

	// Send organization invitation email
	if h.es != nil {
		var userEmail string
		query := `select email from "user" where alias = $1`
		if err := h.db.QueryRow(ctx, query, userAlias).Scan(&userEmail); err != nil {
			return err
		}
		templateData := map[string]string{
			"link":    fmt.Sprintf("%s/accept-invitation?org=%s", baseURL, orgName),
			"orgName": orgName,
		}
		var emailBody bytes.Buffer
		if err := organizationInvitationTmpl.Execute(&emailBody, templateData); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      userEmail,
			Subject: fmt.Sprintf("Invitation to join %s on Artifact Hub", orgName),
			Body:    emailBody.Bytes(),
		}
		if err := h.es.SendEmail(emailData); err != nil {
			return err
		}
	}

	return nil
}

// ConfirmOrganizationMembership confirms the user doing the request membership
// to the provided organization.
func (h *Hub) ConfirmOrganizationMembership(ctx context.Context, orgName string) error {
	query := "select confirm_organization_membership($1::uuid, $2::text)"
	userID := ctx.Value(UserIDKey).(string)
	_, err := h.db.Exec(ctx, query, userID, orgName)
	return err
}

// DeleteOrganizationMember removes a member from the provided organization.
// The user doing the request must be a member of the organization.
func (h *Hub) DeleteOrganizationMember(ctx context.Context, orgName, userAlias string) error {
	query := "select delete_organization_member($1::uuid, $2::text, $3::text)"
	userID := ctx.Value(UserIDKey).(string)
	_, err := h.db.Exec(ctx, query, userID, orgName, userAlias)
	return err
}

// CheckAvailability checks the availability of a given value for the provided
// resource kind.
func (h *Hub) CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error) {
	var available bool
	var query string

	switch resourceKind {
	case "userAlias":
		query = `select user_id from "user" where alias = $1`
	case "chartRepositoryName":
		query = `select chart_repository_id from chart_repository where name = $1`
	case "chartRepositoryURL":
		query = `select chart_repository_id from chart_repository where url = $1`
	case "organizationName":
		query = `select organization_id from organization where name = $1`
	default:
		return false, errors.New("resource kind not supported")
	}

	query = fmt.Sprintf("select not exists (%s)", query)
	err := h.db.QueryRow(ctx, query, value).Scan(&available)
	return available, err
}

// dbQueryJSON is a helper that executes the query provided and returns a bytes
// slice containing the json data returned from the database.
func (h *Hub) dbQueryJSON(ctx context.Context, query string, args ...interface{}) ([]byte, error) {
	var jsonData []byte
	if err := h.db.QueryRow(ctx, query, args...).Scan(&jsonData); err != nil {
		return nil, err
	}
	return jsonData, nil
}

// dbQueryUnmarshal is a helper that executes the query provided and unmarshals
// the json data returned from the database into the value (v) provided.
func (h *Hub) dbQueryUnmarshal(ctx context.Context, v interface{}, query string, args ...interface{}) error {
	jsonData, err := h.dbQueryJSON(ctx, query, args...)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(jsonData, &v); err != nil {
		return err
	}
	return nil
}

// dbExec is a helper that executes the query provided encoding the argument as
// json.
func (h *Hub) dbExec(ctx context.Context, query string, arg interface{}) error {
	jsonArg, err := json.Marshal(arg)
	if err != nil {
		return err
	}
	_, err = h.db.Exec(ctx, query, jsonArg)
	return err
}
