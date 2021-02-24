# Build tern
FROM golang:1.16-alpine3.13 AS tern
RUN apk --no-cache add git
RUN go get -u github.com/jackc/tern

# Build final image
FROM alpine:3.13
RUN addgroup -S db-migrator && adduser -S db-migrator -G db-migrator
USER db-migrator
WORKDIR /home/db-migrator
COPY --from=tern /go/bin/tern /usr/local/bin
COPY database/migrations .
