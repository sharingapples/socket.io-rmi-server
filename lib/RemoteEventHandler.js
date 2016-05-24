'use strict';

const Common = require('socket.io-rmi');

class RemoteEventHandler {
  constructor(socket, namespace, events) {
    events.forEach(name => {
      this[name] = function () {
        const args = Array.from(arguments);
        socket.emit(Common.eventName(namespace, name), args);
      };
    });
  }
}

module.exports = RemoteEventHandler;
