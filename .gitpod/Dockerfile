FROM gitpod/workspace-postgres

RUN sudo apt-get update && \
    sudo apt-get install -y rpm && \
    sudo rm -rf /var/lib/apt/lists/*
RUN wget https://github.com/aquasecurity/trivy/releases/download/v0.12.0/trivy_0.12.0_Linux-64bit.deb && \
    sudo dpkg -i trivy_0.12.0_Linux-64bit.deb
RUN sudo wget https://github.com/operator-framework/operator-registry/releases/download/v1.15.2/linux-amd64-opm -O /usr/local/bin/opm && \
    sudo chmod +x /usr/local/bin/opm
