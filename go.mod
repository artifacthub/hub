module github.com/artifacthub/hub

go 1.15

require (
	github.com/Masterminds/semver/v3 v3.1.1
	github.com/containerd/containerd v1.4.3
	github.com/coreos/go-oidc v2.2.1+incompatible
	github.com/deislabs/oras v0.10.0
	github.com/disintegration/imaging v1.6.2
	github.com/domodwyer/mailyak v3.1.1+incompatible
	github.com/emicklei/go-restful v2.15.0+incompatible // indirect
	github.com/ghodss/yaml v1.0.0
	github.com/go-chi/chi v4.1.2+incompatible
	github.com/go-git/go-git/v5 v5.2.0
	github.com/go-openapi/spec v0.19.8 // indirect
	github.com/go-openapi/swag v0.19.11 // indirect
	github.com/google/go-containerregistry v0.4.0
	github.com/google/go-github v17.0.0+incompatible
	github.com/gorilla/feeds v1.1.1
	github.com/gorilla/securecookie v1.1.1
	github.com/gregjones/httpcache v0.0.0-20190611155906-901d90724c79 // indirect
	github.com/h2non/go-is-svg v0.0.0-20160927212452-35e8c4b0612c
	github.com/hashicorp/golang-lru v0.5.4
	github.com/jackc/pgconn v1.8.0
	github.com/jackc/pgx/v4 v4.10.1
	github.com/mailru/easyjson v0.7.7 // indirect
	github.com/mitchellh/mapstructure v1.4.1 // indirect
	github.com/open-policy-agent/opa v0.26.0
	github.com/operator-framework/api v0.5.3
	github.com/patrickmn/go-cache v2.1.0+incompatible
	github.com/pelletier/go-toml v1.8.1 // indirect
	github.com/prometheus/client_golang v1.9.0
	github.com/rs/zerolog v1.20.0
	github.com/sabhiram/go-gitignore v0.0.0-20201211210132-54b8a0bf510f
	github.com/satori/uuid v1.2.0
	github.com/spf13/jwalterweatherman v1.1.0 // indirect
	github.com/spf13/viper v1.7.1
	github.com/stretchr/testify v1.7.0
	github.com/tektoncd/pipeline v0.20.1
	github.com/vincent-petithory/dataurl v0.0.0-20191104211930-d1553a71de50
	golang.org/x/crypto v0.0.0-20201221181555-eec23a3978ad
	golang.org/x/image v0.0.0-20201208152932-35266b937fa6 // indirect
	golang.org/x/oauth2 v0.0.0-20210201163806-010130855d6c
	golang.org/x/time v0.0.0-20201208040808-7e3f01d25324
	google.golang.org/api v0.39.0
	gopkg.in/ini.v1 v1.62.0 // indirect
	gopkg.in/src-d/go-license-detector.v3 v3.1.0
	gopkg.in/yaml.v2 v2.4.0
	gopkg.in/yaml.v3 v3.0.0-20210107192922-496545a6307b
	helm.sh/helm/v3 v3.5.2
	k8s.io/apimachinery v0.20.2
	sigs.k8s.io/krew v0.4.0
	sigs.k8s.io/yaml v1.2.0
)

replace (
	github.com/docker/distribution => github.com/docker/distribution v0.0.0-20191216044856-a8371794149d
	github.com/docker/docker => github.com/moby/moby v17.12.0-ce-rc1.0.20200618181300-9dc6525e6118+incompatible
	k8s.io/client-go => k8s.io/client-go v0.20.2
)
