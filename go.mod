module github.com/tegioz/hub

go 1.13

require (
	github.com/jackc/pgx/v4 v4.2.1
	github.com/julienschmidt/httprouter v1.3.0
	github.com/rs/zerolog v1.17.2
	github.com/spf13/viper v1.6.1
	helm.sh/helm/v3 v3.0.2
)

replace github.com/docker/docker => github.com/moby/moby v0.7.3-0.20190826074503-38ab9da00309
