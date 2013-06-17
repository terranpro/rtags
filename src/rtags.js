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

function path(object, scope)
{
    if (typeof object === 'string')
        return object;
    return typeof object;
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
    var allRefs = {};
    var scope = undefined;
    var objectScope = [];
    var prev = undefined;
    // log(esrefactorContext._syntax);
    var parents = [];
    estraverse.traverse(esrefactorContext._syntax, {
        enter: function (node) {
            parents.push(node);
            // var old = scope;
            scope = scopeManager.acquire(node) || scope;
            if (node.type === esprima.Syntax.Identifier) {
                var name = objectScope.join(".") || "";
                if (name.length != 0)
                    name += ".";
                name += node.name;
                log("got node", name, node.loc);
                // var result = lookup(scope, node);

                // // log("got node ", node.name + " " + (typeof result === 'undefined') + ' ' + (result == node));
                // if (result) { // && result.identifier == result.declaration) {
                //     // log("yes", node.name);
                //     // for (var key in result) {
                //     //     log(key);
                //     // }
                //     // Search for all other identical references (same scope).
                //     var references = [];
                //     // scopeManager.attach();
                //     estraverse.traverse(esrefactorContext._syntax, {
                //         enter: function (innerNode) {
                //             // log("entered " + innerNode.name);
                //             // var scope, i, ref, d;
                //             var innerScope = scopeManager.acquire(innerNode);
                //             if (innerScope) {
                //                 for (i=0; i<innerScope.references.length; ++i) {
                //                     var ref = innerScope.references[i];
                //                     if (ref.identifier.name === node.name) {
                //                         var d = lookup(innerScope, ref.identifier);
                //                         if (d && d.declaration === result.declaration) {
                //                             references.push(ref.identifier);
                //                         }
                //                     }
                //                 }
                //             }
                //         }
                //     } );
                //     // for (var key in scope.variableScope) {
                //     //     log(key, typeof key);
                //     // }
                //     // scopeManager.detach();
                //     // log("got refs ", node.name, references.length, scope.variableScope.length);
                // } else {
                //     log("Got no result", node.name, scope.variableScope.length, dumpObject(node));
                //     // for (var key in scope.variableScope) {
                //     //     log(key, typeof scope.variableScope[key]);
                //     // }
                //     // for (var key in node) {
                //     //     log(key, typeof node[key]);
                //     // }
                // }

                // cb(node);
            }
            if (node.type == "ObjectExpression") {
                objectScope.push(prev.name);
            } else if (node.type == "MemberExpression") {
                objectScope.push(path(node.object.name, scope));
            }
            if (node && node.name) {
                prev = node;
                // log("setting prev", prev);
            }
            log(node.type, objectScope.join("."));

        },
        leave: function (node) {
            if (node.type == "ObjectExpression" || node.type == "MemberExpression") {
                log("popping scope", objectScope.join("."), node.type);
                objectScope.pop();
            }
            parents.pop();
            scope = scopeManager.release(node) || scope;
        }
    });
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
