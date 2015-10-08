ghostrap
========

[![Build Status](https://travis-ci.org/polygonplanet/ghostrap.svg?branch=master)](https://travis-ci.org/polygonplanet/ghostrap)

Observe the object property getter, setter or method calls and add custom behavior.

**ghostrap** can intercept object on any timing (e.g. property value change, assignment, function invocation, etc).


## Installation

### In Browser:

```html
<script src="ghostrap.js"></script>
```

or

```html
<script src="ghostrap.min.js"></script>
```

Function object **ghostrap** will defined in the global scope.


### In Node.js:

```bash
npm install ghostrap
```

```javascript
var ghostrap = require('ghostrap');
```

### bower:

```bash
bower install ghostrap
```

----

## Usage


### ghostrap

`ghostrap` is a handy constructor.
`new` operator is not needed.


* **ghostrap** ( target )  
  @param {_Object_} _target_ The target object to trap.  
  @return {_ghostrap_} Return an instance of ghostrap.  


In this example, outputs a log when the object message has change.

```javascript
var myModel = {
  id: 1,
  message: 'Hello'
};

var ghost = ghostrap(myModel);
ghost.on('change:message', function() {
  console.log('message changed!');
});

myModel.message = 'Good evening';
// message changed!
myModel.message = 'Good night';
// message changed!
```

----

### on

Add new handler.

* **on** ( type, func )  
  @param {_string_} [_type_](#type) Type of listener/trigger.  
  @param {_function_} [_func_](#handler) handler function.  
  @return {_ghostrap_} Return an instance of ghostrap.

#### type

The first argument _type_ separates by a colon.
`'when:propName'` e.g. `'get:myPropName'`

##### when:

* **beforeget**  
  trigger on before get.
* **get**  
  trigger on get.
* **beforeset**  
  trigger on before set value.
* **set**  
  trigger on set value.
* **beforeapply**  
  trigger on before function calls.
* **apply**  
  trigger on function calls.
* **change**  
  trigger on changed value.

#### handler

The second argument _func_ is a handler function.
On callback arguments are following.

```javascript
function(target, key, value, args) { ... }
```

* target : target object.
* key    : target key.
* value  : value to be returned.
* args   : original function arguments. ('apply' or 'beforeapply')


Example:

```javascript
var myData = {
  data: '',
  maxLength: 20
};

var ghost = ghostrap(myData);
ghost.on('set:data', function(target, key, value) {
  // Truncate data value to the maximum length when set new data.
  if (value.length > myData.maxLength) {
    value = value.substr(0, myData.maxLength - 3) + '...';
  }
  return value;
});

myData.data = 'Lorem ipsum dolor sit amet';
console.log(myData.data); // 'Lorem ipsum dolor...'
```

----

### once

Add a new handler.
Just like [on](#on), but handler is called only once.

----

### off

Remove a handler.
If argument _type_ is specified, same types handlers are removed.
If argument _func_ is specified, same handlers are removed.
If arguments is omitted, all handlers are removed.

* **off** ( [type] [, func] )  
  @param {_string_} [_type_]  Type of listener/trigger.  
  @param {_function_} [_func_] handler function.  
  @return {_ghostrap_} Return an instance of ghostrap.


Example:

```javascript
var myModel = {
  id: 1,
  message: 'Hello'
};

function onMessageChange(target, key, value) {
  console.log('message changed!', value);
}

var ghost = ghostrap(myModel);
ghost.on('change:message', onMessageChange);

myModel.message = 'Good evening';
// message changed!
myModel.message = 'Good night';
// message changed!

ghost.off('change:message', onMessageChange);

myModel.message = 'Good morning';
// no console logs.
```

----

### clear

Clear all handlers and release the target object reference.

* **clear** ( )  
  @return {_ghostrap_} Return an instance of ghostrap.

----

## License

MIT

