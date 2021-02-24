# Build tracker
FROM golang:1.16-alpine3.13 AS builder
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/tracker cmd/tracker
COPY internal internal
RUN cd cmd/tracker && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /tracker .

# OPM installer
FROM golang:1.16-alpine3.13 AS opm-installer
RUN apk --no-cache add build-base
RUN GO111MODULE=on go get github.com/operator-framework/operator-registry/cmd/opm@v1.15.3

# Final stage
FROM alpine:3.13
RUN apk --no-cache add ca-certificates && addgroup -S tracker && adduser -S tracker -G tracker
USER tracker
WORKDIR /home/tracker
COPY --from=builder /tracker ./
COPY --from=opm-installer /go/bin/opm /usr/local/bin
CMD ["./tracker"]
