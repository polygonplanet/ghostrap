/**
 * ghostrap
 *
 * @description  Observe the object property getter, setter or method calls and add custom behavior.
 * @fileoverview Object Observer/Interceptor library
 * @version      1.0.1
 * @date         2015-10-09
 * @link         https://github.com/polygonplanet/ghostrap
 * @copyright    Copyright (c) 2015 polygon planet <polygon.planet.aqua@gmail.com>
 * @license      MIT
 */

/*jshint eqnull:true */
(function (name, context, factory) {

  // Supports AMD, Node.js, CommonJS and browser context.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = factory();
    } else {
      exports[name] = factory();
    }
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    context[name] = factory();
  }

}('ghostrap', this, function() {
  'use strict';

  /*jshint validthis:true */

  var slice = Array.prototype.slice.call.bind(Array.prototype.slice);
  var hasOwn = Object.prototype.hasOwnProperty.call.bind(Object.prototype.hasOwnProperty);

  // WeakMap storage
  var ghostMap;

  function Ghostrap(target) {
    this.init(target);
  }

  Ghostrap.prototype = {
    events: null,
    init: function(target) {
      if (!target) {
        throw new Error('ghostrap requires more than 1 arguments');
      }

      if (ghostMap && ghostMap.has(target)) {
        this.events = ghostMap.get(target);
      } else {
        this.events = {
          traps: {},
          target: target,
          handlers: {}
        };

        if (!ghostMap) {
          ghostMap = createMap();
        }
        ghostMap.set(target, this.events);
      }

      return this;
    },
    on: function(type, func) {
      if (this._once) {
        func = once(func, function() {
          this.off(type, func);
        }.bind(this));
        delete this._once;
      }

      var events = this.events;
      if (!events.target) {
        throw new Error('Target is not defined');
      }

      var parts = type.split(':');
      var when = parts[0].toLowerCase();
      var key = parts[1];

      if (!hasOwn(events.traps, key)) {
        events.traps[key] = {};
        events.handlers[key] = {};

        if (!setHandler(events, key)) {
          throw new Error('Failed to set handler');
        }
      }

      var handlers = events.handlers[key];
      if (!handlers[when]) {
        handlers[when] = [];
      }

      handlers[when].push(func);
      return this;
    },
    once: function(type, func) {
      this._once = true;
      return this.on(type, func);
    },
    off: function(type, func) {
      var events = this.events;

      if (arguments.length === 0) {
        var target = events.target;
        this.clear();
        this.init(target);
        return this;
      }

      if (func == null &&
          (isFunction(type) ||
           (isArray(type) && isFunction(type[0])))) {
        return this.off('*', type);
      }

      if (type === '*') {
        removeHandlers(events, func);
        return this;
      }

      var parts = type.split(':');
      var when = parts[0].toLowerCase();
      var key = parts[1];

      var handlers = events.handlers[key];
      if (handlers) {
        var callbacks = handlers[when];
        if (callbacks && callbacks.length > 0) {
          if (func == null) {
            callbacks.length = 0;
          } else {
            handlers[when] = callbacks.filter(function(fn) {
              return fn !== func;
            });
          }
        }

        if (callbacks && callbacks.length === 0) {
          delete handlers[when];
        }
      }

      return this;
    },
    clear: function() {
      var events = this.events;

      Object.keys(events.traps).forEach(function(key) {
        var trap = events.traps[key];
        if (trap && trap.restore) {
          trap.restore();
        }
      });

      if (events.trapper) {
        clearObject(events.trapper);
      }
      clearObject(events.traps);
      clearObject(events.handlers);

      ghostMap['delete'](events.target);
      events.target = null;

      return this;
    }
  };


  function ghostrap(target) {
    return (this != null && this instanceof Ghostrap) ? this : new Ghostrap(target);
  }


  function setHandler(events, key) {
    var desc = Object.getOwnPropertyDescriptor(events.target, key);
    if (!desc) {
      return false;
    }

    var trap = events.traps[key] || (events.traps[key] = {});
    if (trap.trapped) {
      return true;
    }

    var handlers = events.handlers[key] || (events.handlers[key] = {});

    trap.value = trap.prevValue = trap.originalValue = events.target[key];
    trap.originalDesc = desc;

    // make restorable for clear().
    trap.restore = function() {
      delete events.target[key];

      if (isFunction(trap.originalValue)) {
        events.target[key] = trap.originalValue;
      } else {
        Object.defineProperty(events.target, key, trap.originalDesc);

        if (!isFunction(trap.value) && trap.value !== trap.originalValue) {
          events.target[key] = trap.value;
        }
      }
    };

    var getter = createCallback('get', desc, function() { return trap.value; });
    var setter = createCallback('set', desc, function(v) { return (trap.value = v); });
    var applier = callback(trap.value);

    var setTrapProperty = function() {
      Object.defineProperty(events.target, key, {
        get: trap.get,
        set: trap.set
      });
    };

    var triggerHandlers = function(context, when, value, args) {
      if (hasOwn(handlers, when)) {
        var callbacks = handlers[when];
        for (var i = 0, len = callbacks.length; i < len; i++) {
          value = callbacks[i].call(context, events.target, key, value, args);
        }
      }
      return value;
    };

    // delete oparator can access target[key] without recursive overflow
    var withoutRecursion = function(context, func) {
      delete events.target[key];
      events.target[key] = trap.value = getter();

      try {
        return func.call(context);
      } catch (e) {
        if (e !== withoutRecursionCancel) {
          throw e;
        }
      } finally {
        setTrapProperty();
      }
    };
    var withoutRecursionCancel = {};

    mixin(trap, {
      get: function() {
        return withoutRecursion(this, function() {
          triggerHandlers(this, 'beforeget', trap.value);
          trap.value = getter();
          trap.value = triggerHandlers(this, 'get', trap.value);
          return trap.value;
        });
      },
      set: function(value) {
        return withoutRecursion(this, function() {
          triggerHandlers(this, 'beforeset', value);
          setter(value);
          value = getter();
          value = triggerHandlers(this, 'set', value);

          if (trap.prevValue !== value) {
            triggerHandlers(this, 'change', value);
          }
          trap.value = trap.prevValue = value;

          if (isFunction(trap.value)) {
            applier = callback(trap.value);
            events.target[key] = trap.value = trap.applyFn;
            throw withoutRecursionCancel;
          }
          return trap.value;
        });
      },
      applyFn: function() {
        var value, args = arguments;
        triggerHandlers(this, 'beforeapply', value, args);
        value = applier.apply(this, args);
        return triggerHandlers(this, 'apply', value, args);
      }
    });

    if (isFunction(trap.value)) {
      events.target[key] = trap.applyFn;
    } else {
      setTrapProperty();
    }

    return (trap.trapped = true);
  }


  function removeHandlers(events, funcs) {
    if (!funcs) {
      return;
    }

    funcs = [].concat(funcs);
    _removeHandlers(events.handlers, funcs);
  }


  function _removeHandlers(handlers, funcs, parents, when) {
    if (!handlers) {
      return;
    }

    if (isArray(handlers)) {
      _removeCallbacks(handlers, funcs);
      if (parents && when &&
          parents[when] === handlers && handlers.length === 0) {
        delete parents[when];
      }
    } else {
      var keys = Object.keys(handlers);
      for (var i = 0, len = keys.length; i < len; i++) {
        var key = keys[i];
        _removeHandlers(handlers[keys[i]], funcs, handlers, key);
      }
    }
  }


  function _removeCallbacks(callbacks, funcs) {
    var funcLen = funcs.length;
    for (var i = 0; i < callbacks.length; i++) {
      for (var j = 0; j < funcLen; j++) {
        if (funcs[j] === callbacks[i]) {
          callbacks.splice(i, 1);
        }
      }
    }
  }


  function mixin(target) {
    slice(arguments, 1).forEach(function(source) {
      var key, keys = Object.keys(source);
      for (var i = 0, len = keys.length; i < len; i++) {
        key = keys[i];
        target[key] = source[key];
      }
    });
    return target;
  }


  function callback(x) {
    return isFunction(x) ?
      function() { return x.apply(this, arguments); } :
      function() { return x; };
  }


  function createCallback(type, desc, defaults) {
    return desc[type] && callback(desc[type]) ||
      isFunction(desc.value) && callback(desc.value) || defaults;
  }


  var createMap;
  if (typeof WeakMap !== 'undefined') {
    createMap = function() {
      return new WeakMap();
    };
  } else {
    createMap = (function() {
      function WeakMap() {
        this._id = ['', 'WeakMap', Date.now(), Math.random()].join('.');
      }

      WeakMap.prototype = {
        set: function(keyObject, value) {
          Object.defineProperty(keyObject, this._id, {
            configurable: true,
            value: value
          });
        },
        get: function(keyObject) {
          return keyObject[this._id];
        },
        has: function(keyObject) {
          return hasOwn(keyObject, this._id);
        },
        'delete': function(keyObject) {
          return delete keyObject[this._id];
        }
      };

      return function() {
        return new WeakMap();
      };
    }());
  }


  function once(func, callback) {
    var result;
    var called = false;

    return function() {
      if (called) {
        return result;
      }

      try {
        return (result = func.apply(this, arguments));
      } finally {
        called = true;
        func = null;
        if (callback) {
          callback.apply(this, arguments);
        }
      }
    };
  }


  function clearObject(object) {
    var keys = Object.keys(object);
    for (var i = 0, len = keys.length; i < len; i++) {
      delete object[keys[i]];
    }
    return object;
  }


  function isArray(x) {
    return Array.isArray(x);
  }

  function isObject(x) {
    return typeof x === 'object' && x !== null;
  }

  function isFunction(x) {
    return typeof x === 'function';
  }


  return ghostrap;
}));
