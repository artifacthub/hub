# Build tracker
FROM golang:1.27.3-alpine3.24 AS builder
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/tracker cmd/tracker
COPY internal internal
WORKDIR /go/src/github.com/artifacthub/hub/cmd/tracker
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /tracker .

# Final stage
FROM alpine:3.24.3
RUN apk --no-cache add ca-certificates && addgroup -S tracker -g 1000 && adduser -S tracker -u 1000 -G tracker
USER 1000
WORKDIR /home/tracker
COPY --from=builder /tracker ./
CMD ["./tracker"]
