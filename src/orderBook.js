"use strict";

// Import the required debugging module
const debug = require("debug")("bfx:orderBook");

// OrderBook class for managing buy and sell orders
class OrderBook {
  // Initialize arrays to store buy and sell orders
  buys = [];
  sells = [];

  // Constructor for the OrderBook class
  constructor() {}

  // Method to initialize the order book with existing orders
  init(book) {
    // Iterate through the provided orders and add them to the order book
    book.forEach((order) => this.addOrder(order));
  }

  // Binary search for finding the index to insert an order into the array
  binarySearch(array, order, direction = 1) {
    const targetPrice = direction * order.price;
    let low = 0;
    let high = array.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);

      if (array[mid].price * direction === targetPrice) {
        // Or better still if prices are equal, sort by unique order IDs
        if (array[mid].id < order.id) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      } else if (array[mid].price * direction < targetPrice) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return low;
  }

  // Method to add an order to the order book
  addOrder(order) {
    if (order.amount > 0) {
      // Add buy orders (negative direction for sorting)
      const index = this.binarySearch(this.buys, order, -1);
      this.buys.splice(index, 0, order);
    } else {
      // Add sell orders (positive direction for sorting)
      const index = this.binarySearch(this.sells, order, 1);
      this.sells.splice(index, 0, order);
    }
    // Debugging: Log the buy and sell orders
    debug("Buy orders", this.buys);
    debug("Sell orders", this.sells);
  }

  // Method to fulfill an order
  fulfillOrder(order) {
    const matchedOrders = [];
    let remainingAmountToMatch = order.amount;

    if (remainingAmountToMatch > 0) {
      // Buy order fulfillment
      debug(`Buy lookup for ${remainingAmountToMatch} at ${order.price}`);
      debug("First Selling order:", this.sells[0]);

      while (remainingAmountToMatch > 0 && this.sells.length > 0 && order.price >= this.sells[0].price) {
        const matchedOrder = this.sells.shift();
        debug("Matching order:", matchedOrder);

        if (remainingAmountToMatch === -matchedOrder.amount) {
          // Exact match
          matchedOrders.push(matchedOrder);
          remainingAmountToMatch = 0;
        } else if (remainingAmountToMatch < -matchedOrder.amount) {
          // Partial match, reduce the remaining part of the sell order
          matchedOrder.amount += remainingAmountToMatch;
          this.sells.unshift(matchedOrder);
          remainingAmountToMatch = 0;
        } else {
          // Partial match, deduct the matched order's amount
          remainingAmountToMatch += matchedOrder.amount;
          matchedOrders.push(matchedOrder);
        }
        debug("Amount remaining to match", remainingAmountToMatch);
      }

      if (remainingAmountToMatch === 0) {
        matchedOrders.push(order);
      }
    } else {
      // Sell order fulfillment
      debug(`Sell lookup for ${remainingAmountToMatch} at ${order.price}`);
      debug("First Buying order:", this.buys[0]);

      while (remainingAmountToMatch < 0 && this.buys.length > 0 && order.price <= this.buys[0].price) {
        const matchedOrder = this.buys.shift();
        debug("Matching order:", matchedOrder);

        if (remainingAmountToMatch === -matchedOrder.amount) {
          // Exact match
          matchedOrders.push(matchedOrder);
          remainingAmountToMatch = 0;
        } else if (remainingAmountToMatch > -matchedOrder.amount) {
          // Partial match, reduce the remaining part of the buy order
          matchedOrder.amount += remainingAmountToMatch;
          this.buys.unshift(matchedOrder);
          remainingAmountToMatch = 0;
        } else {
          // Partial match, deduct the matched order's amount
          remainingAmountToMatch += matchedOrder.amount;
          matchedOrders.push(matchedOrder);
        }
        debug("Amount remaining to match", remainingAmountToMatch);
      }

      if (remainingAmountToMatch === 0) {
        matchedOrders.push(order);
      }
    }

    // Return the matched orders and the remaining amount to match
    return { matchedOrders, remainingAmountToMatch };
  }

  // Method to place a market order
  placeMarketOrder(order) {
    const { matchedOrders, remainingAmountToMatch } = this.fulfillOrder(order);
    debug("Matched orders:", matchedOrders);

    if (remainingAmountToMatch !== 0) {
      // Place the remaining part of the order in the order book
      order.amount = remainingAmountToMatch;
      this.addOrder(order);
    }

    // Return true if any orders were matched, otherwise false
    return matchedOrders.length > 0;
  }

  // Method to get the total number of orders in the order book
  getOrderBookLength() {
    return this.buys.length + this.sells.length;
  }

  // Method to retrieve all orders in the order book
  getAllOrders() {
    return [...this.buys, ...this.sells];
  }
}

// Export the OrderBook class for use in other modules
module.exports = OrderBook;
