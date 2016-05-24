'use strict';

const Common = require('socket.io-rpc-common');

class RemoteCallback {
  constructor(socket, namespace, id) {
    return function () {
      const args = Array.from(arguments);
      socket.emit(Common.eventCallbackName(namespace, id), args);
    };
  }
}

module.exports = RemoteCallback;
