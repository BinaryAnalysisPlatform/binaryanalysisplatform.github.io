FROM binaryanalysisplatform/bap:latest

WORKDIR /home/opam
COPY build.sh /home/opam/build.sh
COPY commit /home/opam/commit

RUN sudo apt-get install emacs-nox man2html --yes \
  && eval $(opam env) \
  && opam install odig --yes \
  && ./build.sh

ENTRYPOINT ["sh"]
