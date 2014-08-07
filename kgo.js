var run = require('./run'),
    EventEmitter = require('events').EventEmitter,
    fnRegex = /^function.*?\((.*?)\)/;

function defer(callback){
    if (typeof setImmediate === "function"){
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        setImmediate(function(){
            callback();
        });
        
    } else {
        setTimeout(function(){
            callback();
        },0);
    }
}    

function newKgo(){
    var returnlessId = 0,
        tasks = {},
        results = {},
        errorHandlers = {};

    function kgoFn(name, dependencies, fn){
        if(typeof name !== 'string'){
            fn = dependencies;
            dependencies = name;
            name = (returnlessId++).toString() + '__returnless';
        }

        if(typeof dependencies === 'function'){
            fn = dependencies;
            dependencies = [];
        }

        if(typeof fn !== 'function'){
            throw new Error('No function provided for task number ' + Object.keys(tasks).length + ' (' + name + ')');
        }

        tasks[name] = {
            name: name,
            args: dependencies,
            fn: fn
        };

        return kgoFn;
    }

    for(var key in EventEmitter.prototype){
        kgoFn[key] = EventEmitter.prototype[key];
    }

    kgoFn.apply(null, arguments);

    defer(function(){
        run(tasks, results, kgoFn);
    });

    return kgoFn;
}

module.exports = newKgo;