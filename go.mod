module github.com/tegioz/hub

go 1.13

require (
	github.com/disintegration/imaging v1.6.2
	github.com/h2non/go-is-svg v0.0.0-20160927212452-35e8c4b0612c
	github.com/jackc/pgconn v1.2.1
	github.com/jackc/pgproto3 v1.1.0
	github.com/jackc/pgx/v4 v4.2.1
	github.com/julienschmidt/httprouter v1.3.0
	github.com/rs/zerolog v1.17.2
	github.com/spf13/viper v1.6.1
	github.com/stretchr/testify v1.4.0
	golang.org/x/time v0.0.0-20191024005414-555d28b269f0
	helm.sh/helm/v3 v3.0.2
)

replace github.com/docker/docker => github.com/moby/moby v0.7.3-0.20190826074503-38ab9da00309
