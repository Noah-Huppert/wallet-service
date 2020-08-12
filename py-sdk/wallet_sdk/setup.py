import setuptools
import os

DIR = os.path.dirname(os.path.realpath(__file__))

VERSION = None
with open(os.path.join(DIR, "VERSION"), 'r') as f:
    VERSION = f.read().replace("\n", "")

with open(os.path.join(DIR, "../README.md"), 'r') as fh:
    long_description = fh.read()

setuptools.setup(
    name="wallet-sdk-Noah-Huppert",
    version=VERSION,
    author="Noah Huppert",
    author_email="contact@noahh.io",
    description="Wallet service API SDK",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Noah-Huppert/wallet-service/tree/master/py-sdk",
    packages=setuptools.find_packages(),
    install_requires=[ 'pyjwt', 'requests', 'voluptuous' ],
    include_package_data=True, # So the files specified in MANIFEST.in are included
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.6',
)
