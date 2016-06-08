# RMI Server (RPC Server)
![NPM version](https://badge.fury.io/js/socket.io-rmi-server.svg)
RMI Server is a simple RPC Server that works over awesome
[socket.io](https://github.com/socket.io/socket.io) library to
provide an intuitive programming paradigm that could be used
seamlessly either the code is being used standalone or is being
invoked over a network.

The RMI Server has to be used in conjunction with its client
counter part available at
https://github.com/sharingapples/socket.io-rmi-client.

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

### Returning a class object

### Passing a callback

### Passing an event handler



### Future Enhancements
The socket.io is a high level networking library which makes it
quite easier to use but in the same time has a high overhead. To
make this library much efficient, it would be much better if the
library is implemented using engine.io the low level networking
library being used by socket.io.
