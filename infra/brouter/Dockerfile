# BRouter routing server with the three Harz hiking profiles. Build context: repository root.
# Segment files (*.rd5) are not part of the image: mount them at /segments (scripts/brouter/download-segments.sh).
FROM alpine:3.22 AS fetch
ARG BROUTER_VERSION=1.7.10
ARG BROUTER_SHA256=023fec3ba997758e8cd7ab9e1bae52e962af3f00b57683e3de86b84ffad01532
RUN apk add --no-cache curl
RUN curl -fsSL -o /tmp/brouter.zip \
      "https://github.com/abrensch/brouter/releases/download/v${BROUTER_VERSION}/brouter-${BROUTER_VERSION}.zip" \
 && echo "${BROUTER_SHA256}  /tmp/brouter.zip" | sha256sum -c - \
 && unzip -q /tmp/brouter.zip -d /tmp \
 && mkdir -p /out/profiles /out/customprofiles \
 && cp "/tmp/brouter-${BROUTER_VERSION}/brouter-${BROUTER_VERSION}-all.jar" /out/brouter.jar \
 && cp "/tmp/brouter-${BROUTER_VERSION}/profiles2/lookups.dat" /out/profiles/
COPY infra/brouter/profiles/make-profiles.sh /tmp/make-profiles.sh
RUN sh /tmp/make-profiles.sh "/tmp/brouter-${BROUTER_VERSION}/profiles2/hiking-mountain.brf" /out/profiles

FROM eclipse-temurin:21-jre-alpine
COPY --from=fetch /out /brouter
RUN addgroup -S brouter && adduser -S -G brouter brouter && chown -R brouter:brouter /brouter/customprofiles
USER brouter
ENV JAVA_OPTS="-Xmx300m -Xms64m -Xss4m -XX:+UseSerialGC" \
    MAX_THREADS=4
EXPOSE 17777
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- "http://127.0.0.1:17777/brouter?lonlats=10.5393,51.8108|10.5450,51.8120&profile=harz-trails&format=geojson" >/dev/null || exit 1
CMD ["sh", "-c", "exec java $JAVA_OPTS -cp /brouter/brouter.jar btools.server.RouteServer /segments /brouter/profiles /brouter/customprofiles 17777 $MAX_THREADS 0.0.0.0"]
