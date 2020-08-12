.PHONY: clean build publish

PYTHON ?= python3
PIP_REPO ?= testpypi

DIST_DIR ?= dist
SRC_DIR ?= wallet_sdk

PKG ?= wallet_sdk
PKG_DASHED ?= $(shell echo ${PKG} | sed 's/_/-/g')
USERNAME ?= Noah_Huppert
USERNAME_DASHED ?= $(shell echo ${USERNAME} | sed 's/_/-/g')
VERSION ?= $(shell cat ${SRC_DIR}/VERSION)

DIST_FILES ?= ${DIST_DIR}/${PKG_DASHED}-${USERNAME_DASHED}-${VERSION}.tar.gz ${DIST_DIR}/${PKG}_${USERNAME}-${VERSION}-py3-none-any.whl

clean:
	rm -rf ${DIST_DIR}
	rm -rf build
	rm -rf *.egg-info

build: ${DIST_FILES}

# Build distribution files
${DIST_FILES}: $(wildcard ${SRC_DIR}/*)
	${PYTHON} ${SRC_DIR}/setup.py sdist bdist_wheel

# Publish distribution to pip
publish: ${DIST_FILES}
	${PYTHON} -m twine upload --repository ${PIP_REPO} --skip-existing ${DIST_FILES}
