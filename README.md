[![CircleCI](https://circleci.com/gh/w3f/polkadot-watcher-transaction.svg?style=svg)](https://circleci.com/gh/w3f/polkadot-watcher-transaction)

# polkadot-watcher-transaction

## How to Run 

### Requirements
- yarn: https://classic.yarnpkg.com/en/docs/install/

```bash
git clone https://github.com/w3f/polkadot-watcher-csv-exporter.git
cd polkadot-watcher-csv-exporter
cp config/main.sample.yaml config/main.yaml 
#just the first time

yarn
yarn build
yarn start
```

## About 

The main use case of this application consits of a scanner that can be configured to start from a configured block number, and then it keeps monitoring the on-chain situation delivering alerts to a notifier. For instance, you can deliver the alerts to a matrixbot instance, which will forward the message to a Matrix/Synapse channel.

### Monitoring Features

- detection of [BalanceTransfer](https://polkadot.js.org/docs/substrate/events#transferaccountid32-accountid32-u128) events (sent to a Notifier)
- detection of account's Balance under a certain threshold (exposed as Prometheus metrics)

## Configuration

A sample config file is provided [here](/config/main.sample.yaml)
