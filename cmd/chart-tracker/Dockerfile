# Build chart-tracker
FROM golang:1.14-alpine AS builder
WORKDIR /go/src/github.com/cncf/hub
COPY go.* ./
COPY cmd/chart-tracker cmd/chart-tracker
COPY internal internal
RUN cd cmd/chart-tracker && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /chart-tracker .

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates && addgroup -S chart-tracker && adduser -S chart-tracker -G chart-tracker
USER chart-tracker
WORKDIR /home/chart-tracker
COPY --from=builder /chart-tracker ./
CMD ["./chart-tracker"]
