"use strict";

// Import required modules and libraries
const { setTimeout } = require("timers/promises");
const { PeerRPCServer, PeerRPCClient } = require("grenache-nodejs-http");
const Link = require("grenache-nodejs-link");
const OrderBook = require("./orderBook");
const Mutex = require("./mutex");

// Create a debug logger
const debug = require("debug")("bfx:client");

// Configure network parameters
const networkIp = "127.0.0.1";
const link = new Link({
  grape: `http://${networkIp}:30001`
});
link.start();

// Initialize PeerRPCServer and PeerRPCClient
const peerServer = new PeerRPCServer(link, { timeout: 300000 });
peerServer.init();
const peerClient = new PeerRPCClient(link, {});
peerClient.init();

// Generate a unique client ID based on the address and port
const port = 1024 + Math.floor(Math.random() * 1000);
const clientId = `${networkIp}:${port}`;

// Initialize the PeerRPCServer service
const service = peerServer.transport("server");
service.listen(port);
debug(`Client listening on port ${port}`);

// Create an instance of OrderBook and Mutex
const orderBook = new OrderBook();
const mutex = new Mutex();

// Handle incoming requests
service.on("request", (rid, key, payload, handler) => {
  switch (key) {
    case "mutex:lock":
      mutex.lockClient(payload);
      handler.reply(null, { success: true });
      break;
    case "mutex:unlock":
      mutex.unlockClient(payload);
      handler.reply(null, { success: true });
      break;
    case "book:sync":
      handler.reply(null, { orderBook: orderBook.getAllOrders() });
      break;
    case "order:new":
      debug("Received a new order:", payload.price, payload.amount);
      const order = {
        ...payload,
        id: rid // Use a unique order ID
      };
      const isFulfilled = orderBook.placeMarketOrder(order);
      debug(`Was the market order fulfilled?`, isFulfilled);
      debug(`Order book length: ${orderBook.getOrderBookLength()}`);
      handler.reply(null, { success: true, isFulfilled, nbOrders: orderBook.getOrderBookLength() });
      break;
    default:
      debug(`Unknown request type: ${key}`);
  }
});

// Function to request a mutex lock from all connected nodes
const askMutexLock = async (clientId) => {
  return new Promise((resolve, reject) => {
    debug("Requesting a mutex lock from all connected nodes");
    peerClient.map("mutex:lock", clientId, { timeout: 10000 }, (err, data) => {
      if (err) {
        if (err.message === "ERR_GRAPE_LOOKUP_EMPTY") {
          // This node is the first node in the network
          resolve();
          return;
        } else {
          console.error("mutex:lock error:", err.message);
          reject(err);
          return;
        }
      }
      debug("mutex:lock response:", data);
      resolve();
    });
  });
};

// Function to release the mutex lock for all connected nodes
const releaseMutexLock = async (clientId) => {
  return new Promise((resolve, reject) => {
    debug("Releasing the mutex lock for all connected nodes");
    peerClient.map("mutex:unlock", clientId, { timeout: 10000 }, (err, data) => {
      if (err) {
        if (err.message === "ERR_GRAPE_LOOKUP_EMPTY") {
          // This node is the first node in the network
          resolve();
          return;
        } else {
          console.error("mutex:unlock error:", err.message);
          reject(err);
          return;
        }
      }
      debug("mutex:unlock response:", data);
      resolve();
    });
  });
};

// Function to sync the order book from another node on startup
const syncOrderBook = async () => {
  return new Promise((resolve, reject) => {
    debug("Syncing the order book");
    peerClient.request("book:sync", {}, { timeout: 10000 }, (err, data) => {
      if (err) {
        if (err.message === "ERR_GRAPE_LOOKUP_EMPTY") {
          // This node is the first node in the network, no orders to sync
          resolve();
          return;
        } else {
          console.error("book:sync error:", err.message);
          reject(err);
          return;
        }
      }
      orderBook.init(data.orderBook);
      resolve();
    });
  });
};

// Function to submit a new order
const submitNewOrder = async (price, amount) => {
  // Wait for all locks to be released
  while (mutex.isAnyClientLocked()) {
    debug("Waiting for client locks to be released...");
    await setTimeout(100);
  }

  // Broadcast the new order to all nodes
  return new Promise((resolve, reject) => {
    debug("Submitting a new order:", price, amount);
    peerClient.map("order:new", { price, amount }, { timeout: 10000 }, (err, data) => {
      if (err) {
        console.error("order:new error:", err.message);
        reject(err);
        return;
      }
      debug("order:new response:", data);
      resolve();
    });
  });
};

// Function to wait for a client to be registered in the network
const waitForClientToBeRegistered = async (clientId) => {
  let isClientRegistered = false;
  let tries = 0;

  do {
    try {
      await new Promise((resolve, reject) => {
        debug(`Looking up the current client #${tries}`);
        link.lookup("order:new", { timeout: 10000 }, (err, data) => {
          if (err) {
            console.error("lookup error:", err.message);
            reject(err);
            return;
          }
          debug("lookup response:", data);
          isClientRegistered = data.includes(clientId);
          resolve();
        });
      });
    } catch (e) {
      debug("Error in lookup", e.message);
    }
    tries++;
    await setTimeout(10000); // Allow time for a new node to be discoverable by the network
  } while (!isClientRegistered && tries < 100);

  if (!isClientRegistered) {
    throw new Error("Unable to find the client registered on the Grape");
  }
};