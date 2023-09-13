package authz

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/jackc/pgx/v4"
	"github.com/open-policy-agent/opa/ast"
	"github.com/open-policy-agent/opa/rego"
	"github.com/open-policy-agent/opa/storage/inmem"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

const (
	// AllowedActionsQuery represents the authorization's policy query used to
	// get the actions a given user is allowed to perform.
	AllowedActionsQuery = "data.artifacthub.authz.allowed_actions"

	// Database queries
	getAuthzPoliciesDBQ = `select get_authorization_policies()`
	getUserAliasDBQ     = `select alias from "user" where user_id = $1`

	pauseOnError = 10 * time.Second
)

var (
	// AllowedActionsQueryRef represents a reference to AllowedActionsQuery.
	AllowedActionsQueryRef = ast.MustParseRef(AllowedActionsQuery)

	validPredefinedPolicies = []string{
		"rbac.v1",
	}

	policyMgmtActions = []hub.Action{
		hub.GetAuthorizationPolicy,
		hub.UpdateAuthorizationPolicy,
	}

	// Unsafe rego built-ins (to disable them)
	unsafeRegoBuiltins = map[string]struct{}{ast.HTTPSend.Name: {}}
)

// Authorizer is in charge of authorizing actions that users intend to perform.
type Authorizer struct {
	db     hub.DB
	logger zerolog.Logger

	mu                    sync.RWMutex
	allowedActionsQueries map[string]rego.PreparedEvalQuery
}

// NewAuthorizer creates a new Authorizer instance.
func NewAuthorizer(db hub.DB) (*Authorizer, error) {
	a := &Authorizer{
		db:                    db,
		logger:                log.With().Str("svc", "authorizer").Logger(),
		allowedActionsQueries: make(map[string]rego.PreparedEvalQuery),
	}

	// Prepare policies queries and setup a database listener so that they are
	// updated when the database notifies us that they have changed
	if err := a.preparePoliciesQueries(); err != nil {
		return nil, err
	}
	go a.listenForPoliciesUpdates()

	return a, nil
}

// preparePoliciesQueries prepares the policies queries.
func (a *Authorizer) preparePoliciesQueries() error {
	a.logger.Info().Msg("preparing policies queries")

	// Get organizations authorization policies from database
	var policiesJSON []byte
	err := a.db.QueryRow(context.Background(), getAuthzPoliciesDBQ).Scan(&policiesJSON)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("error getting authorization policies: %w", err)
	}
	var policies map[string]*hub.AuthorizationPolicy
	if policiesJSON != nil {
		if err := json.Unmarshal(policiesJSON, &policies); err != nil {
			return fmt.Errorf("error unmarshaling authorization policies: %w", err)
		}
	}

	// Prepare authorization policies queries
	allowedActionsQueries := make(map[string]rego.PreparedEvalQuery)
	for organizationName, policy := range policies {
		if !policy.AuthorizationEnabled {
			continue
		}
		var rules string
		if policy.PredefinedPolicy != "" {
			rules = predefinedPolicies[policy.PredefinedPolicy]
		} else {
			rules = policy.CustomPolicy
		}
		allowedActionsPreparedEvalQuery, err := rego.New(
			rego.Query(AllowedActionsQuery),
			rego.Module(fmt.Sprintf("%s.rego", organizationName), rules),
			rego.Store(inmem.NewFromReader(bytes.NewBuffer(policy.PolicyData))),
			rego.UnsafeBuiltins(unsafeRegoBuiltins),
		).PrepareForEval(context.Background())
		if err == nil {
			allowedActionsQueries[organizationName] = allowedActionsPreparedEvalQuery
		}
	}

	a.mu.Lock()
	a.allowedActionsQueries = allowedActionsQueries
	a.mu.Unlock()

	return nil
}

// listenForPoliciesUpdates listens for database notifications sent when the
// organizations authorizations policies are updated, preparing again the
// policies queries.
func (a *Authorizer) listenForPoliciesUpdates() {
	for {
		conn, err := a.db.Acquire(context.Background())
		if err != nil {
			a.logger.Error().Err(err).Msg("error acquiring database connection")
			time.Sleep(pauseOnError)
			continue
		}
		_, err = conn.Exec(context.Background(), "listen authorization_policies_updated")
		if err != nil {
			a.logger.Error().Err(err).Msg("error listening to notifications channel")
			time.Sleep(pauseOnError)
			continue
		}
		for {
			if _, err := conn.Conn().WaitForNotification(context.Background()); err != nil {
				log.Error().Err(err).Msg("error waiting for notification")
				break
			}
			if err := a.preparePoliciesQueries(); err != nil {
				log.Error().Err(err).Send()
			}
		}
	}
}

// Authorize allows or denies if an action can be performed based on the input
// provided and the organization authorization policy. It queries the policy
// for all the actions the user is allowed to perform and checks if the action
// provided in the input is in that list.
func (a *Authorizer) Authorize(ctx context.Context, input *hub.AuthorizeInput) error {
	allowedActions, err := a.GetAllowedActions(ctx, input.UserID, input.OrganizationName)
	if err != nil {
		return fmt.Errorf("%w: error getting allowed actions: %w", hub.ErrInsufficientPrivilege, err)
	}
	if !IsActionAllowed(allowedActions, input.Action) {
		return hub.ErrInsufficientPrivilege
	}
	return nil
}

// GetAllowedActions returns the actions a given user is allowed to perform in
// the provided organization. We'll obtain them querying the organization
// authorization policy.
func (a *Authorizer) GetAllowedActions(ctx context.Context, userID, orgName string) ([]hub.Action, error) {
	// Get authorization policy allowed actions query
	a.mu.RLock()
	query, ok := a.allowedActionsQueries[orgName]
	if !ok {
		// If the organization hasn't defined an authorization policy yet, the
		// user is allowed to perform all actions available in the organizations
		// he belongs to.
		a.mu.RUnlock()
		return []hub.Action{"all"}, nil
	}
	a.mu.RUnlock()

	// Get user alias to provide it to the query as input
	userAlias, err := a.getUserAlias(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Evaluate authorization policy allowed actions query
	queryInput := map[string]interface{}{
		"user": userAlias,
	}
	results, err := query.Eval(ctx, rego.EvalInput(queryInput))
	if err != nil {
		return nil, err
	} else if len(results) != 1 || len(results[0].Expressions) != 1 {
		return nil, errors.New("allowed actions query returned no results")
	}

	// Prepare allowed actions and return them
	values, ok := results[0].Expressions[0].Value.([]interface{})
	if !ok {
		return nil, errors.New("invalid allowed actions output")
	}
	allowedActions := make([]hub.Action, 0, len(values))
	for _, v := range values {
		action, ok := v.(string)
		if !ok {
			return nil, errors.New("invalid allowed action value")
		}
		allowedActions = append(allowedActions, hub.Action(action))
	}
	return allowedActions, nil
}

// WillUserBeLockedOut checks if the user will be locked out if the new policy
// provided is applied to the organization.
func (a *Authorizer) WillUserBeLockedOut(
	ctx context.Context,
	newPolicy *hub.AuthorizationPolicy,
	userID string,
) (bool, error) {
	// Get user alias to provide it to the query as input
	userAlias, err := a.getUserAlias(ctx, userID)
	if err != nil {
		return true, err
	}

	// Prepare policy rules and data
	var rules string
	if newPolicy.PredefinedPolicy != "" {
		rules = predefinedPolicies[newPolicy.PredefinedPolicy]
	} else {
		rules = newPolicy.CustomPolicy
	}
	policyDataJSON, _ := strconv.Unquote(string(newPolicy.PolicyData))

	// Prepare policy query and evaluate it to get the actions the user will be
	// allowed to perform with it
	allowedActionsPreparedEvalQuery, err := rego.New(
		rego.Query(AllowedActionsQuery),
		rego.Module("", rules),
		rego.Store(inmem.NewFromReader(bytes.NewBufferString(policyDataJSON))),
		rego.UnsafeBuiltins(unsafeRegoBuiltins),
	).PrepareForEval(context.Background())
	if err != nil {
		return true, err
	}
	queryInput := map[string]interface{}{
		"user": userAlias,
	}
	results, err := allowedActionsPreparedEvalQuery.Eval(ctx, rego.EvalInput(queryInput))
	if err != nil {
		return true, err
	} else if len(results) != 1 || len(results[0].Expressions) != 1 {
		return true, err
	}
	values, ok := results[0].Expressions[0].Value.([]interface{})
	if !ok {
		return true, nil
	}
	allowedActions := make([]hub.Action, 0, len(values))
	for _, v := range values {
		action, ok := v.(string)
		if !ok {
			return true, nil
		}
		allowedActions = append(allowedActions, hub.Action(action))
	}

	// Check if the actions required to manage the policy will be allowed using
	// the new policy provided
	if !AreActionsAllowed(allowedActions, policyMgmtActions) {
		return true, nil
	}

	return false, nil
}

// getUserAlias is a helper function that returns the alias of a user
// identified by the ID provided.
func (a *Authorizer) getUserAlias(ctx context.Context, userID string) (string, error) {
	var userAlias string
	if err := a.db.QueryRow(ctx, getUserAliasDBQ, userID).Scan(&userAlias); err != nil {
		return "", err
	}
	return userAlias, nil
}

// IsPredefinedPolicyValid checks if the provided predefined policy is valid.
func IsPredefinedPolicyValid(predefinedPolicy string) bool {
	for _, validPredefinedPolicy := range validPredefinedPolicies {
		if predefinedPolicy == validPredefinedPolicy {
			return true
		}
	}
	return false
}

// IsActionAllowed checks if a given action is allowed checking against the
// list of allowed actions provided.
func IsActionAllowed(allowedActions []hub.Action, action hub.Action) bool {
	for _, allowedAction := range allowedActions {
		if allowedAction == hub.Action("all") || allowedAction == action {
			return true
		}
	}
	return false
}

// AreActionsAllowed checks if a given list of actions are allowed checking
// against the list of allowed actions provided.
func AreActionsAllowed(allowedActions, actions []hub.Action) bool {
	for _, action := range actions {
		if !IsActionAllowed(allowedActions, action) {
			return false
		}
	}
	return true
}
