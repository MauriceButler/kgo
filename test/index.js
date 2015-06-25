var test = require('tape'),
    kgo = require('../');

function doAsync(done){
    var args = Array.prototype.slice.call(arguments, 1);
    setTimeout(function(){
        done.apply(null, args);
    }, 100);
}

test('no function', function(t){
    t.plan(1);

    t.throws(function(){
        kgo('things');
    });
});

test('waterfall', function(t){
    t.plan(2);

    kgo('things', function(done){
        doAsync(done, null, 1);
    })('stuff', ['things'], function(things, done){
        doAsync(done, null, 2 + things);
    })(['stuff'], function(stuff, done){
        t.equal(stuff, 3);
        done();
    })
    .on('complete', function(){
        t.pass();
    });
});

test('parallel', function(t){
    t.plan(3);

    kgo('things', function(done){
        doAsync(done, null, 1);
    })('stuff', function(done){
        doAsync(done, null, 2);
    })(['things', 'stuff'], function(things, stuff, done){
        t.equal(things, 1);
        t.equal(stuff, 2);
        done();
    })
    .on('complete', function(){
        t.pass();
    });
});

test('errors', function(t){
    t.plan(3);

    kgo('things', function(done){
        doAsync(done, null, 1);
    })('stuff', ['things'], function(things, done){
        done(new Error('stuff screwed up'));
    })(['stuff'], function(stuff, done){
        t.equal(stuff, 3);
        done();
    }).on('error', function(error, names){
        t.equal(names[0], 'stuff');
        t.equal(error.message, 'stuff screwed up');
    })
    .on('complete', function(){
        t.pass();
    });
});

test('multiple errors', function(t){
    t.plan(2);

    kgo
    ('foo', function(done){
        doAsync(done, new Error('foo screwed up'), 1);
    })
    ('bar', function(done){
        doAsync(done, new Error('bar screwed up'), 1);
    })
    .on('error', function(){
        t.pass();
    })
    .on('complete', function(){
        t.pass();
    });
});

test('returnless', function(t){
    t.plan(3);

    kgo

    ('a', function(done){
        doAsync(done, null, 1);
    })

    ('b', ['a'], function(a, done){
        doAsync(done, null, 1);
    })

    (['b'],  function(b, done){
        t.pass('got first task');
        done();
    })

    (['b'], function(b, done){
        t.pass('got second task');
        done();
    })
    .on('complete', function(){
        t.pass();
    });
});

test('ignore dependencies', function(t){
    t.plan(2);

    kgo

    ('a', function(done){
        doAsync(done, null, 1);
    })

    ('b', ['!a'], function(done){
        doAsync(done, null, 1);
    })

    (['b'],  function(b, done){
        t.equal(b, 1, 'got correct parameter');
        done();
    })
    .on('complete', function(){
        t.pass();
    });
});

test('defaults', function(t){
    t.plan(3);

    kgo
    ({
        things: 1,
        stuff: 2
    })
    (['things', 'stuff'], function(things, stuff, done){
        t.equal(things, 1);
        t.equal(stuff, 2);
        done();
    })
    .on('complete', function(){
        t.pass();
    });
});

test('defaults with same taskname', function(t){
    t.plan(1);

    t.throws(function(){
        kgo
        ({
            things: 1,
            stuff: 2
        })
        ('stuff', function(done){
            doAsync(done, null, 2);
        })
        (['things', 'stuff'], function(things, stuff, done){
            t.fail('task ran but should not have');
            done();
        });
    }, 'cannot define a task with the same name as that of a default');
});

test('defaults with same taskname, after task', function(t){
    t.plan(1);

    t.throws(function(){
        kgo
        ('stuff', function(done){
            doAsync(done, null, 2);
        })
        ({
            things: 1,
            stuff: 2
        })
        (['things', 'stuff'], function(things, stuff, done){
            t.fail('task ran but should not have');
            done();
        });
    }, 'set defaults containing a key that conflicts with a task name');
});

test('double defaults', function(t){
    t.plan(1);

    t.throws(function(){
        kgo
        ({
            things: 1
        })
        ({
            stuff: 2
        })
        (['things', 'stuff'], function(things, stuff, done){
            t.fail('task ran but should not have');
            done();
        });
    }, 'cannot define defaults twice');
});

test('multiple datas', function(t){
    t.plan(3);

    kgo
    ('foo', 'bar', function(done){
        done(null, 1,2);
    })
    (['foo'], function(foo, done){
        t.equal(foo, 1);
        done();
    })
    (['bar'], function(bar, done){
        t.equal(bar, 2);
        done();
    })
    .on('complete', function(){
        t.pass();
    });
});

test('complete', function(t){
    t.plan(3);

    var a,b,c;

    kgo
    (function(done){
        setTimeout(function(){
            a = 1;
            done();
        },100);
    })
    (function(done){
        setTimeout(function(){
            b = 2;
            done();
        },100);
    })
    (function(done){
        setTimeout(function(){
            c = 3;
            done();
        },100);
    })
    .on('complete', function(){
        t.equal(a,1);
        t.equal(b,2);
        t.equal(c,3);
    });
});

test('stupid dep list', function(t){
    t.plan(1);

    t.throws(
        function(){
            kgo
            ('foo', 'bar', function(done) {
                done(null, 1, 2);
            })
            (['foo', ['bar']], function(){});
        },
        /dependency was not a string: bar in task: 0__returnless/
    );
});

test('task with missing dep', function(t){
    t.plan(2);

    var d = require('domain').create();

    d.on('error', function(error){
        t.ok(error instanceof Error, 'error is instance of Error');
        t.equal(error.message, 'No task or result has been defined for dependency: foo');
    });

    d.run(function(){
        kgo
        (['foo'], function(){});
    });
});