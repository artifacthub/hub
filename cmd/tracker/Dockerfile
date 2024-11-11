# Build tracker
FROM golang:1.23.3-bullseye AS builder
WORKDIR /tmp
ENV LIBTENSORFLOW_TGZ libtensorflow-cpu-linux-x86_64-2.11.0.tar.gz
RUN wget -q --no-check-certificate https://storage.googleapis.com/tensorflow/libtensorflow/$LIBTENSORFLOW_TGZ
RUN tar -C /usr/local -xzf $LIBTENSORFLOW_TGZ
RUN ldconfig /usr/local/lib
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/tracker cmd/tracker
COPY internal internal
WORKDIR /go/src/github.com/artifacthub/hub/cmd/tracker
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o /tracker .

# OPM installer
FROM golang:1.23-bullseye AS opm-installer
WORKDIR /tmp
RUN git clone https://github.com/operator-framework/operator-registry
WORKDIR /tmp/operator-registry/cmd/opm
RUN git checkout v1.47.0
RUN go install

# Final stage
FROM debian:bullseye-slim
RUN apt-get update \
    && apt-get install -y ca-certificates \
    && groupadd -g 1000 tracker \
    && useradd -u 1000 -g tracker tracker
WORKDIR /tmp
ENV LIBTENSORFLOW_TGZ libtensorflow-cpu-linux-x86_64-2.11.0.tar.gz
RUN apt-get install -y wget \
    && export LIBTENSORFLOW_TGZ=libtensorflow-cpu-linux-x86_64-2.11.0.tar.gz \
    && wget -q --no-check-certificate https://storage.googleapis.com/tensorflow/libtensorflow/$LIBTENSORFLOW_TGZ \
    && tar -C /usr/local -xzf $LIBTENSORFLOW_TGZ \
    && rm $LIBTENSORFLOW_TGZ \
    && apt-get remove -y wget \
    && ldconfig /usr/local/lib
USER 1000
WORKDIR /home/tracker
COPY ml ./ml
COPY --from=builder /tracker ./
COPY --from=opm-installer /go/bin/opm /usr/local/bin
CMD ["./tracker"]
