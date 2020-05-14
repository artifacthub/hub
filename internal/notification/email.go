package notification

import (
	"bytes"
	"context"
	"fmt"
	"sync"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
)

// EmailDataCache is a cache to store the email data used when sending email
// notifications.
type EmailDataCache struct {
	packageManager hub.PackageManager
	baseURL        string

	mu   sync.RWMutex
	data map[string]email.Data
}

// NewEmailDataCache creates a new EmailDataCache instance.
func NewEmailDataCache(packageManager hub.PackageManager, baseURL string) *EmailDataCache {
	return &EmailDataCache{
		packageManager: packageManager,
		baseURL:        baseURL,
		data:           make(map[string]email.Data),
	}
}

// Get returns the email data corresponding to the event provided. If the data
// is available in the cache, we just return it. Otherwise it is built, cached
// and returned.
func (c *EmailDataCache) Get(ctx context.Context, e *hub.Event) (email.Data, error) {
	// Email data is already cached for the event provided
	c.mu.RLock()
	emailData, ok := c.data[e.EventID]
	if ok {
		c.mu.RUnlock()
		return emailData, nil
	}
	c.mu.RUnlock()

	// No email data cached for event provided. Build, cache and return it.
	emailData, err := c.buildEmailData(ctx, e)
	if err != nil {
		return email.Data{}, err
	}
	c.mu.Lock()
	c.data[e.EventID] = emailData
	c.mu.Unlock()
	return emailData, nil
}

// buildEmailData prepares the email data corresponding to the event provided.
func (c *EmailDataCache) buildEmailData(ctx context.Context, e *hub.Event) (email.Data, error) {
	var subject string
	var emailBody bytes.Buffer

	switch e.EventKind {
	case hub.NewRelease:
		p, err := c.packageManager.Get(ctx, &hub.GetPackageInput{
			PackageID: e.PackageID,
			Version:   e.PackageVersion,
		})
		if err != nil {
			return email.Data{}, err
		}
		subject = fmt.Sprintf("%s version %s released", p.Name, e.PackageVersion)
		publisher := p.OrganizationName
		if publisher == "" {
			publisher = p.UserAlias
		}
		if p.ChartRepository != nil {
			publisher += "/" + p.ChartRepository.Name
		}
		var packagePath string
		switch p.Kind {
		case hub.Chart:
			packagePath = fmt.Sprintf("/package/chart/%s/%s/%s",
				p.ChartRepository.Name,
				p.NormalizedName,
				e.PackageVersion,
			)
		case hub.Falco:
			packagePath = fmt.Sprintf("/package/falco/%s/%s", p.NormalizedName, e.PackageVersion)
		case hub.OPA:
			packagePath = fmt.Sprintf("/package/opa/%s/%s", p.NormalizedName, e.PackageVersion)
		}
		data := map[string]interface{}{
			"publisher":   publisher,
			"kind":        p.Kind,
			"name":        p.Name,
			"version":     e.PackageVersion,
			"baseURL":     c.baseURL,
			"logoImageID": p.LogoImageID,
			"packagePath": packagePath,
		}
		if err := newReleaseEmailTmpl.Execute(&emailBody, data); err != nil {
			return email.Data{}, err
		}
	}

	return email.Data{
		Subject: subject,
		Body:    emailBody.Bytes(),
	}, nil
}
