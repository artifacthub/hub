package notification

import "html/template"

var newReleaseEmailTmpl = template.Must(template.New("").Parse(`
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>{{ .Package.Name }} new release</title>
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

    .title, .AHlink {
      color: #39596C;
    }

    .subtitle {
      color: #1c2c35;
    }

    .hr {
      border-top: 1px solid #659DBD;
    }

    .AHbtn {
      background-color: #39596C;
      border: solid 1px #39596C;
      color: #ffffff;
    }

    .text-muted {
      color: #545454;
    }

    .warning {
      color: #856404;
      background-color: #fff3cd;
      border: 1px solid #856404;
    }

    .badge {
      padding: 0 10px;
      border-radius: 8px;
      font-size: 10px;
      text-transform: uppercase;
      color: #ffffff;
      width: 75px;
    }

    .badge-added {
      background-color: #0594cb;
    }

    .badge-changed {
      background-color: #e0ae0b;
    }

    .badge-deprecated {
      background-color: #6c757d;
    }

    .badge-removed {
      background-color: #f7860f;
    }

    .badge-fixed {
      background-color: #28a745;
    }

    .badge-security {
      background-color: #df2a29;
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

      h1, h2, h3, p, td, .subtitle {
        color: #a3a3a6 !important;
      }

      .title, .AHlink {
        color: #1164a3;
      }

      .hr {
        border-color: #1164a3;
      }

      .AHbtn {
        background-color: #1164a3;
        border-color: #1164a3;
        color: #ffffff;
      }

      .warning {
        background-color: #cec4a5;
      }
    }
    </style>
  </head>
  <body class="body" style="font-family: sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
    <table border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
      <tr>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;">&nbsp;</td>
        <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; Margin: 0 auto; max-width: 580px; padding: 10px; width: 580px;">
          <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;">

            <!-- START CENTERED WHITE CONTAINER -->
            <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">{{ .Package.Name }} version {{ .Package.Version }} released</span>
            <table class="main line" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; border-radius: 3px;">

              <!-- START MAIN CONTENT AREA -->
              <tr>
                <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;">
                  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
                    <tr>
                      <td style="font-family: sans-serif; font-size: 14px; vertical-align: top; text-align: center;">
                        <img style="margin: 30px;" height="40px" src="{{ .BaseURL }}{{ if .Package.LogoImageID }}/image/{{ .Package.LogoImageID }}@3x{{ else }}/static/media/placeholder_pkg_{{ .Package.Repository.Kind }}.png{{ end }}">
                        <h2 class="title" style="font-family: sans-serif; margin: 0; Margin-bottom: 15px;"><img style="margin-right: 5px; margin-bottom: -2px;" height="18px" src="{{ .BaseURL }}/static/media/{{ .Package.Repository.Kind }}_icon.png">{{ .Package.Name }}</h2>
												<h4 class="subtitle" style="font-family: sans-serif; margin: 0; Margin-bottom: 15px;">{{ .Package.repository.publisher }} </h4>

                        <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 30px;">Version <b>{{ .Package.version }}</b> has been released</p>
                      </td>
                    </tr>

                    <tr>
                      <td>
                        {{ if .Package.Prerelease }}
                          <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; box-sizing: border-box;">
                            <tbody>
                              <tr>
                                <td class="content-block powered-by" style="font-family: sans-serif; vertical-align: top; padding-top: 5px; padding-bottom: {{ if .Package.ContainsSecurityUpdates }} 15px; {{ else }} 30px;{{ end }}">
                                  <div class="warning" style="border-radius: 5px; box-sizing: border-box; cursor: pointer; font-size: 14px; font-weight: 400; margin: 0; padding: 12px 20px; text-align: left;">This package version is a <b>pre-release</b> and it is not ready for production use.</div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        {{ end }}
                      </td>
                    </tr>

                    <tr>
                      <td>
                        {{ if .Package.ContainsSecurityUpdates }}
                          <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; box-sizing: border-box;">
                            <tbody>
                              <tr>
                                <td class="content-block powered-by" style="font-family: sans-serif; vertical-align: top; padding-top: 5px; padding-bottom: 30px;">
                                  <div class="warning" style="border-radius: 5px; box-sizing: border-box; cursor: pointer; font-size: 14px; font-weight: 400; margin: 0; padding: 12px 20px; text-align: left;">This package version contains security updates.</div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        {{ end }}
                      </td>
                    </tr>

                    <tr>
                      <td style="font-family: sans-serif; font-size: 14px;">
                        {{ if .Package.Changes }}
                          <hr class="hr" style="border-bottom: none;" />
                          <h4 class="subtitle" style="font-family: sans-serif; font-size: 12px; Margin-top: 20px;">CHANGES:</h4>
                          <table border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                              {{range $change := .Package.Changes}}
                                <tr>
                                  <td style="vertical-align: top; padding-top: 2px; padding-right: 10px;">
                                    {{ if $change.Kind}}
                                      <div class="badge badge-{{ $change.Kind }}" style="text-align: center;">{{ $change.Kind }}</div>
                                    {{ else }}
                                      <p style="margin: 0;">&bull;</p>
                                    {{ end }}
                                  </td>
                                  <td>
                                    <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 10px;">
                                      {{ $change.Description }}

                                      {{if $change.Links}}
                                        <br />
                                        {{range $i, $link := $change.Links}}
                                          {{if $i}} &bull; {{end}}
                                          <a href="{{ $link.URL }}" class="AHlink" style="font-size: 12px; text-align: center; text-decoration: none;">{{ $link.Name }}</a>
                                        {{end}}
                                      {{ end }}
                                    </p>
                                  </td>
                                </tr>
                              {{ end }}
                            </tbody>
                          </table>
                          <hr class="hr" style="border-bottom: none;" />
                          <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 45px;"></p>
                        {{ end }}
                      </td>
                    </tr>

                    <tr>
                      <td style="font-family: sans-serif; font-size: 14px; text-align: center;">
                        <table border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; box-sizing: border-box;">
                          <tbody>
                            <tr>
                              <td align="left" style="font-family: sans-serif; font-size: 14px; vertical-align: top;">
                                <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                  <tbody>
                                    <tr>
                                      <td style="font-family: sans-serif; font-size: 14px; border-radius: 5px; vertical-align: top;"><div style="text-align: center;"> <a href="{{ .Package.URL }}" class="AHbtn" target="_blank" style="display: inline-block; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 25px;">View in Artifact Hub</a> </div></td>
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
                              <td class="content-block powered-by" style="font-family: sans-serif; vertical-align: top; font-size: 11px; padding-bottom: 30px; padding-top: 10px;">
                                <p class="text-muted" style="font-size: 11px; text-decoration: none;">Or you can copy-paste this link: <span class="copy-link">{{ .Package.URL }}</span></p>
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
                  <td class="content-block powered-by" style="font-family: sans-serif; vertical-align: top; padding-bottom: 10px; padding-top: 10px; font-size: 10px; text-align: center;">
                    <p class="text-muted" style="font-size: 10px; text-align: center; text-decoration: none;">Didn't subscribe to Artifact Hub notifications for {{ .Package.Name }} package? You can unsubscribe <a href="{{ .BaseURL }}/control-panel/settings/subscriptions" target="_blank" class="text-muted" style="text-decoration: underline;">here</a>.</p>
                  </td>
                </tr>
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
