# Build opa-tracker
FROM golang:1.14-alpine AS builder
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/opa-tracker cmd/opa-tracker
COPY internal internal
RUN cd cmd/opa-tracker && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /opa-tracker .

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates && addgroup -S opa-tracker && adduser -S opa-tracker -G opa-tracker
USER opa-tracker
WORKDIR /home/opa-tracker
COPY --from=builder /opa-tracker ./
CMD ["./opa-tracker"]
