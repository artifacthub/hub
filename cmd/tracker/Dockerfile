ARG OPM_VERSION=1.60.0

# Build tracker
FROM golang:1.27.3-alpine3.24 AS builder
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/tracker cmd/tracker
COPY internal internal
WORKDIR /go/src/github.com/artifacthub/hub/cmd/tracker
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /tracker .

# OPM installer
FROM alpine:3.24.3 AS opm-installer
ARG OPM_VERSION
RUN apk --no-cache add curl
RUN curl -sfL -o /usr/local/bin/opm "https://github.com/operator-framework/operator-registry/releases/download/v${OPM_VERSION}/linux-amd64-opm" \
    && chmod +x /usr/local/bin/opm

# Final stage
FROM alpine:3.24.3
RUN apk --no-cache add ca-certificates && addgroup -S tracker -g 1000 && adduser -S tracker -u 1000 -G tracker
USER 1000
WORKDIR /home/tracker
COPY --from=builder /tracker ./
COPY --from=opm-installer /usr/local/bin/opm /usr/local/bin
CMD ["./tracker"]
