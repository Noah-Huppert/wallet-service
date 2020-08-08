.PHONY: publish

PYTHON ?= python3
PIP_REPO ?= testpypi

DIST_DIR ?= dist
SRC_DIR ?= wallet_sdk

PKG ?= wallet_sdk
PKG_DASHED ?= $(shell echo ${PKG} | sed 's/_/-/g')
USERNAME ?= Noah_Huppert
VERSION ?= $(shell cat ${SRC_DIR}/VERSION)

FILE_PREFIX ?= 
DIST_FILES ?= ${DIST_DIR}/${PKG_DASHED}-${VERSION}.tar.gz ${DIST_DIR}/${PKG}-${VERSION}-py3-none-any.whl

# Build distribution files
${DIST_FILES}: $(wildcard ${SRC_DIR}/*.py)
	${PYTHON} ${SRC_DIR}/setup.py sdist bdist_wheel

# Publish distribution to pip
publish: ${DIST_FILES}
	${PYTHON} -m twine upload --repository ${PIP_REPO} --skip-existing ${DIST_FILES}
