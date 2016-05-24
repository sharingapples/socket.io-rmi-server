'use strict';

const Common = require('socket.io-rpc-common');
const RemoteCallback = require('./RemoteCallback');
const RemoteEventHandler = require('./RemoteEventHandler');

class ServerInstance {
  constructor(socket, srcInstance, namespace, actionMap) {
    Object.defineProperty(this, 'namespace', { value: namespace });
    Object.defineProperty(this, 'actions', { value: Object.keys(actionMap) });

    Object.keys(actionMap).forEach(name => {
      const v = actionMap[name];

      // Retieve the name of the event
      const event = Common.eventName(namespace, name);
      socket.on(event, (args, fn) => {
        // Check if there are any arguments that are a remote listener
        // These have to be dealt specially
        args.forEach((arg, index) => {
          if (arg && typeof arg === 'object') {
            if (arg.type === Common.TYPE_REMOTE_HANDLER) {
              args[index] = new RemoteEventHandler(socket, arg.namespace, arg.events);
            } else if (arg.type === Common.TYPE_CALLBACK) {
              args[index] = new RemoteCallback(socket, arg.namespace, arg.id);
            }
          }
        });

        // invoke the method
        const res = srcInstance[name].apply(srcInstance, args);
        if (v != null) {
          if (typeof v === 'object') {
            //console.log('Res ', res);
            const instance = new ServerInstance(socket, res, res.constructor.name, v);
            fn(instance);
          } else {
            fn(res);
          }
        } else {
          fn(null);
        }
      });
    });
  }

  toJSON() {
    return {
      type: Common.TYPE_REMOTE_INSTANCE,
      namespace: this.namespace,
      actions: this.actions,
    };
  }
}

ServerInstance.start = function (io, root, actionMap) {
  io.on('connection', socket => {
    const instance = new ServerInstance(socket, root, '', actionMap);
    socket.emit(Common.EVENT_CONNECTED, instance);
  });
};

module.exports = ServerInstance;
