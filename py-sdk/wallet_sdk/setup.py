import setuptools

with open("../README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="wallet-sdk",
    version="0.1.1",
    author="Noah Huppert",
    author_email="contact@noahh.io",
    description="Wallet service API SDK",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Noah-Huppert/wallet-service/py-sdk",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.6',
)
