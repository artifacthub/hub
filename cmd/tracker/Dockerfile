# Build tracker
FROM golang:1.25.4-trixie AS builder
WORKDIR /tmp
ENV LIBTENSORFLOW_TGZ=libtensorflow-cpu-linux-x86_64-2.11.0.tar.gz
RUN wget -q --no-check-certificate https://storage.googleapis.com/tensorflow/libtensorflow/$LIBTENSORFLOW_TGZ
RUN tar -C /usr/local -xzf $LIBTENSORFLOW_TGZ
RUN ldconfig /usr/local/lib
WORKDIR /go/src/github.com/artifacthub/hub
COPY go.* ./
COPY cmd/tracker cmd/tracker
COPY internal internal
WORKDIR /go/src/github.com/artifacthub/hub/cmd/tracker
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o /tracker .

# Final stage
FROM debian:trixie-slim
RUN apt-get update \
    && apt-get install -y ca-certificates \
    && groupadd -g 1000 tracker \
    && useradd -u 1000 -g tracker tracker
WORKDIR /tmp
ENV LIBTENSORFLOW_TGZ=libtensorflow-cpu-linux-x86_64-2.11.0.tar.gz
RUN apt-get install -y wget \
    && export LIBTENSORFLOW_TGZ=libtensorflow-cpu-linux-x86_64-2.11.0.tar.gz \
    && wget -q --no-check-certificate https://storage.googleapis.com/tensorflow/libtensorflow/$LIBTENSORFLOW_TGZ \
    && tar -C /usr/local -xzf $LIBTENSORFLOW_TGZ \
    && rm $LIBTENSORFLOW_TGZ \
    && wget -O /usr/local/bin/opm https://github.com/operator-framework/operator-registry/releases/download/v1.60.0/linux-amd64-opm \
    && chmod +x /usr/local/bin/opm \
    && apt-get remove -y wget \
    && ldconfig /usr/local/lib
USER 1000
WORKDIR /home/tracker
COPY ml ./ml
COPY --from=builder /tracker ./
CMD ["./tracker"]
