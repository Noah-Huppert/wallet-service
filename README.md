# Wallet Service
Generic service to record user transactions. 

# Table Of Contents
- [Overview](#overview)

# Overview
The purpose of this service is to track the amount of value associated with
a user. 

Only trusted clients can add and remove value. These clients are 
named **authorities.** The service uses ECDSA key pairs to authenticate API
calls from authorities.

A Python 3 SDK (pip package `wallet-sdk`) is provided.

See the [`server/`](./server) and [`py-sdk/`](./py-sdk) directories.
