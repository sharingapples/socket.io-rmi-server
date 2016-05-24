'use strict';

const Common = require('socket.io-rpc-common');
const expect = require('chai').expect;
const sinon = require('sinon');
const io = require('socket.io')(9000);
const ServerInstance = require('../');
const clientIO = require('socket.io-client');

class TestRoot {
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
});
