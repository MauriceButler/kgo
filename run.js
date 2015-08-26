var ignoreDependency = /^\!.+/;

function Step(task, args, done){
    this._task = task;
    this._args = args;
    this._done = done;
}
Step.prototype.run = function(){
    var step = this,
        didError;

    this._task.fn.apply(this, this._args.concat([function(error){
        var result = Array.prototype.slice.call(arguments, 1);
        if(error){
            didError = true;
            step.done(error);
        }else if(!didError){
            step.done(null, result);
        }
    }]));
};
Step.prototype.done = function(error, result){
    if(error){
        return this._done(error);
    }
    this._done(null, result);
};

function runTask(task, results, aboutToRun, done){
    var names = task.names,
        dependants = task.args,
        args = [];

    if(dependants){
        for(var i = 0; i < dependants.length; i++) {
            var dependantName = dependants[i],
                ignore = dependantName.match(ignoreDependency);

            if(ignore){
                dependantName = dependantName.slice(1);
            }

            if(!(dependantName in results)){
                return;
            }

            if(!ignore){
                args.push(results[dependantName]);
            }
        }
    }

    var step = new Step(task, args, function(error, results){
        done(names, error, results);
    });

    aboutToRun(names);
    step.run();
}

function run(tasks, results, emitter){
    var currentTask,
        noMoreTasks = true;

    if(emitter._complete){
        return;
    }

    for(var key in tasks){
        noMoreTasks = false;
        currentTask = tasks[key];

        runTask(
            currentTask,
            results,
            function(names){
                names.map(function(name){
                    delete tasks[name];
                });
            },
            function(names, error, taskResults){
                if(emitter._complete){
                    return;
                }
                if(error){
                    emitter._complete = true;
                    emitter.emit('error', error, names);
                    emitter.emit('complete');
                    return;
                }

                for(var i = 0; i < names.length; i++){
                    results[names[i]] = taskResults[i];
                }

                run(tasks, results, emitter);
            }
        );
    }

    if(noMoreTasks && Object.keys(results).length === emitter._taskCount){
        emitter._complete = true;
        emitter.emit('complete');
    }
}

function cloneAndRun(tasks, results, emitter){
    var todo = {};

    emitter._taskCount = Object.keys(results).length;

    function checkDependencyIsDefined(dependencyName){
        dependencyName = dependencyName.match(/\!?(.*)/)[1];

        if(!(dependencyName in tasks) && !(dependencyName in results)){
            throw  new Error('No task or result has been defined for dependency: ' + dependencyName);
        }
    }

    for(var key in tasks){
        todo[key] = tasks[key];
        emitter._taskCount ++;

        tasks[key].args.map(checkDependencyIsDefined);
    }

    run(todo, results, emitter);
}

module.exports = cloneAndRun;