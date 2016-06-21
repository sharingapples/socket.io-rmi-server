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
        try {
          const res = srcInstance[name].apply(srcInstance, args);
          this._processResponse(socket, res, actionMap[name], fn);
        } catch (e) {
          if (e instanceof Common.UncatchableError) {
            socket.emit(Common.EVENT_ERROR, e);
          } else {
            this._processResponse(socket, e, 'error', fn);
          }
        }
      });
    });
  }

  _processResponse(socket, result, resultMappedType, callback) {
    if (result instanceof Promise) {
      result.then(res => {
        this._processResponse(socket, res, resultMappedType, callback);
      }).catch(err => {
        if (err instanceof Common.UncatchableError) {
          socket.emit(Common.EVENT_ERROR, e);
        } else {
          this._processResponse(socket, err, 'error', callback);
        }
      });
    } else if (resultMappedType !== null) {
      if (typeof resultMappedType === 'object') {
        try {
          const instance = new ServerInstance(socket,
                  result, result.constructor.name, resultMappedType);
          callback(instance);
        } catch (e) {
          callback(e);
        }
      } else if (resultMappedType === 'error') {
        const error = typeof result.toJSON === 'function' ?
              result.toJSON() : { message: result.message };
        callback({ type: Common.EVENT_ERROR, error: error });
      } else {
        callback(result);
      }
    } else {
      callback(null);
    }
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

ServerInstance.UncatchableError = Common.UncatchableError;
ServerInstance.Redirection = Common.Redirection;
module.exports = ServerInstance;
