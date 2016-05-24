### socket.io-rpc-server
RPC Server using socket.io

### Usage
```javascript
const io = require('socket.io');
const Server = require('socket.io-rpc-server');

class MyApplication {
  rpcMethod1() {

  }

  rpcMethod2() {

  }
}

Server.start(io, new MyApplication(), { rpcMethod1: null, rpcMethod2: null });
```
