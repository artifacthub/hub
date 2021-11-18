module github.com/artifacthub/hub

go 1.17

require (
	github.com/Masterminds/semver/v3 v3.1.1
	github.com/containerd/containerd v1.5.8
	github.com/coreos/go-oidc v2.2.1+incompatible
	github.com/disintegration/imaging v1.6.2
	github.com/domodwyer/mailyak v3.1.1+incompatible
	github.com/go-chi/chi/v5 v5.0.5
	github.com/go-enry/go-license-detector/v4 v4.3.0
	github.com/google/go-containerregistry v0.6.0
	github.com/google/go-github v17.0.0+incompatible
	github.com/gorilla/csrf v1.7.1
	github.com/gorilla/feeds v1.1.1
	github.com/gorilla/securecookie v1.1.1
	github.com/h2non/go-is-svg v0.0.0-20160927212452-35e8c4b0612c
	github.com/hashicorp/go-multierror v1.1.1
	github.com/hashicorp/golang-lru v0.5.4
	github.com/jackc/pgconn v1.10.0
	github.com/jackc/pgx/v4 v4.13.0
	github.com/open-policy-agent/opa v0.34.0
	github.com/opencontainers/image-spec v1.0.2-0.20190823105129-775207bd45b6
	github.com/patrickmn/go-cache v2.1.0+incompatible
	github.com/prometheus/client_golang v1.11.0
	github.com/rs/cors v1.8.0
	github.com/rs/zerolog v1.26.0
	github.com/sabhiram/go-gitignore v0.0.0-20210923224102-525f6e181f06
	github.com/satori/uuid v1.2.0
	github.com/spf13/cobra v1.2.1
	github.com/spf13/viper v1.9.0
	github.com/stretchr/testify v1.7.0
	github.com/unrolled/secure v1.0.9
	github.com/versine/loginauth v0.0.0-20170330164406-8380ec243689
	github.com/vincent-petithory/dataurl v0.0.0-20191104211930-d1553a71de50
	github.com/wagslane/go-password-validator v0.3.0
	golang.org/x/oauth2 v0.0.0-20211028175245-ba495a64dcb5
	google.golang.org/api v0.60.0
	gopkg.in/yaml.v2 v2.4.0
	gopkg.in/yaml.v3 v3.0.0-20210107192922-496545a6307b
	helm.sh/helm/v3 v3.7.1
	oras.land/oras-go v0.4.0
	sigs.k8s.io/yaml v1.3.0
)

require (
	github.com/golang/groupcache v0.0.0-20210331224755-41bb18bfe9da // indirect
	github.com/golang/protobuf v1.5.2 // indirect
	github.com/klauspost/compress v1.13.5 // indirect
	github.com/moby/locker v1.0.1 // indirect
	github.com/opencontainers/go-digest v1.0.0 // indirect
	github.com/pkg/errors v0.9.1 // indirect
	github.com/sirupsen/logrus v1.8.1 // indirect
	go.opencensus.io v0.23.0 // indirect
	golang.org/x/net v0.0.0-20210903162142-ad29c8ab022f // indirect
	golang.org/x/sync v0.0.0-20210220032951-036812b2e83c // indirect
	golang.org/x/sys v0.0.0-20211025201205-69cdffdb9359 // indirect
	golang.org/x/text v0.3.7 // indirect
	google.golang.org/genproto v0.0.0-20211021150943-2b146023228c // indirect
	google.golang.org/grpc v1.40.0 // indirect
	google.golang.org/protobuf v1.27.1 // indirect
)

replace (
	github.com/tektoncd/pipeline => github.com/tegioz/pipeline v0.28.1-0.20210920113803-9c07e7cb8d14
	k8s.io/client-go => k8s.io/client-go v0.22.2
)
