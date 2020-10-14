# Build backend
FROM golang:1.15-alpine AS backend-builder
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

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates && addgroup -S hub && adduser -S hub -G hub
USER hub
WORKDIR /home/hub
COPY --from=backend-builder /hub ./
COPY --from=frontend-builder /web/build ./web
COPY --from=frontend-builder /web/yarn.lock ./web
CMD ["./hub"]
EXPOSE 8000
