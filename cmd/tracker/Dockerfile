# Build tracker
FROM golang:1.14-alpine AS builder
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/tracker cmd/tracker
COPY internal internal
RUN cd cmd/tracker && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /tracker .

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates && addgroup -S tracker && adduser -S tracker -G tracker
USER tracker
WORKDIR /home/tracker
COPY --from=builder /tracker ./
CMD ["./tracker"]
