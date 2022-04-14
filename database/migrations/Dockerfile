# Build tern
FROM golang:1.18-alpine3.15 AS tern
RUN apk --no-cache add git
RUN go install github.com/jackc/tern@latest

# Build final image
FROM alpine:3.15
RUN addgroup -S db-migrator && adduser -S db-migrator -G db-migrator
USER db-migrator
WORKDIR /home/db-migrator
COPY --from=tern /go/bin/tern /usr/local/bin
COPY database/migrations .
