# Build helm-tracker
FROM golang:1.14-alpine AS builder
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/helm-tracker cmd/helm-tracker
COPY internal internal
RUN cd cmd/helm-tracker && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /helm-tracker .

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates && addgroup -S helm-tracker && adduser -S helm-tracker -G helm-tracker
USER helm-tracker
WORKDIR /home/helm-tracker
COPY --from=builder /helm-tracker ./
CMD ["./helm-tracker"]
