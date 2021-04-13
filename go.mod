module github.com/artifacthub/hub

go 1.16

require (
	github.com/Masterminds/semver/v3 v3.1.1
	github.com/containerd/containerd v1.4.4
	github.com/coreos/go-oidc v2.2.1+incompatible
	github.com/deislabs/oras v0.11.1
	github.com/disintegration/imaging v1.6.2
	github.com/domodwyer/mailyak v3.1.1+incompatible
	github.com/ghodss/yaml v1.0.0
	github.com/go-chi/chi v4.1.2+incompatible
	github.com/go-git/go-git/v5 v5.3.0
	github.com/google/go-containerregistry v0.4.1
	github.com/google/go-github v17.0.0+incompatible
	github.com/gorilla/csrf v1.7.0
	github.com/gorilla/feeds v1.1.1
	github.com/gorilla/securecookie v1.1.1
	github.com/gregjones/httpcache v0.0.0-20190611155906-901d90724c79 // indirect
	github.com/h2non/go-is-svg v0.0.0-20160927212452-35e8c4b0612c
	github.com/hashicorp/golang-lru v0.5.4
	github.com/jackc/pgconn v1.8.1
	github.com/jackc/pgx/v4 v4.11.0
	github.com/mailru/easyjson v0.7.7 // indirect
	github.com/mitchellh/mapstructure v1.4.1 // indirect
	github.com/open-policy-agent/opa v0.27.1
	github.com/operator-framework/api v0.8.0
	github.com/patrickmn/go-cache v2.1.0+incompatible
	github.com/pelletier/go-toml v1.8.1 // indirect
	github.com/pquerna/otp v1.3.0
	github.com/prometheus/client_golang v1.10.0
	github.com/rs/cors v1.7.0
	github.com/rs/zerolog v1.21.0
	github.com/sabhiram/go-gitignore v0.0.0-20201211210132-54b8a0bf510f
	github.com/satori/uuid v1.2.0
	github.com/spf13/jwalterweatherman v1.1.0 // indirect
	github.com/spf13/viper v1.7.1
	github.com/stretchr/testify v1.7.0
	github.com/tektoncd/pipeline v0.23.0
	github.com/unrolled/secure v1.0.8
	github.com/vincent-petithory/dataurl v0.0.0-20191104211930-d1553a71de50
	github.com/wagslane/go-password-validator v0.3.0
	golang.org/x/crypto v0.0.0-20210421170649-83a5a9bb288b
	golang.org/x/image v0.0.0-20210220032944-ac19c3e999fb // indirect
	golang.org/x/oauth2 v0.0.0-20210413134643-5e61552d6c78
	golang.org/x/time v0.0.0-20210220033141-f8bda1e9f3ba
	gonum.org/v1/netlib v0.0.0-20210302091547-ede94419cf37 // indirect
	google.golang.org/api v0.42.0
	gopkg.in/ini.v1 v1.62.0 // indirect
	gopkg.in/src-d/go-license-detector.v3 v3.1.0
	gopkg.in/yaml.v2 v2.4.0
	gopkg.in/yaml.v3 v3.0.0-20210107192922-496545a6307b
	helm.sh/helm/v3 v3.5.4
	k8s.io/apimachinery v0.20.5
	k8s.io/client-go v11.0.1-0.20190805182717-6502b5e7b1b5+incompatible // indirect
	sigs.k8s.io/krew v0.4.1
	sigs.k8s.io/yaml v1.2.0
)

replace (
	github.com/docker/distribution => github.com/docker/distribution v0.0.0-20191216044856-a8371794149d
	github.com/docker/docker => github.com/moby/moby v17.12.0-ce-rc1.0.20200618181300-9dc6525e6118+incompatible
	github.com/go-openapi/spec => github.com/go-openapi/spec v0.19.8
	k8s.io/client-go => k8s.io/client-go v0.20.5
)
