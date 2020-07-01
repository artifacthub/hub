# Build falco-tracker
FROM golang:1.14-alpine AS builder
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/falco-tracker cmd/falco-tracker
COPY internal internal
RUN cd cmd/falco-tracker && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /falco-tracker .

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates && addgroup -S falco-tracker && adduser -S falco-tracker -G falco-tracker
USER falco-tracker
WORKDIR /home/falco-tracker
COPY --from=builder /falco-tracker ./
CMD ["./falco-tracker"]
