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
}

// Export the OrderBook class for use in other modules
module.exports = OrderBook;
