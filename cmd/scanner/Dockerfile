ARG TRIVY_VERSION=0.69.3

# Build scanner
FROM golang:1.26.1-alpine3.23 AS scanner-builder
WORKDIR /go/src/github.com/artifacthub/scanner
COPY go.* ./
COPY cmd/scanner cmd/scanner
COPY internal internal
WORKDIR /go/src/github.com/artifacthub/scanner/cmd/scanner
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /scanner .

# Trivy installer
FROM alpine:3.23.3 AS trivy-installer
ARG TRIVY_VERSION
RUN apk --no-cache add curl
RUN curl -sfL "https://raw.githubusercontent.com/aquasecurity/trivy/v${TRIVY_VERSION}/contrib/install.sh" \
    | sh -s -- -b /usr/local/bin "v${TRIVY_VERSION}"

# Final stage
FROM alpine:3.23.3
RUN apk --no-cache add ca-certificates && addgroup -S scanner -g 1000 && adduser -S scanner -u 1000 -G scanner
USER 1000
WORKDIR /home/scanner
COPY --from=scanner-builder /scanner ./
COPY --from=trivy-installer /usr/local/bin/trivy /usr/local/bin
CMD ["./scanner"]
