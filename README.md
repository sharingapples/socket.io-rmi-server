# RMI Server (RPC Server)
![NPM version](https://badge.fury.io/js/socket.io-rmi-server.svg)

RMIServer is a simple RPC Server implementation that allows you to
convert your existing classes to be used over network with very little or
no change on your code base.

Under the hood it uses the awesome
[socket.io](https://github.com/socket.io/socket.io) library and uses
its event propagation mechanism for making all the calls.

The RMI Server has to be used in conjunction with its client
counter part available at
https://github.com/sharingapples/socket.io-rmi-client. The client server
combination allows you to write code without thinking much about the
underlying network communication.

### Installation
Using [npm](https://www.npmjs.com/):

    $ npm install --save socket.io-rmi-server

Since the socket.io library could be used in different application
context, I couldn't bundle the socket.io within the library
itself. So, you will have to install the socket.io library and
define how you are going to use it. Please check
http://socket.io/docs/ to see how the socket.io could be used with
different server libraries (expressjs, node http server, etc).

    $ npm install --save socket.io

You could then use any class to work with the socket.io through
RMI. Consider the following example of a normal class module.

```js
// ExampleClass.js module

'use strict';

class ExampleClass {
  exampleMethod(arg1, arg2) {
    return arg1 + arg2;
  }
}

module.exports = ExampleClass
```

You could then use the given class and initialize it with the
RMI Server
```js
  'use strict';
  // Create your application server,
  const app = require('express')();
  const server = require('http').Server(app);

  // Important, this is the instance needed for RMI
  const io = require('socket.io')(server);

  // The sample class that we are going to bind to RMI
  const ExampleClass = require('./ExampleClass');

  // Start your server
  server.listen(80);

  // Bind your example class with RMI Server
  RMIServer.start(io, ExampleClass, {
    exampleMethod: 'string',
  });
```

That's it, now you could create an instance of the `ExampleClass`
from a remote client and invoke its exampleMethod remotely. No
additional code needed.

### How does it work
The RMIServer hooks up the `ExampleClass` as an entry point for
the RPC calls. As soon as a RMI client establishes a connection,
the server creates an instance of the `ExampleClass`. The client
side receives a proxy of this instance. The map provided as the
third argument now becomes important. The map provides the
client the information as to what are the different methods
available for the call. The map also provides the type of the
data that is returned by the method. At the moment, the return
type is not being used as such except for a special type which
is discussed later.

 *Note that the constructor is invoked without any arguments. So
 it is always a good idea to dedicate an EntryPoint class
 specifically for RMI.*

### Simple Use Case
A class can be exposed to respond to multiple RPC calls with
different types of parameters.
```js
'use strict';

class ExampleClass {

  modulus(p1, p2) {
    return p1 % p2;
  }

  multiply() {
    const res = 1;
    for (let i = 0; i < arguments.length; ++i) {
      res *= arguments[i];
    }
    return res;
  }
}

// Declare a map as a static field, so it's easier to use
ExampleClass.map = {
  add: 'number',
  multiply: 'number',
};

module.exports = ExampleClass;
```
### Using Promise
The client side always gets a Promise object as a response. So
to make the client side and server side development consistent,
it is always a good idea to return a Promise object from the
RPC calls

```js
'use strict';

class ExampleClassPromised {
  modulus(p1, p2) {
    return Promise.resolve(p1 % p2);
  }

  multiply() {
    const res = 1;
    for (let i = 0; i < arguments.length; ++i) {
      res *= arguments[i];
    }
    return Promise.resolve(res);
  }
}

ExampleClassPromised.map = {
  modulus: 'number',
  multiply: 'number',
};

module.exports = ExampleClassPromised;
```

### Returning a callable RPC object
It is also possible to return an instance of an object via an RPC call which
can also make RPC call themselves. This is defined by the the return type
provided in the map

```js
// An intermediate module whose instance is returned through the main
// EntryPoint class

'use strict';
class TaskModule {
  addTask(id, name, date) {
    // Do the operation
    return Promise.resolve(true);
  }
}

ReturnableModule.map = {
  'addTask': 'number',
};

module.exports = ReturnableModule;
```

```js
// The EntryPoint module whose instance is created for RPC

'use strict';

const ReturnableModule = require('./ReturnableModule');

class EntryPoint {
  getTaskModule() {
    return Promise.resolve(new ReturnableModule());
  }
}

EntryPoint.map = {
  // This is how the server identifies another RPC module
  getTaskModule: ReturnableModule.map,
};

module.exports = EntryPoint;
```
The client starts the RPC call with the `EntryPoint` module but once it gets an
instance of the `ReturnableModule` by invoking `getTaskModule`, it can also call
on the `addTask` method from the returned instance.

### Passing a callback
The RPC method invocation can also include a callback method as a parameter.
The callback method would be invoked on the client side from the server side.
```js
// Server side code
'use strict';

class AsyncModule {
  callWhenReady(name, callback) {
    // Do the callback
    callback(name);
    // The method doesn't necessarily need to return anything
  }
}

AsyncModule.map = {
  callWhenReady: null, // Doesn't return anything
};

module.exports = AsyncModule;
```

```js
// Client side code
'use strict';

// The client connects and get an instance of the RPC module
// which could then be used
function onConnected(asyncModule) {

  // Do the RPC call
  asyncModule.callWhenReady('John', function (name) {
    // This callback is invoked through the server
    console.log('RPC Callback returned ', name);
  });
}
```

### Passing an event handler
The RPC method also supports passing event handler as arguments. The methods
prefixed with 'on' are considered as event callbacks and could be invoked
from the server asynchronously.

```js
// The EventHandler class declaration on client side
'use strict';

const RMIClient = require('socket.io-rmi-client');

class EventHandler extends RMIClient.EventHandler {
  onAsyncEvent(arg1, arg2) {
    console.log('Event raised from server with arguments ', arg1, arg2);
  }

  onNewUser(user) {
    console.log('Event onPress from server', btn);
  }
}
module.exports = EventHandler;
```

```js
// The Client side usage
'use strict';

// Initialize the client
// ...
//
function onConnected(instance) {
  instance.setEventHandler(new EventHandler());
}
```

```js
// The server side class
'use strict';

class EventServiceProvider {
  function setEventHandler(eventHandler) {
    // The event handler could be stored and used later when an event occurs
    this.eventHandler = eventHandler;
  }

  function onSomeEvent() {
    this.eventHandler.onAsyncEvent('event', 'one');
  }

  function login(name, password) {
    this.eventHandler.onLogin({ name: name });
  }
}

module.exports = EventServiceProvider;
```

### Future Enhancements
The socket.io is a high level networking library which makes it
quite easier to use but in the same time has a high overhead. To
make this library much efficient, it would be much better if the
library is implemented using engine.io the low level networking
library being used by socket.io.
