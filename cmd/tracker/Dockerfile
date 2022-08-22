# Build tracker
FROM golang:1.19.0-alpine3.15 AS builder
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/tracker cmd/tracker
COPY internal internal
WORKDIR /go/src/github.com/artifacthub/hub/cmd/tracker
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /tracker .

# OPM installer
FROM golang:1.19.0-alpine3.15 AS opm-installer
RUN apk --no-cache add build-base
RUN GO111MODULE=on go get github.com/operator-framework/operator-registry/cmd/opm@v1.23.2

# Final stage
FROM alpine:3.15
RUN apk --no-cache add ca-certificates && addgroup -S tracker && adduser -S tracker -G tracker
USER tracker
WORKDIR /home/tracker
COPY --from=builder /tracker ./
COPY --from=opm-installer /go/bin/opm /usr/local/bin
CMD ["./tracker"]
