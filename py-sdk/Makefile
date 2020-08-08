.PHONY: publish

PYTHON ?= python3
PIP_REPO ?= testpypi

DIST_DIR ?= dist
SRC_DIR ?= wallet_sdk

FILE_PREFIX ?= ${PKG}-${VERSION}
DIST_FILES ?= ${DIST_DIR}/${FILE_PREFIX}.tar.gz ${DIST_DIR}/${FILE_PREFIX}-none-any.whl

PKG ?= wallet_sdk
USERNAME ?= Noah_Huppert
VERSION ?= $(shell cat ${SRC_DIR}/VERSION)

# Build distribution files
${DIST_FILES}: $(wildcard ${SRC_DIR}/*.py)
	${PYTHON} ${SRC_DIR}/setup.py sdist bdist_wheel

# Publish distribution to pip
publish: ${DIST_FILES}
	${PYTHON} -m twine upload --repository ${PIP_REPO} --skip-existing ${DIST_DIR}/*
