# Build backend
FROM golang:1.15-alpine3.12 AS backend-builder
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/hub cmd/hub
COPY internal internal
RUN cd cmd/hub && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /hub .

# Build frontend
FROM node:13-alpine AS frontend-builder
WORKDIR /web
COPY web .
RUN yarn install
RUN yarn build

# Build docs
FROM klakegg/hugo:0.78.2 AS docs-builder
WORKDIR /
COPY scripts scripts
COPY docs docs
RUN scripts/prepare-docs.sh
RUN cd docs/www && hugo

# Final stage
FROM alpine:3.12
RUN apk --no-cache add ca-certificates && addgroup -S hub && adduser -S hub -G hub
USER hub
WORKDIR /home/hub
COPY --from=backend-builder /hub ./
COPY --from=frontend-builder /web/build ./web
COPY --from=frontend-builder /web/yarn.lock ./web
COPY --from=docs-builder /web/build/docs ./web/docs
CMD ["./hub"]
EXPOSE 8000
