# BFX Challenge

## Getting Started

### Clone the Project

To get started, clone the project repository by running the following command in your terminal:

```bash
git clone git@github.com:paulkagiri/bfx-challenge.git
```

### Install Project Dependencies

After cloning the repository, navigate to the project directory and install the necessary dependencies using npm:

```bash
cd bfx-challenge
npm install
```

### Setting up the DHT

The Distributed Hash Table (DHT) is an integral part of the project. To set up the DHT, you will need to install and run Grape servers. First, install the Grape server globally:

```bash
npm install -g grenache-grape
```

Now, you can start two Grape servers by running the following commands in separate terminal windows or tabs:

```bash
grape --dp 20001 --aph 30001 --bn '127.0.0.1:20002'
grape --dp 20002 --aph 40001 --bn '127.0.0.1:20001'
```

### Start the Clients

To run the clients, open different terminal or command prompt windows and run the following command for each client you want to start:

```bash
npm run client
```

You can start multiple clients to simulate interactions with the order book. If you need more detailed output for debugging purposes, use the following command instead:

```bash
npm run client:debug
```

## Implementation

In this project, each node serves as both a client and a server. The primary goal is to maintain a synchronized order book across all nodes in the network. Here's a brief overview of the implementation:

- Every node in the network maintains a synchronized order book.
- To accommodate new nodes joining at different times, a synchronization mechanism is in place to ensure that all nodes work with the same copy of the order book.
- When a new node joins the network, a mutex temporarily locks all write operations to the order book until the new node is fully synchronized and discovered by other participants (this process may take a few seconds).
- When a node submits a new order, it broadcasts the order to all other nodes.
- All nodes operate on the same order book copy and use the same matching algorithm to ensure consistent order matching.

## Known Issues

While the project is functional, there are some known issues that should be addressed:

1. **Code Organization**: The source code could benefit from being split into more files to enhance readability and maintainability.

2. **Synchronization Delay**: The synchronization and discovery of new nodes can take up to 10 seconds, which may be considered slow. Efforts to improve this delay could be explored.

3. **Client Cache**: When a client is aborted, its IP address remains in the DHT cache, which can generate network errors for other clients. Finding a way to correctly and completely disconnect a client from the DHT is a potential improvement. Additionally, a restart of the Grape servers may be required to flush the cache when restarting the client.
