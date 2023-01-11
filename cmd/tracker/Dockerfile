# Build tracker
FROM golang:1.19.4-alpine3.16 AS builder
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/tracker cmd/tracker
COPY internal internal
WORKDIR /go/src/github.com/artifacthub/hub/cmd/tracker
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /tracker .

# OPM installer
FROM golang:1.17-alpine3.16 AS opm-installer
RUN apk --no-cache add build-base
RUN GO111MODULE=on go get github.com/operator-framework/operator-registry/cmd/opm@v1.26.2

# Final stage
FROM alpine:3.17.1
RUN apk --no-cache add ca-certificates && addgroup -S tracker -g 1000 && adduser -S tracker -u 1000 -G tracker
USER 1000
WORKDIR /home/tracker
COPY --from=builder /tracker ./
COPY --from=opm-installer /go/bin/opm /usr/local/bin
CMD ["./tracker"]
