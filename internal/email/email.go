package email

import (
	"errors"
	"fmt"
	"net/smtp"

	"github.com/domodwyer/mailyak"
	"github.com/spf13/viper"
)

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
		"fromName",
		"from",
		"replyTo",
		"smtp.host",
		"smtp.port",
		"smtp.username",
		"smtp.password",
	}
	for _, f := range requiredConfigFields {
		if !cfg.IsSet("email." + f) {
			return nil
		}
	}

	return &Sender{
		fromName: cfg.GetString("email.fromName"),
		from:     cfg.GetString("email.from"),
		replyTo:  cfg.GetString("email.replyTo"),
		smtpAddr: fmt.Sprintf(
			"%s:%d",
			cfg.GetString("email.smtp.host"),
			cfg.GetInt("email.smtp.port"),
		),
		smtpAuth: smtp.PlainAuth(
			"",
			cfg.GetString("email.smtp.username"),
			cfg.GetString("email.smtp.password"),
			cfg.GetString("email.smtp.host"),
		),
	}
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
