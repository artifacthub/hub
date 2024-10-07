FROM gitpod/workspace-postgres

RUN wget https://github.com/aquasecurity/trivy/releases/download/v0.56.1/trivy_0.56.1_Linux-64bit.deb \
    && sudo dpkg -i trivy_0.56.1_Linux-64bit.deb
RUN sudo wget https://github.com/operator-framework/operator-registry/releases/download/v1.47.0/linux-amd64-opm -O /usr/local/bin/opm \
    && sudo chmod +x /usr/local/bin/opm
RUN wget https://storage.googleapis.com/tensorflow/libtensorflow/libtensorflow-cpu-linux-x86_64-2.11.0.tar.gz \
    && sudo tar -C /usr/local -xzf libtensorflow-cpu-linux-x86_64-2.11.0.tar.gz \
    && sudo ldconfig /usr/local/lib
