'use strict';

const handler = function (req, res) {
  res.writeHead(200);
  res.end('Test server for testing RMI Server');
};

const goodServer = require('http').createServer(handler);
const badServer = require('http').createServer(handler);

const Common = require('socket.io-rmi');
const expect = require('chai').expect;
const sinon = require('sinon');
const socketIO = require('socket.io');
const ServerInstance = require('../');
const clientIO = require('socket.io-client');

let constructorCounter = 0;
let destructorCounter = 0;
class TestRoot {
  constructor() {
    constructorCounter += 1;
  }

  destructor() {
    destructorCounter += 1;
  }

  method1() {
    return 'Method 1';
  }

  method2(arg1, arg2) {
    return arg1 + arg2;
  }
}

const map = {
  method1: 'string',
  method2: 'number',
};

const socketAPI = {
  on: function () {
    throw new Error('mock method to be overridden');
  },
};

ServerInstance.start(socketIO(goodServer), TestRoot, map);
ServerInstance.start(socketIO(badServer), TestRoot, { methodBad: 'string' });

goodServer.listen(9000, function () {
  badServer.listen(9001, function () {
    describe('RPC Server Check', function () {
      it('Checks Server Instance', function () {
        const socket = sinon.mock(socketAPI);
        socket.expects('on').once().withArgs('/method1');
        socket.expects('on').once().withArgs('/method2');

        const instance = new ServerInstance(socketAPI, new TestRoot(), '', map);
        expect(instance.toJSON().type).to.equal(Common.TYPE_REMOTE_INSTANCE);
        expect(instance.toJSON().namespace).to.equal('');
        expect(instance.toJSON().actions).to.eql(Object.keys(map));
        socket.verify();
      });

      it('Checks Socket Connection', function (done) {
        const socket = clientIO('ws://localhost:9000');
        socket.on(Common.EVENT_CONNECTED, instance => {
          expect(instance.type).to.equal(Common.TYPE_REMOTE_INSTANCE);
          expect(instance.namespace).to.equal('');
          expect(instance.actions).to.eql(Object.keys(map));

          socket.disconnect();
          done();
        });

        socket.on(Common.EVENT_ERROR, (error) => {
          console.error(error);
        });

      });

      it('Checks Server Error Handling', function (done) {
        const socket = clientIO('ws://localhost:9001');
        socket.on(Common.EVENT_CONNECTED, instance => {
          throw(new Error('Can\'t expect to be connected here. The is a bad server'));
        });

        socket.on(Common.EVENT_ERROR, (error) => {
          //console.error(error);
          done();
        });
      });

      it('Checks if the constructor/destructor have been called properly', function () {
        expect(constructorCounter).to.equal(3);
        expect(destructorCounter).to.equal(2);
      });
    });

    run();
  });
});
