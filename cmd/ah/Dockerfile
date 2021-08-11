# Build ah
FROM golang:1.16-alpine3.14 AS ah-builder
ARG VERSION
ARG GIT_COMMIT
WORKDIR /go/src/github.com/artifacthub/ah
COPY go.* ./
COPY cmd/ah cmd/ah
COPY internal internal
RUN cd cmd/ah && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-X main.version=$VERSION -X main.gitCommit=$GIT_COMMIT" -o /ah .

# Final stage
FROM alpine:3.14
RUN apk --no-cache add git
COPY --from=ah-builder /ah /usr/local/bin
