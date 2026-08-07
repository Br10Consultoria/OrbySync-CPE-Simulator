FROM node:22-alpine

ARG GENIEACS_SIM_COMMIT=be391cab6d586a1e98cd65e57f7cd7ae715be791

RUN apk add --no-cache git tini \
  && git clone https://github.com/genieacs/genieacs-sim.git /opt/genieacs-sim \
  && cd /opt/genieacs-sim \
  && git checkout "${GENIEACS_SIM_COMMIT}" \
  && npm install --omit=dev \
  && rm -rf /root/.npm /opt/genieacs-sim/.git

WORKDIR /app
COPY src ./src
COPY profiles ./profiles

RUN addgroup -S simulator && adduser -S simulator -G simulator \
  && chown -R simulator:simulator /app

USER simulator
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "/app/src/launcher.js"]

