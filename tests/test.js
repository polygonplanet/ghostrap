'use strict';

var ghostrap = require('../ghostrap');

var assert = require('assert');
var fs = require('fs');

describe('ghostrap', function() {

  describe('tests', function() {
    it('on get', function() {
      var o = { a: 1 };
      assert(o.a === 1);

      ghostrap(o).on('get:a', function(target, key, value) {
        return value + 100;
      });

      o.a = 2;
      assert(o.a === 102);
      o.a = 5;
      assert(o.a === 105);
    });

    it('on beforeget', function() {
      var o = { a: 1 };
      assert(o.a === 1);

      var getCount = 0;
      var v = 0;
      ghostrap(o).on('beforeget:a', function(target, key, value) {
        if (getCount === 0) {
          assert(v === 0);
        } else if (getCount === 1) {
          assert(v === 1);
        }
        getCount++;
      });

      v = o.a; // getCount: 0 -> 1
      o.a = 2;
      v = o.a; // getCount: 1 -> 2

      assert(v === 2);
      assert(o.a === 2);
    });

    it('on set', function() {
      var o = { a: 'abc' };

      ghostrap(o).on('set:a', function(target, key, value) {
        return value + '!';
      });

      assert(o.a === 'abc');
      o.a = 'zzz';
      assert(o.a === 'zzz!');
      o.a = 'Hello';
      assert(o.a === 'Hello!');
    });

    it('on beforeset', function() {
      var o = { a: 1 };
      assert(o.a === 1);

      var setCount = 0;
      ghostrap(o).on('beforeset:a', function(target, key, value) {
        if (setCount === 0) {
          assert(o.a === 1);
        } else if (setCount === 1) {
          assert(o.a === 200);
        }
        setCount++;
      });

      o.a = 200; // setCount: 0 -> 1
      assert(o.a === 200);
      o.a = 300; // setCount: 1 -> 2
      assert(o.a === 300);
    });

    it('on apply', function() {
      var o = {
        f: function(a, b) {
          return a + b;
        }
      };

      var v;
      v = o.f(1, 2);
      assert(v === 3);

      ghostrap(o).on('apply:f', function(target, key, value, args) {
        return value * 100;
      });

      v = o.f(1, 2);
      assert(v === 300);
    });

    it('on beforeapply', function() {
      var o = {
        f: function(a, b) {
          return a + b;
        }
      };

      var v;
      v = o.f(1, 2);
      assert(v === 3);

      ghostrap(o).on('beforeapply:f', function(target, key, value, args) {
        assert(v === 3);
      });

      v = o.f(2, 3);
      assert(v === 5);
    });

    it('on change', function() {
      var o = { a: 1 };
      assert(o.a === 1);

      var changeCount = 0;
      ghostrap(o).on('change:a', function(target, key, value) {
        changeCount++;
      });

      assert(changeCount === 0);
      o.a = 1;
      assert(changeCount === 0);
      o.a = 2;
      assert(changeCount === 1);
      o.a = '2';
      assert(changeCount === 2);
      o.a = 3;
      assert(changeCount === 3);
    });

    it('Recursion test', function() {
      var o = { a: 1 };
      assert(o.a === 1);

      var ghost = ghostrap(o);
      ghost.on('get:a', function(target, key, value) {
        var v = o.a;
        assert(v >= 100);
        return value + 100;
      }).on('set:a', function(target, key, value) {
        o.a = value + 100;
        assert(o.a >= 100);
        return o.a;
      });

      o.a = 2;
      assert(o.a === 202);
      o.a = 5;
      assert(o.a === 205);
    });

    it('Multiple objects', function() {
      var o = { a: 1 };
      var o2 = { b: 2 };

      assert(o.a === 1);
      assert(o2.b === 2);

      var changeCount = 0;
      var changeCount2 = 0;

      var ghost = ghostrap(o);
      ghost.on('change:a', function(target, key, value) {
        changeCount++;
      });

      var ghost2 = ghostrap(o2);
      ghost2.on('change:b', function(target, key, value) {
        changeCount2++;
      });

      assert(changeCount === 0);
      assert(changeCount2 === 0);

      o.a = 1;
      assert(changeCount === 0);
      assert(changeCount2 === 0);

      o.a = 2;
      assert(changeCount === 1);
      assert(changeCount2 === 0);

      o.a = '2';
      assert(changeCount === 2);
      assert(changeCount2 === 0);

      o.a = 3;
      assert(changeCount === 3);
      assert(changeCount2 === 0);

      o2.b = 2;
      assert(changeCount === 3);
      assert(changeCount2 === 0);

      o2.b = 3;
      assert(changeCount === 3);
      assert(changeCount2 === 1);

      o2.c = 10;
      assert(changeCount === 3);
      assert(changeCount2 === 1);
    });

    it('once get', function() {
      var o = { a: 1 };
      assert(o.a === 1);

      ghostrap(o).once('get:a', function(target, key, value) {
        return value * 1000;
      });

      assert(o.a === 1000);
      o.a = 2;
      assert(o.a === 2);
    });

    it('once beforeget', function() {
      var o = { a: 1 };
      assert(o.a === 1);

      var count = 0;
      ghostrap(o).once('beforeget:a', function(target, key, value) {
        count++;
      });

      assert(count === 0);
      assert(o.a === 1);
      assert(count === 1);
      o.a = 2;
      assert(o.a === 2);
      assert(count === 1);
    });

    it('once set', function() {
      var o = { a: 1 };
      ghostrap(o).once('set:a', function(target, key, value) {
        return value * 1000;
      });

      assert(o.a === 1);
      o.a = 2;
      assert(o.a === 2000);
      o.a = 3;
      assert(o.a === 3);
    });

    it('once beforeset', function() {
      var o = { a: 1 };
      assert(o.a === 1);

      var count = 0;
      ghostrap(o).once('beforeset:a', function(target, key, value) {
        count++;
      });

      assert(count === 0);
      assert(o.a === 1);
      o.a = 2;
      assert(o.a === 2);
      assert(count === 1);
      o.a = 3;
      assert(o.a === 3);
      assert(count === 1);
    });

    it('once change', function() {
      var o = { a: 1 };
      assert(o.a === 1);

      var changeCount = 0;
      ghostrap(o).once('change:a', function(target, key, value) {
        changeCount++;
      });

      assert(changeCount === 0);
      o.a = 1;
      assert(changeCount === 0);
      o.a = 2;
      assert(changeCount === 1);
      o.a = '2';
      assert(changeCount === 1);
      o.a = 3;
      assert(changeCount === 1);
    });

    it('off() specify function', function() {
      var o = { a: 1 };
      var getCount = 0;
      var dummy = function(){};
      var onSet_a = function(target, key, value) {
        return value * 1000;
      };
      var onGet_a = function(target, key, value) {
        getCount++;
        return value;
      };

      var ghost = ghostrap(o);
      ghost.on('set:a', onSet_a).on('get:a', onGet_a);

      ghost.off('set:a', dummy);
      ghost.off('dummy:a', onSet_a);

      assert(o.a === 1);
      assert(getCount === 1);
      o.a = 2;
      assert(o.a === 2000);
      assert(getCount === 2);

      ghost.off('set:a', onSet_a);

      o.a = 3;
      assert(o.a === 3);
      assert(getCount === 3);

      ghost.off('get:a', dummy);

      o.a = 4;
      assert(o.a === 4);
      assert(getCount === 4);

      ghost.off('get:a', onGet_a);

      o.a = 5;
      assert(o.a === 5);
      assert(getCount === 4);
    });

    it('off() not specify function', function() {
      var o = { a: 'abc' };
      var count = 0;
      var count2 = 0;

      var ghost = ghostrap(o);
      ghost.on('set:a', function(target, key, value) {
        return value + '!';
      }).on('set:a', function(target, key, value) {
        return value + '?';
      });

      ghost.on('get:a', function(target, key, value) {
        count++;
        return value;
      }).on('get:a', function(target, key, value) {
        assert(count === count2 + 1);
        count2++;
        return value;
      });

      var v = o.a;
      assert(v === 'abc');
      assert(count === 1);
      assert(count2 === 1);

      o.a = 'hello';
      assert(o.a === 'hello!?');
      assert(count === 2);
      assert(count2 === 2);

      o.a = '';
      assert(count === 2);
      assert(count2 === 2);

      v = o.a;
      assert(v === '!?');
      assert(count === 3);
      assert(count2 === 3);

      ghost.off('set:a');

      o.a = 'hi';
      assert(o.a === 'hi');
      assert(count === 4);
      assert(count2 === 4);

      ghost.off('get:a');

      o.a = 'abcdef';
      v = o.a;
      assert(o.a === 'abcdef');
      assert(count === 4);
      assert(count2 === 4);

      o.a = 'xyz';
      v = o.a;
      assert(o.a === 'xyz');
      assert(count === 4);
      assert(count2 === 4);
    });

    it('off() on change', function() {
      var o = { a: 1 };
      assert(o.a === 1);

      var changeCount = 0;
      var changeCount2 = 0;

      var ghost = ghostrap(o);
      ghost.on('change:a', function(target, key, value) {
        changeCount++;
      }).on('change:a', function(target, key, value) {
        assert(changeCount === changeCount2 + 1);
        changeCount2++;
      });

      assert(changeCount === 0);
      assert(changeCount2 === 0);
      o.a = 1;
      assert(changeCount === 0);
      assert(changeCount2 === 0);
      o.a = 2;
      assert(changeCount === 1);
      assert(changeCount2 === 1);
      o.a = '2';
      assert(changeCount === 2);
      assert(changeCount2 === 2);
      o.a = 3;
      assert(changeCount === 3);
      assert(changeCount2 === 3);

      ghost.off('change:a');

      o.a = 4;
      assert(changeCount === 3);
      assert(changeCount2 === 3);
      o.a = 5;
      assert(changeCount === 3);
      assert(changeCount2 === 3);
    });

    it('off() without arguments', function() {
      var o = { a: 'abc' };
      var count = 0;
      var count2 = 0;

      var ghost = ghostrap(o);
      ghost.on('set:a', function(target, key, value) {
        return value + '!';
      }).on('set:a', function(target, key, value) {
        return value + '?';
      });

      ghost.on('get:a', function(target, key, value) {
        count++;
        return value;
      }).on('get:a', function(target, key, value) {
        assert(count === count2 + 1);
        count2++;
        return value;
      });

      var v = o.a;
      assert(v === 'abc');
      assert(count === 1);
      assert(count2 === 1);

      o.a = 'hello';
      assert(o.a === 'hello!?');
      assert(count === 2);
      assert(count2 === 2);

      o.a = '';
      assert(count === 2);
      assert(count2 === 2);

      v = o.a;
      assert(v === '!?');
      assert(count === 3);
      assert(count2 === 3);

      ghost.off();

      o.a = 'hi';
      v = o.a;
      assert(o.a === 'hi');
      assert(count === 3);
      assert(count2 === 3);

      o.a = 'abcdef';
      v = o.a;
      assert(o.a === 'abcdef');
      assert(count === 3);
      assert(count2 === 3);

      o.a = 'xyz';
      v = o.a;
      assert(o.a === 'xyz');
      assert(count === 3);
      assert(count2 === 3);
    });

    it('off() for multiple objects', function() {
      var o = { a: 1 };
      var o2 = { b: 2 };

      assert(o.a === 1);
      assert(o2.b === 2);

      var changeCount = 0;
      var changeCount2 = 0;

      var ghost = ghostrap(o);
      ghost.on('change:a', function(target, key, value) {
        changeCount++;
      });

      var ghost2 = ghostrap(o2);
      ghost2.on('change:b', function(target, key, value) {
        changeCount2++;
      });

      assert(changeCount === 0);
      assert(changeCount2 === 0);

      o.a = 1;
      assert(changeCount === 0);
      assert(changeCount2 === 0);

      o.a = 2;
      assert(changeCount === 1);
      assert(changeCount2 === 0);

      o.a = '2';
      assert(changeCount === 2);
      assert(changeCount2 === 0);

      o.a = 3;
      assert(changeCount === 3);
      assert(changeCount2 === 0);

      o2.b = 2;
      assert(changeCount === 3);
      assert(changeCount2 === 0);

      o2.b = 3;
      assert(changeCount === 3);
      assert(changeCount2 === 1);

      o2.c = 10;
      assert(changeCount === 3);
      assert(changeCount2 === 1);

      ghost.off();

      o.a = 100;
      assert(changeCount === 3);
      assert(changeCount2 === 1);

      o.a = 101;
      assert(changeCount === 3);
      assert(changeCount2 === 1);

      o2.b = 100;
      assert(changeCount === 3);
      assert(changeCount2 === 2);

      ghost2.off();

      o2.b = 200;
      assert(changeCount === 3);
      assert(changeCount2 === 2);

      o2.b = 201;
      assert(changeCount === 3);
      assert(changeCount2 === 2);
    });

    it('off() without arguments for apply, beforeapply', function() {
      var o = {
        f: function(a, b) {
          return a + b;
        }
      };

      var count = 0;
      var count2 = 0;

      var beforeCount = 0;
      var beforeCount2 = 0;

      var ghost = ghostrap(o);
      ghost.on('beforeapply:f', function(target, key, value, args) {
        beforeCount++;
      }).on('beforeapply:f', function(target, key, value, args) {
        assert(beforeCount === beforeCount2 + 1);
        beforeCount2++;
      });

      ghost.on('apply:f', function(target, key, value, args) {
        assert(beforeCount2 === count + 1);
        count++;
        return value * 10;
      }).on('apply:f', function(target, key, value, args) {
        assert(count === count2 + 1);
        count2++;
        return value * 10;
      });

      var v = o.f(1, 1);
      assert(v === 200);
      assert(beforeCount === 1);
      assert(beforeCount2 === 1);
      assert(count === 1);
      assert(count2 === 1);

      v = o.f(2, 3);
      assert(v === 500);
      assert(beforeCount === 2);
      assert(beforeCount2 === 2);
      assert(count === 2);
      assert(count2 === 2);

      ghost.off();

      v = o.f(3, 4);
      assert(v === 7);
      assert(beforeCount === 2);
      assert(beforeCount2 === 2);
      assert(count === 2);
      assert(count2 === 2);

      v = o.f(5, 6);
      assert(v === 11);
      assert(beforeCount === 2);
      assert(beforeCount2 === 2);
      assert(count === 2);
      assert(count2 === 2);
    });

    it('off() and reset events', function() {
      var o = { a: 1 };

      var count = 0;
      var ghost = ghostrap(o).on('set:a', function(target, key, value) {
        count++;
        return value;
      });

      o.a = 2;
      assert(count === 1);
      o.a = 5;
      assert(count === 2);

      ghost.off();

      o.a = 6;
      assert(count === 2);
      o.a = 7;
      assert(count === 2);

      ghost.on('set:a', function(target, key, value) {
        count += 10;
        return value;
      });

      o.a = 8;
      assert(count === 12);
      o.a = 9;
      assert(count === 22);

      ghost.off();

      o.a = 10;
      assert(count === 22);
    });

    it('clear() on get, set', function() {
      var o = { a: 'abc' };
      var count = 0;
      var count2 = 0;

      var ghost = ghostrap(o);
      ghost.on('set:a', function(target, key, value) {
        return value + '!';
      }).on('set:a', function(target, key, value) {
        return value + '?';
      });

      ghost.on('get:a', function(target, key, value) {
        count++;
        return value;
      }).on('get:a', function(target, key, value) {
        assert(count === count2 + 1);
        count2++;
        return value;
      });

      var v = o.a;
      assert(v === 'abc');
      assert(count === 1);
      assert(count2 === 1);

      o.a = 'hello';
      assert(o.a === 'hello!?');
      assert(count === 2);
      assert(count2 === 2);

      o.a = '';
      assert(count === 2);
      assert(count2 === 2);

      v = o.a;
      assert(v === '!?');
      assert(count === 3);
      assert(count2 === 3);

      ghost.clear();

      o.a = 'hi';
      v = o.a;
      assert(o.a === 'hi');
      assert(count === 3);
      assert(count2 === 3);

      o.a = 'abcdef';
      v = o.a;
      assert(o.a === 'abcdef');
      assert(count === 3);
      assert(count2 === 3);

      o.a = 'xyz';
      v = o.a;
      assert(o.a === 'xyz');
      assert(count === 3);
      assert(count2 === 3);
    });

    it('clear() on apply, beforeapply', function() {
      var o = {
        f: function(a, b) {
          return a + b;
        }
      };

      var count = 0;
      var count2 = 0;

      var beforeCount = 0;
      var beforeCount2 = 0;

      var ghost = ghostrap(o);
      ghost.on('beforeapply:f', function(target, key, value, args) {
        beforeCount++;
      }).on('beforeapply:f', function(target, key, value, args) {
        assert(beforeCount === beforeCount2 + 1);
        beforeCount2++;
      });

      ghost.on('apply:f', function(target, key, value, args) {
        assert(beforeCount2 === count + 1);
        count++;
        return value * 10;
      }).on('apply:f', function(target, key, value, args) {
        assert(count === count2 + 1);
        count2++;
        return value * 10;
      });

      var v = o.f(1, 1);
      assert(v === 200);
      assert(beforeCount === 1);
      assert(beforeCount2 === 1);
      assert(count === 1);
      assert(count2 === 1);

      v = o.f(2, 3);
      assert(v === 500);
      assert(beforeCount === 2);
      assert(beforeCount2 === 2);
      assert(count === 2);
      assert(count2 === 2);

      ghost.clear();

      v = o.f(3, 4);
      assert(v === 7);
      assert(beforeCount === 2);
      assert(beforeCount2 === 2);
      assert(count === 2);
      assert(count2 === 2);

      v = o.f(5, 6);
      assert(v === 11);
      assert(beforeCount === 2);
      assert(beforeCount2 === 2);
      assert(count === 2);
      assert(count2 === 2);
    });

    it('clear() on change', function() {
      var o = { a: 1 };
      assert(o.a === 1);

      var changeCount = 0;
      var changeCount2 = 0;

      var ghost = ghostrap(o);
      ghost.on('change:a', function(target, key, value) {
        changeCount++;
      }).on('change:a', function(target, key, value) {
        assert(changeCount === changeCount2 + 1);
        changeCount2++;
      });

      assert(changeCount === 0);
      assert(changeCount2 === 0);
      o.a = 1;
      assert(changeCount === 0);
      assert(changeCount2 === 0);
      o.a = 2;
      assert(changeCount === 1);
      assert(changeCount2 === 1);
      o.a = '2';
      assert(changeCount === 2);
      assert(changeCount2 === 2);
      o.a = 3;
      assert(changeCount === 3);
      assert(changeCount2 === 3);

      ghost.clear();

      o.a = 4;
      assert(changeCount === 3);
      assert(changeCount2 === 3);
      o.a = 5;
      assert(changeCount === 3);
      assert(changeCount2 === 3);
    });

    it('clear() and reset events', function() {
      var o = { a: 1 };

      var count = 0;
      var ghost = ghostrap(o).on('set:a', function(target, key, value) {
        count++;
        return value;
      });

      o.a = 2;
      assert(count === 1);
      o.a = 5;
      assert(count === 2);

      ghost.clear();

      o.a = 6;
      assert(count === 2);
      o.a = 7;
      assert(count === 2);

      ghost = ghostrap(o);
      ghost.on('set:a', function(target, key, value) {
        count += 10;
        return value;
      });

      o.a = 8;
      assert(count === 12);
      o.a = 9;
      assert(count === 22);

      ghost.clear();

      o.a = 10;
      assert(count === 22);
    });
  });
});
