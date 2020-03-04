package hub

import "html/template"

var emailVerificationTmpl = template.Must(template.New("").Parse(`
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Welcome to CNCF Hub</title>
  </head>
  <body class="" style="background-color: #f4f4f4; font-family: sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
    <table border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background-color: #f4f4f4;">
      <tr>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top; text-align: center;">
          <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; Margin-Top: 15px; Margin-bottom: 15px;">Welcome to CNCF Hub!</p>
        </td>
      </tr>
    </table>
  </body>
</html>
`))
