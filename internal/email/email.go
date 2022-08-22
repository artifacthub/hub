package email

import (
	"errors"
	"fmt"
	"net/smtp"

	_ "embed" // Used by templates

	"github.com/domodwyer/mailyak"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"github.com/versine/loginauth"
)

// BaseTmpl represents the base template used by emails.
//
//go:embed template/base.tmpl
var BaseTmpl string

// ErrSenderNotAvailable error indicates that there is not a mail sender
// available. This usually happens when the email configuration hasn't been
// set up.
var ErrSenderNotAvailable = errors.New("email sender not available")

// Data describes the different pieces of data used to compose an email.
type Data struct {
	To      string
	Subject string
	Body    []byte
}

// Sender is in charge of sending emails.
type Sender struct {
	smtpAddr string
	smtpAuth smtp.Auth
	fromName string
	from     string
	replyTo  string
}

// NewSender creates a new Sender instance and returns it.
func NewSender(cfg *viper.Viper) *Sender {
	requiredConfigFields := []string{
		"from",
		"smtp.host",
		"smtp.port",
	}
	for _, f := range requiredConfigFields {
		if !cfg.IsSet("email." + f) {
			log.Warn().Msg("email not setup properly, some required configuration fields are missing")
			return nil
		}
	}

	s := &Sender{
		fromName: cfg.GetString("email.fromName"),
		from:     cfg.GetString("email.from"),
		replyTo:  cfg.GetString("email.replyTo"),
		smtpAddr: fmt.Sprintf(
			"%s:%d",
			cfg.GetString("email.smtp.host"),
			cfg.GetInt("email.smtp.port"),
		),
	}
	username := cfg.GetString("email.smtp.username")
	password := cfg.GetString("email.smtp.password")
	if username != "" && password != "" {
		switch cfg.GetString("email.smtp.auth") {
		case "login":
			s.smtpAuth = loginauth.New(username, password, cfg.GetString("email.smtp.host"))
		case "plain":
			s.smtpAuth = smtp.PlainAuth("", username, password, cfg.GetString("email.smtp.host"))
		default:
			s.smtpAuth = smtp.PlainAuth("", username, password, cfg.GetString("email.smtp.host"))
		}
	}
	return s
}

// SendEmail creates an email using the data provided and sends it.
func (s *Sender) SendEmail(d *Data) error {
	email := mailyak.New(s.smtpAddr, s.smtpAuth)
	email.FromName(s.fromName)
	email.From(s.from)
	email.ReplyTo(s.replyTo)
	email.To(d.To)
	email.Subject(d.Subject)
	if _, err := email.HTML().Write(d.Body); err != nil {
		return err
	}
	return email.Send()
}
