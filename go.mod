module github.com/artifacthub/hub

go 1.16

require (
	github.com/Masterminds/semver/v3 v3.1.1
	github.com/aquasecurity/trivy v0.19.1
	github.com/containerd/containerd v1.4.8
	github.com/coreos/go-oidc v2.2.1+incompatible
	github.com/deislabs/oras v0.11.1
	github.com/disintegration/imaging v1.6.2
	github.com/domodwyer/mailyak v3.1.1+incompatible
	github.com/ghodss/yaml v1.0.0
	github.com/go-chi/chi/v5 v5.0.3
	github.com/go-git/go-git/v5 v5.4.2
	github.com/google/go-containerregistry v0.5.1
	github.com/google/go-github v17.0.0+incompatible
	github.com/gorilla/csrf v1.7.0
	github.com/gorilla/feeds v1.1.1
	github.com/gorilla/securecookie v1.1.1
	github.com/h2non/go-is-svg v0.0.0-20160927212452-35e8c4b0612c
	github.com/hashicorp/go-multierror v1.1.1
	github.com/hashicorp/golang-lru v0.5.4
	github.com/jackc/pgconn v1.8.1
	github.com/jackc/pgx/v4 v4.11.0
	github.com/open-policy-agent/opa v0.29.4
	github.com/operator-framework/api v0.10.0
	github.com/patrickmn/go-cache v2.1.0+incompatible
	github.com/pquerna/otp v1.3.0
	github.com/prometheus/client_golang v1.11.0
	github.com/rs/cors v1.7.0
	github.com/rs/zerolog v1.23.0
	github.com/sabhiram/go-gitignore v0.0.0-20201211210132-54b8a0bf510f
	github.com/satori/uuid v1.2.0
	github.com/spf13/cobra v1.2.1
	github.com/spf13/viper v1.8.1
	github.com/stretchr/testify v1.7.0
	github.com/tektoncd/pipeline v0.25.0
	github.com/unrolled/secure v1.0.9
	github.com/vincent-petithory/dataurl v0.0.0-20191104211930-d1553a71de50
	github.com/wagslane/go-password-validator v0.3.0
	golang.org/x/crypto v0.0.0-20210616213533-5ff15b29337e
	golang.org/x/image v0.0.0-20210607152325-775e3b0c77b9 // indirect
	golang.org/x/oauth2 v0.0.0-20210615190721-d04028783cf1
	golang.org/x/time v0.0.0-20210611083556-38a9dc6acbc6
	google.golang.org/api v0.48.0
	gopkg.in/src-d/go-license-detector.v3 v3.1.0
	gopkg.in/yaml.v2 v2.4.0
	gopkg.in/yaml.v3 v3.0.0-20210107192922-496545a6307b
	helm.sh/helm/v3 v3.6.1
	k8s.io/apimachinery v0.21.2
	k8s.io/client-go v11.0.1-0.20190805182717-6502b5e7b1b5+incompatible // indirect
	sigs.k8s.io/krew v0.4.1
	sigs.k8s.io/yaml v1.2.0
)

replace (
	github.com/docker/distribution => github.com/docker/distribution v0.0.0-20191216044856-a8371794149d
	github.com/docker/docker => github.com/moby/moby v17.12.0-ce-rc1.0.20200618181300-9dc6525e6118+incompatible
	github.com/go-openapi/spec => github.com/go-openapi/spec v0.19.8
	k8s.io/client-go => k8s.io/client-go v0.21.2
)
