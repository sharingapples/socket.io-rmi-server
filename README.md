### socket.io-rmi-server
RMI Server using socket.io

### Usage
```javascript
const io = require('socket.io');
const Server = require('socket.io-rmi-server');

class MyApplication {
  rpcMethod1() {

  }

  rpcMethod2() {

  }
}

Server.start(io, new MyApplication(), { rpcMethod1: null, rpcMethod2: null });
```
