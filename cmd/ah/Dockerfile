# Build ah
FROM golang:1.19.0-alpine3.15 AS ah-builder
ARG VERSION
ARG GIT_COMMIT
WORKDIR /go/src/github.com/artifacthub/ah
COPY go.* ./
COPY cmd/ah cmd/ah
COPY internal internal
WORKDIR /go/src/github.com/artifacthub/ah/cmd/ah
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-X main.version=$VERSION -X main.gitCommit=$GIT_COMMIT" -o /ah .

# Final stage
FROM alpine:3.15
RUN apk --no-cache add git && addgroup -S ah && adduser -S ah -G ah
USER ah
COPY --from=ah-builder /ah /usr/local/bin
