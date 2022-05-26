# Build scanner
FROM golang:1.18-alpine3.15 AS scanner-builder
WORKDIR /go/src/github.com/artifacthub/scanner
COPY go.* ./
COPY cmd/scanner cmd/scanner
COPY internal internal
WORKDIR /go/src/github.com/artifacthub/scanner/cmd/scanner
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /scanner .

# Trivy installer
FROM alpine:3.15 AS trivy-installer
RUN apk --no-cache add curl
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/master/contrib/install.sh | sh -s -- -b /usr/local/bin v0.28.1

# Final stage
FROM alpine:3.15
RUN apk --no-cache add ca-certificates && addgroup -S scanner && adduser -S scanner -G scanner
USER scanner
WORKDIR /home/scanner
COPY --from=scanner-builder /scanner ./
COPY --from=trivy-installer /usr/local/bin/trivy /usr/local/bin
CMD ["./scanner"]
