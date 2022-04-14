# Build backend
FROM golang:1.18-alpine3.15 AS backend-builder
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/hub cmd/hub
COPY internal internal
WORKDIR /go/src/github.com/artifacthub/hub/cmd/hub
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /hub .

# Build frontend
FROM node:14-alpine3.15 AS frontend-builder
RUN apk --no-cache add jq
WORKDIR /web
COPY web .
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN yarn install
RUN yarn build

# Build widget
FROM node:14-alpine3.15 AS widget-builder
WORKDIR /widget
COPY widget .
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN yarn install
RUN yarn build

# Build docs
FROM klakegg/hugo:0.78.2 AS docs-builder
WORKDIR /
COPY scripts scripts
COPY docs docs
RUN scripts/prepare-docs.sh
WORKDIR /docs/www
RUN hugo

# Final stage
FROM alpine:3.15
RUN apk --no-cache add ca-certificates && addgroup -S hub && adduser -S hub -G hub
USER hub
WORKDIR /home/hub
COPY --from=backend-builder /hub ./
COPY --from=frontend-builder /web/build ./web
COPY --from=frontend-builder /web/package.json ./web
COPY --from=widget-builder /widget/build ./widget
COPY --from=docs-builder /web/build/docs ./web/docs
COPY --from=docs-builder /docs/api ./web/docs/api
CMD ["./hub"]
EXPOSE 8000
