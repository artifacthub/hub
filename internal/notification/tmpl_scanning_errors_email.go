package notification

import "html/template"

var scanningErrorsEmailTmpl = template.Must(template.New("").Parse(`
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>{{ .Repository.Name }} scanning errors</title>
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">

    <style type="text/css">
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }

    @media only screen and (max-width: 620px) {
      table[class=body] h1 {
        font-size: 28px !important;
        margin-bottom: 10px !important;
      }
      table[class=body] p,
      table[class=body] ul,
      table[class=body] ol,
      table[class=body] td,
      table[class=body] span,
      table[class=body] a {
        font-size: 16px !important;
      }
      table[class=body] .wrapper,
      table[class=body] .article {
        padding: 10px !important;
      }
      table[class=body] .content {
        padding: 0 !important;
      }
      table[class=body] .container {
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      table[class=body] .main {
        border-left-width: 0 !important;
        border-radius: 0 !important;
        border-right-width: 0 !important;
      }
      table[class=body] .btn table {
        width: 100% !important;
      }
      table[class=body] .btn a {
        width: 100% !important;
      }
      table[class=body] .img-responsive {
        height: auto !important;
        max-width: 100% !important;
        width: auto !important;
      }
    }

    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }

    @media all {
      .ExternalClass {
        width: 100%;
      }
      .ExternalClass,
      .ExternalClass p,
      .ExternalClass span,
      .ExternalClass font,
      .ExternalClass td,
      .ExternalClass div {
        line-height: 100%;
      }
      .apple-link a {
        color: inherit !important;
        font-family: inherit !important;
        font-size: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
        text-decoration: none !important;
      }
      #MessageViewBody a {
        color: inherit;
        text-decoration: none;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        line-height: inherit;
      }
    }

    .body {
      background-color: #f4f4f4;
      color: #38383f;
    }

    .line {
      border-top: 7px solid #659DBD;
    }

    .line-danger {
      border-top: 7px solid #C00004;
    }

    .main, .copy-link {
      background-color: #ffffff;
    }

    .AHlink {
      color: #39596C;
    }

    .AHbtn {
      background-color: #39596C;
      border: solid 1px #39596C;
      color: #ffffff;
    }

    .text-muted {
      color: #545454;
    }

    @media (prefers-color-scheme: dark ) {
      .body {
        background-color: #222529 !important;
        color: #a3a3a6 !important;
      }

      .main, .copy-link {
        background-color: #131216 !important;
      }

      .line {
        border-color: #1164a3 !important;
      }

      .line-danger {
        border-color: #C00004 !important;
      }

      h1, h2, h3, p, td {
        color: #a3a3a6 !important;
      }

      .AHlink {
        color: #1164a3;
      }

      .AHbtn {
        background-color: #1164a3;
        border-color: #1164a3;
        color: #ffffff;
      }
    }
    </style>
  </head>
  <body class="body" style="font-family: sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
    <table border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
      <tr>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;">&nbsp;</td>
        <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; Margin: 0 auto; max-width: 90%; padding: 10px; width: 90%;">
          <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; padding: 10px;">

            <!-- START CENTERED WHITE CONTAINER -->
            <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">{{ .Repository.Name }} security vulnerabilities scan errors</span>
            <table class="main line-danger" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; border-radius: 3px;">

              <!-- START MAIN CONTENT AREA -->
              <tr>
                <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;">
                  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
                    <tr>
                      <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;">
                        <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 15px;">
                          We encountered some errors while scanning the packages in repository <strong>{{ .Repository.Name }}</strong> for security vulnerabilities.
                        </p>

                        <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 30px;">
                          If you find something in them that doesn't make sense, or there is anything you need help with, please file an issue <a href="https://github.com/artifacthub/hub/issues" class="AHlink" style="text-decoration: none;">here</a>.
                        </p>

                        <h4 style="color: #921e12; font-family: sans-serif; margin: 0; Margin-bottom: 15px;">Errors log</h4>

                        <table border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="Margin-bottom: 30px; border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; box-sizing: border-box; background: #1D1F21; border-radius: 3px;">
                          <tbody>
                            <tr>
                              <td align="left" style="font-family: sans-serif; font-size: 14px; vertical-align: top; padding: 16px;">
                                <code style="overflow-x: auto;">
                                  {{ range $index, $scanningError := .Repository.LastScanningErrors }}
                                    {{ if $index }}
                                      <p style="font-family: 'Courier New', Courier, monospace; color: #C5C8C6 !important; border-top: 1px solid #333; padding-top: 15px; font-size: 13px; ">{{ $scanningError }}</p>
                                    {{ else }}
                                      <p style="font-family: 'Courier New', Courier, monospace; color: #C5C8C6 !important;font-size: 13px;">{{ $scanningError }}</p>
                                    {{end}}
                                  {{ end }}
                                </code>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; box-sizing: border-box;">
                          <tbody>
                            <tr>
                              <td align="left" style="font-family: sans-serif; font-size: 14px; vertical-align: top;">
                                <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                  <tbody>
                                    <tr>
                                      <td style="font-family: sans-serif; font-size: 14px; border-radius: 5px; vertical-align: top;"><div style="text-align: center;"> <a href="{{ .BaseURL }}/control-panel/repositories?modal=scanning&user-alias={{ .Repository.UserAlias }}&org-name={{ .Repository.OrganizationName }}&repo-name={{ .Repository.Name }}" class="AHbtn" target="_blank" style="display: inline-block; color: #ffffff; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 25px;">View in Artifact Hub</a> </div></td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; box-sizing: border-box;">
                          <tbody>
                            <tr>
                              <td class="content-block powered-by" style="font-family: sans-serif; vertical-align: top; font-size: 11px; padding-bottom: 10px; padding-top: 10px; text-align: center;">
                                <p class="text-muted" style="font-size: 11px; text-decoration: none;">Or you can copy-paste this link: <span class="copy-link" style="text-align: center;">{{ .BaseURL }}/control-panel/repositories?modal=scanning&user-alias={{ .Repository.UserAlias }}&org-name={{ .Repository.OrganizationName }}&repo-name={{ .Repository.Name }}</span></p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            <!-- END MAIN CONTENT AREA -->
            </table>

            <!-- START FOOTER -->
            <div class="footer" style="clear: both; Margin-top: 10px; text-align: center; width: 100%;">
              <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
                <tr>
                  <td class="content-block powered-by" style="font-family: sans-serif; vertical-align: top; padding-bottom: 10px; padding-top: 10px; font-size: 12px; text-align: center;">
                    <a href="{{ .BaseURL }}" class="AHlink" style="font-size: 12px; text-align: center; text-decoration: none;">© Artifact Hub</a>
                  </td>
                </tr>
              </table>
            </div>
            <!-- END FOOTER -->

          <!-- END CENTERED WHITE CONTAINER -->
          </div>
        </td>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;">&nbsp;</td>
      </tr>
    </table>
  </body>
</html>
`))
