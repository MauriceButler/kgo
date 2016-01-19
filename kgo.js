var run = require('./run'),
    cpsenize = require('cpsenize'),
    symbols = require('./symbols'),
    cleanErrorRegex = /((?:\n.*__kgoRunStep__[^]+|\n.*)__kgoDeferredCallback__[^]+?\n[^]+?(?:\n|$))/;

var defer = typeof setImmediate === 'function' ? setImmediate : setTimeout;

function newKgo(){
    var returnlessId = 0,
        tasks = {},
        results = {},
        inFlight,
        defaultsDefined;

    function kgoFn(){
        if(!arguments.length){
            throw new Error('kgo must must be called with a task or defaults');
        }

        if(inFlight){
            throw new Error('No tasks or defaults may be set after kgo is in flight');
        }

        var argIndex = 0;

        while(typeof arguments[argIndex] === 'string'){
            argIndex++;
        }

        var names = Array.prototype.slice.call(arguments, 0, argIndex),
            dependencies,
            fn;

        if(!names.length){
            names.push((returnlessId++).toString() + '__returnless');
        }

        if(typeof arguments[argIndex] === 'object' && !Array.isArray(arguments[argIndex])){
            var defaults = arguments[argIndex];

            if(defaultsDefined){
                throw new Error('Defaults may be defined only once per kgo');
            }

            for(var key in defaults){
                if(key in tasks){
                    throw new Error('A task is already defined for ' + key);
                }
                results[key] = defaults[key];
            }
            defaultsDefined = true;
            return kgoFn;
        }

        if(Array.isArray(arguments[argIndex])){
            dependencies = arguments[argIndex];
            argIndex++;
        }

        if(typeof arguments[argIndex] === 'function'){
            fn = arguments[argIndex];
        }

        if(typeof fn !== 'function'){
            throw new Error('No function provided for task number ' + Object.keys(tasks).length + ' (' + names + ')');
        }

        if(!dependencies){
            dependencies = [];
        }

        dependencies.map(function(dependency){
            if(typeof dependency !== 'string'){
                throw new Error('dependency was not a string: ' + dependency + ' in task: ' + names);
            }
        });

        names.map(function(name){
            if(name in results){
                throw new Error('A default with the same name as this task (' + name + ') has already been set');
            }

            if(name in tasks){
                throw new Error('A task with the same name (' + name + ') is aready defined');
            }

            if(name.match(symbols.errorDependency)){
                throw new Error('Task names can not begin with ' + symbols.errorSymbol);
            }

            tasks[name] = {
                names: names,
                args: dependencies,
                fn: fn
            };
        });

        return kgoFn;
    }

    kgoFn.apply(null, arguments);

    var stack = new Error().stack.match(/(\s+?at[^]*$)/)[1];

    function createError(error){
        var currentStack = '';
        if(error instanceof Error){
            currentStack = error.stack.replace(cleanErrorRegex, '');
        }else{
            error = new Error(error);
            error.stack = '';
        }
        error.stack = 'Error: ' + error.message + currentStack + stack;
        return error;
    }

    defer(function __kgoDeferredCallback__(){
        inFlight = true;
        run(tasks, results, kgoFn, createError);
    });

    return kgoFn;
}

module.exports = newKgo;
module.exports.sync = cpsenize;