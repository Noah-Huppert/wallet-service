# Wallet Server
Wallet service HTTP API.

# Table Of Contents
- [Overview](#overview)
- [Development](#development)

# Overview
Nodejs server which provides an HTTP API and stores data in MongoDB.

# Development
Install dependencies:

```
npm install
```

Start the API server:

```
npm start
```

Create a new authority from a JSON file. This JSON file should contain authority
data in the form of the Authority model schema.

```
npm start create-authority <json file>
```

Generate a new key pair. Used to authenticate authorities. 

```
npm start authority-keygen
```
