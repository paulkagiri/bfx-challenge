"use strict";

// Import required modules and libraries
const { PeerRPCServer, PeerRPCClient } = require("grenache-nodejs-http");
const Link = require("grenache-nodejs-link");

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

// Initialize the PeerRPCServer service
const service = peerServer.transport("server");
service.listen(port);
debug(`Client listening on port ${port}`);
