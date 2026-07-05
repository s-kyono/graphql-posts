FROM axllent/mailpit:v1.30.1 AS mailpit

FROM alpine:3.22

RUN apk upgrade --no-cache \
  && apk add --no-cache ca-certificates tzdata

COPY --from=mailpit /mailpit /mailpit

EXPOSE 1025/tcp 8025/tcp

HEALTHCHECK --interval=15s --start-period=10s CMD ["/mailpit", "readyz"]

ENTRYPOINT ["/mailpit"]
CMD ["--smtp", "0.0.0.0:1025", "--listen", "0.0.0.0:8025", "--label", "graphql-posts dev mail"]
