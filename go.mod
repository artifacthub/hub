module github.com/artifacthub/hub

go 1.15

require (
	github.com/Masterminds/semver/v3 v3.1.1
	github.com/containerd/containerd v1.3.4
	github.com/coreos/go-oidc v2.2.1+incompatible
	github.com/deislabs/oras v0.8.1
	github.com/disintegration/imaging v1.6.2
	github.com/domodwyer/mailyak v3.1.1+incompatible
	github.com/emicklei/go-restful v2.14.3+incompatible // indirect
	github.com/ghodss/yaml v1.0.0
	github.com/go-chi/chi v4.1.2+incompatible
	github.com/go-git/go-git/v5 v5.2.0
	github.com/go-openapi/spec v0.19.8 // indirect
	github.com/go-openapi/swag v0.19.11 // indirect
	github.com/google/go-containerregistry v0.2.1
	github.com/google/go-github v17.0.0+incompatible
	github.com/google/go-querystring v1.0.0 // indirect
	github.com/gorilla/feeds v1.1.1
	github.com/gorilla/securecookie v1.1.1
	github.com/gregjones/httpcache v0.0.0-20190611155906-901d90724c79 // indirect
	github.com/h2non/go-is-svg v0.0.0-20160927212452-35e8c4b0612c
	github.com/jackc/pgconn v1.7.2
	github.com/jackc/pgx/v4 v4.9.2
	github.com/mailru/easyjson v0.7.6 // indirect
	github.com/mitchellh/mapstructure v1.3.3 // indirect
	github.com/open-policy-agent/opa v0.25.2
	github.com/operator-framework/api v0.3.25
	github.com/patrickmn/go-cache v2.1.0+incompatible
	github.com/pelletier/go-toml v1.8.1 // indirect
	github.com/prometheus/client_golang v1.8.0
	github.com/rs/zerolog v1.20.0
	github.com/sabhiram/go-gitignore v0.0.0-20180611051255-d3107576ba94
	github.com/satori/uuid v1.2.0
	github.com/spf13/jwalterweatherman v1.1.0 // indirect
	github.com/spf13/viper v1.7.1
	github.com/stretchr/testify v1.6.1
	github.com/vincent-petithory/dataurl v0.0.0-20191104211930-d1553a71de50
	golang.org/x/crypto v0.0.0-20201208171446-5f87f3452ae9
	golang.org/x/image v0.0.0-20200927104501-e162460cd6b5 // indirect
	golang.org/x/oauth2 v0.0.0-20201208152858-08078c50e5b5
	golang.org/x/time v0.0.0-20201208040808-7e3f01d25324
	google.golang.org/api v0.36.0
	gopkg.in/ini.v1 v1.62.0 // indirect
	gopkg.in/src-d/go-license-detector.v3 v3.1.0
	gopkg.in/yaml.v2 v2.4.0
	gopkg.in/yaml.v3 v3.0.0-20200615113413-eeeca48fe776
	helm.sh/helm/v3 v3.4.2
	rsc.io/letsencrypt v0.0.3 // indirect
	sigs.k8s.io/krew v0.4.0
	sigs.k8s.io/yaml v1.2.0
)

replace github.com/docker/docker => github.com/moby/moby v0.7.3-0.20190826074503-38ab9da00309

replace k8s.io/client-go => k8s.io/client-go v0.19.4
