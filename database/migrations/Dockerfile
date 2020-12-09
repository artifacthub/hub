# Build tern
FROM golang:1.15-alpine3.12 AS tern
RUN apk --no-cache add git
RUN go get -u github.com/jackc/tern

# Build final image
FROM alpine:3.12
RUN addgroup -S db-migrator && adduser -S db-migrator -G db-migrator
USER db-migrator
WORKDIR /home/db-migrator
COPY --from=tern /go/bin/tern /usr/local/bin
COPY database/migrations .
