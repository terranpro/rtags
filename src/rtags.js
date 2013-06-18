var esrefactorContext = new esrefactor.Context();

var indent = 0;
function indentString()
{
    var ret = "";
    for (var i=0; i<indent; ++i) {
        ret += "  ";
    }
    return ret;
}
function dumpObject(obj)
{
    for (var key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] !== 'function') {
            log(key);
        }
    }
}

// function path(scope, parents)
// {
//     // if (!parents[parents.length - 1].name) {
//     //     log("Calling path with no name", node);
//     // }
//     var name = [];

//     var prev = undefined;
//     var done = false;
//     var types = [];
//     for (var i=parents.length - 1; i>=0; --i) {
//         var p = parents[i];
//         // dumpObject(p);
//         if (p.type)
//             types.push(p.type);
//         if (!done) {
//             if (p.type == "Identifier") {
//                 name.unshift(p.name); // + "_1");
//             } else if (p.type == "VariableDeclarator" && p.id != prev) {
//                 name.unshift(p.id.name); // + "_2");
//             } else if (p.type == "ObjectExpression" && prev.type == "Property") {
//                 var next = parents[i - 1];
//                 if (next.type == "VariableDeclarator" && next.init == p) {
//                     name.unshift(path(scope, parents.slice(0, i))); // + "_3");
//                     done = true;
//                 }
//             } else if (p.type == "MemberExpression") {
//                 if (prev == p.property) {
//                     name.unshift(path(scope, parents.slice(0, i))); // + "_4");
//                 } else {
//                     log("Got here", name.join("."));
//                 }
//                 done = true;
//             }
//             // log((i + 1) + "/" + parents.length + ": " + p.type + " " + p.name);
//         }
//         indent += "  ";
//         prev = p;
//     }
//     if (!name.length) {
//         log("no name", parents.length, types.join());
//     }
//     log(parents.length, name.join("."));
//     return name.join(".");
// }

function resolveName(scope, top)
{
    if (!scope || scope.length == 0) {
        top.path = "";
        return "";
    } else if (scope.length == 1) {
        scope[0].path = "";
        return "";
    }
    var depth = scope.length;

    var parent;
    if (!top) {
        top = scope[scope.length - 1];
        parent = scope[scope.length - 2];
    } else {
        parent = scope[scope.length - 1];
        ++depth;
    }
    if (top.type == "Identifier") {
        if (parent && parent.path) {
            top.path = parent.path + "." + top.name;
            // log("doing identifier", parent.path, top.name, top.range, top.path);
        } else {
            top.path = top.name;
            // log("doing identifier no parent name", top.name, top.range, top.path, parent.type);
        }
    } else if (top.type == "VariableDeclarator") {
        top.path = parent.path;
        top.path = resolveName(scope, top.id);
    } else if (top.type == "MemberExpression") {
        top.path = parent.path;
        var old = top.path;
        top.path = resolveName(scope, top.object) + "." + resolveName(scope, top.property);
        if (!parent.path && parent.type == "AssignmentExpression") {
            parent.path = top.path;
        }
        // log("doing member expression", top.path, top.range, old);
    // } else if (top.name == "ExpressionStatement" && prev.type == "AssignmentExpression") {
    //     log("Got here", top.type, prev ? prev.type : "no prev");
    //     top.path = parent.path;
    //     top.path = resolveName(scope, top.expression);
        // } else if (top.name == "AssignmentExpression") {
        //     log("Got here 2", top.type, prev ? prev.type : "no prev");
        //     top.path = parent.path;
        //     top.path = resolveName(scope, top.left);
        // } else if (parent.path) {
        //     log("Got here 3", top.type, prev ? prev.type : "no prev");
        //     top.path = parent.path;
        // } else {
        //     log("Got here 4", top.type, prev ? prev.type : "no prev");
    } else {
        top.path = "";
    }
    var foo = "";
    for (var i=0; i<depth; ++i) {
        foo += "  ";
    }
    foo += top.path;
    log(foo, top.type);

    return top.path;
}

function indexFile(code, file, cb)
{
    var parsed = esprima.parse(code, { loc: true, range: true, tolerant: true });
    if (!parsed) {
        throw new Error('Couldn\'t parse file ' + file + ' ' + code.length);
        return false;
    }
    esrefactorContext.setCode(parsed);
    if (!esrefactorContext._syntax)
        throw new Error('Unable to identify anything without a syntax tree');
    if (!esrefactorContext._scopeManager)
        throw new Error('Unable to identify anything without a valid scope manager');

    var scopeManager = esrefactorContext._scopeManager;
    var lookup = esrefactorContext._lookup;

    scopeManager.attach();
    var scope = undefined;
    var parents = [];
    var scopes = [];
    var byName = {};
    estraverse.traverse(esrefactorContext._syntax, {
        enter: function (node) {
            parents.push(node);
            // var old = scope;
            var s = scopeManager.acquire(node);
            if (s) {
                s.objects = {};
                scopes.push(s);
                scope = s;
            }
            if (typeof node.path === 'undefined')
                resolveName(parents);
            if (node.path.length) { // && node.type == "Identifier") {
                var val = byName[node.path];
                if (val) {
                    val.push(node.range);
                } else {
                    node.range.push(node.type);
                    byName[node.path] = [ node.range ];
                }
            }
        },
        leave: function (node) {
            parents.pop();
            scope = scopeManager.release(node) || scope;
        }
    });
    // log(byName);
    // estraverse.traverse(esrefactorContext._syntax, {
    //     enter: function(node) {
    //         log(node.type, typeof node.path === 'string' ? node.path : "no path");
    //     }
    // });

    // for (var s=0; s<scopes.length; ++s) {
    //     log(s, Object.keys(scopes[s].objects));
    // }
    scopeManager.detach();

    // var result = lookup(scope, identifier);

    // if (result) {
    //     // Search for all other identical references (same scope).
    //     result.references = [];
    //         scopeManager.attach();
    //         estraverse.traverse(this._syntax, {
    //             enter: function (node) {
    //                 var scope, i, ref, d;
    //                 scope = scopeManager.acquire(node);
    //                 for (i = 0; i < (scope ? scope.references.length : 0); ++i) {
    //                     ref = scope.references[i];
    //                     if (ref.identifier.name === identifier.name) {
    //                         d = lookup(scope, ref.identifier);
    //                         if (d && d.declaration === result.declaration) {
    //                             result.references.push(ref.identifier);
    //                         }
    //                     }
    //                 }
    //             }
    //         });
    //         scopeManager.detach();
    //     }


    //     return result;
    // };
}


        // identifier = identification.identifier;
        // declaration = identification.declaration;
        // references = identification.references;
        // model = editor.getModel();

        // occurrences = [{
        //     line: identifier.loc.start.line,
        //     start: 1 + identifier.range[0] - model.getLineStart(identifier.loc.start.line - 1),
        //     end: identifier.range[1] - model.getLineStart(identifier.loc.start.line - 1),
        //     readAccess: false,
        //     description: identifier.name
        // }];

        // if (declaration) {
        //     if (declaration.range !== identifier.range) {
        //         occurrences.push({
        //             line: declaration.loc.start.line,
        //             start: 1 + declaration.range[0] - model.getLineStart(declaration.loc.start.line - 1),
        //             end: declaration.range[1] - model.getLineStart(declaration.loc.start.line - 1),
        //             readAccess: true,
        //             description: 'Line ' + declaration.loc.start.line + ': ' + declaration.name
        //         });
        //     }
        //     editor.addErrorMarker(declaration.range[0],
        //                           'Declaration: ' + declaration.name);
        //     id('info').innerHTML = 'Identifier \'' + identifier.name + '\' is declared in line ' +
        //         declaration.loc.start.line + '.';
        // } else {
        //     id('info').innerHTML = 'Warning: No declaration is found for \'' + identifier.name + '\'.';
        // }

        // for (i = 0; i < references.length; ++i) {
        //     ref = references[i];
        //     if (ref.range !== identifier.range) {
        //         occurrences.push({
        //             line: ref.loc.start.line,
        //             start: 1 + ref.range[0] - model.getLineStart(ref.loc.start.line - 1),
        //             end: ref.range[1] - model.getLineStart(ref.loc.start.line - 1),
        //             readAccess: true,
        //             description: ref.name
        //         });
        //     }
        // }
// }
