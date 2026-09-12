// Polyfill global.MessageQueue and global.SyntheticError for React Native Bridgeless / New Architecture dev client
(function () {
  var g = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : window;

  if (g && typeof g.MessageQueue === 'undefined') {
    function MessageQueue() {
      this._lazyCallableModules = {};
      this._queue = [[], [], [], 0];
      this._successCallbacks = new Map();
      this._failureCallbacks = new Map();
      this.callFunctionReturnFlushedQueue = function () { return null; };
      this.flushedQueue = function () { return null; };
      this.invokeCallbackAndReturnFlushedQueue = function () { return null; };
    }
    MessageQueue.spy = function () {};
    MessageQueue.prototype = {
      constructor: MessageQueue,
      callFunctionReturnFlushedQueue: function () { return null; },
      flushedQueue: function () { return null; },
      invokeCallbackAndReturnFlushedQueue: function () { return null; },
      registerCallableModule: function () {},
      registerLazyCallableModule: function () {},
      getCallableModule: function () { return null; },
    };
    g.MessageQueue = MessageQueue;
    if (typeof global !== 'undefined') global.MessageQueue = MessageQueue;
    if (typeof globalThis !== 'undefined') globalThis.MessageQueue = MessageQueue;
  }

  if (g && typeof g.SyntheticError === 'undefined') {
    function SyntheticError(message) {
      var err = new Error(message);
      err.name = 'SyntheticError';
      Object.setPrototypeOf(err, SyntheticError.prototype);
      return err;
    }
    SyntheticError.prototype = Object.create(Error.prototype);
    SyntheticError.prototype.constructor = SyntheticError;
    SyntheticError.prototype.name = 'SyntheticError';

    g.SyntheticError = SyntheticError;
    if (typeof global !== 'undefined') global.SyntheticError = SyntheticError;
    if (typeof globalThis !== 'undefined') globalThis.SyntheticError = SyntheticError;
  }
})();
