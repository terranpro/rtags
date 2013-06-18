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


function resolveName(node)
{
    if (node.type == "Identifier") {
        return node.name;
    } else if (node.type == "MemberExpression") {
        return resolveName(node.object) + "." + resolveName(node.property);
    } else {
        log("Got here", node.object.type);
    }
    return "";
}

function indexFile(code, file, cb)
{
    var parsed = esprima.parse(code, { range: true, tolerant: true });
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
    function isChild(key, offset)
    {
        if (typeof offset == 'undefined')
            offset = parents.length - 1;
        return (offset > 0
                && parents[offset - 1]
                && typeof parents[offset - 1][key] != 'undefined'
                && offset <= parents.length
                && parents[offset - 1][key] == parents[offset]);
    }
    function parentTypeIs(type, offset)
    {
        if (typeof offset == 'undefined')
            offset = parents.length - 1;
        return (offset > 0 && parents[offset - 1] && parents[offset - 1].type == type);
    }

    var scopes = [];
    var byName = {};
    var objectScope = [];
    var objectScopeStack = [];
    estraverse.traverse(esrefactorContext._syntax, {
        enter: function (node) {
            parents.push(node);
            var s = scopeManager.acquire(node);
            if (s) {
                s.objects = {};
                scopes.push(s);
                scope = s;
            }
            var addedScope = false;
            if (node.type == "ObjectExpression") {
                if (isChild("init") && parentTypeIs("VariableDeclarator")) {
                    addedScope = true;
                    objectScope.push(parents[parents.length - 2].id.name);
                } else if (isChild("value") && parentTypeIs("Property")) {
                    addedScope = true;
                    objectScope.push(parents[parents.length - 2].key.name);
                }
            } else if (node.type == "MemberExpression") {
                node.name = resolveName(node);
                // log("got member expression", node.name, node.range);
            } else if (node.type == "Identifier") {
                var path = objectScope.join(".");
                if (path)
                    path += ".";
                if (parentTypeIs("MemberExpression") && isChild("property")) {
                    path += parents[parents.length - 2].name;
                } else {
                    path += node.name;
                }
                var cur = scope.objects[path];
                if (!cur) {
                    var range = node.range;
                    range.push(true);
                    scope.objects[path] = [range];
                } else {
                    scope.objects[path].push(node.range);
                }
                // log("identifier", path, JSON.stringify(node.range));
            }
            objectScopeStack.push(addedScope);
        },
        leave: function (node) {
            parents.pop();
            if (objectScopeStack.pop())
                objectScope.pop();
            scope = scopeManager.release(node) || scope;
        }
    });
    // log(byName);
    // estraverse.traverse(esrefactorContext._syntax, {
    //     enter: function(node) {
    //         log(node.type, typeof node.path === 'string' ? node.path : "no path");
    //     }
    // });

    for (var s=0; s<scopes.length; ++s) {
        log(s, scopes[s].objects);
    }
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
