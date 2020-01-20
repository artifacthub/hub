# Build tern
FROM golang:1.13-alpine AS builder
RUN apk --no-cache add git
RUN go get -u github.com/jackc/tern

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates && addgroup -S db-migrator && adduser -S db-migrator -G db-migrator
USER db-migrator
WORKDIR /home/db-migrator
COPY --from=builder /go/bin/tern .
COPY database/migrations .
COPY configs/tern.conf tern.conf
CMD ["./tern", "migrate"]
