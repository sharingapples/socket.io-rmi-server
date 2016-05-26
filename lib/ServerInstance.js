'use strict';

const Common = require('socket.io-rmi');
const RemoteCallback = require('./RemoteCallback');
const RemoteEventHandler = require('./RemoteEventHandler');

class ServerInstance {
  constructor(socket, srcInstance, namespace, actionMap) {
    Object.defineProperty(this, 'namespace', { value: namespace });
    Object.defineProperty(this, 'actions', { value: Object.keys(actionMap) });

    Object.keys(actionMap).forEach(name => {
      // Let's make sure the srcInstance contains all the actions mentioned in
      // the action map, if not throw an exception.
      if (typeof srcInstance[name] !== 'function') {
        throw new Error(`The action ${name} defined in the RMI map is not a function ` +
                        `in the ${srcInstance.constructor.name} class. A RMI method ` +
                        `invokation will fail in that case. Please fix this error ` +
                        `on the server`);
      }

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
            try {
              const instance = new ServerInstance(socket, res, res.constructor.name, v);
              fn(instance);
            } catch (e) {
              fn(e);
            }
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

ServerInstance.start = function (io, RMIClass, actionMap) {
  io.on('connection', socket => {
    const instance = new RMIClass();
    if (typeof instance.destructor === 'function') {
      socket.on('disconnect', () => {
        // Send the event to our instance on the server, which could be used to
        // clean up once the client is disconnected
        instance.destructor();
      });
    }

    try {
      socket.emit(Common.EVENT_CONNECTED, new ServerInstance(socket, instance, '', actionMap));
    } catch (e) {
      socket.emit(Common.EVENT_ERROR, { type: Common.TYPE_ERROR, message: e.message });
      socket.disconnect();
    }
  });
};

module.exports = ServerInstance;
