package api

import (
	"context"
	"errors"
	"fmt"

	"github.com/artifacthub/hub/internal/chartrepo"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/org"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/user"
)

// API provides a wrapper around several internal apis to manage packages,
// users, organizations, etc.
type API struct {
	db                hub.DB
	ChartRepositories *chartrepo.Manager
	Organizations     *org.Manager
	Packages          *pkg.Manager
	User              *user.Manager
}

// New creates a new API instance.
func New(db hub.DB, es hub.EmailSender) *API {
	return &API{
		db:                db,
		ChartRepositories: chartrepo.NewManager(db),
		Organizations:     org.NewManager(db, es),
		Packages:          pkg.NewManager(db),
		User:              user.NewManager(db, es),
	}
}

// CheckAvailability checks the availability of a given value for the provided
// resource kind.
func (a *API) CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error) {
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
	err := a.db.QueryRow(ctx, query, value).Scan(&available)
	return available, err
}
