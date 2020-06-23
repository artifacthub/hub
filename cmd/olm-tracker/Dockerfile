# Build olm-tracker
FROM golang:1.14-alpine AS builder
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/olm-tracker cmd/olm-tracker
COPY internal internal
RUN cd cmd/olm-tracker && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /olm-tracker .

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates && addgroup -S olm-tracker && adduser -S olm-tracker -G olm-tracker
USER olm-tracker
WORKDIR /home/olm-tracker
COPY --from=builder /olm-tracker ./
CMD ["./olm-tracker"]
