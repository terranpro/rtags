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
    } else if (node.type == "Literal") {
        return node.value;
    } else if (node.type == "ThisExpression") {
        log("got this here", node);
    } else {
        log("Got here", node);
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
    // log(JSON.stringify(esrefactorContext._syntax, null, 4));
    log(esrefactorContext._syntax);

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

    function add(path, range) {
        if (path == "constructor") {
            path = "0constructor"; // heh
        }
        if (!range || typeof range !== 'object') {
            throw new Error("busted " + path);
        }
        var cur = scope.objects[path];
        if (!cur) {
            range.push(true);
            scope.objects[path] = [range];
        } else {
            scope.objects[path].push(range);
        }
    }

    var byName = {};
    estraverse.traverse(esrefactorContext._syntax, {
        enter: function (node) {
            var path;
            parents.push(node);
            var s = scopeManager.acquire(node);
            if (s) {
                s.objects = {};
                s.objectScope = [];
                scopes.push(s);
                scope = s;
            }
            if (node.type == "ObjectExpression") {
                if (isChild("init") && parentTypeIs("VariableDeclarator")) {
                    node.addedScope = true;
                    scope.objectScope.push(parents[parents.length - 2].id.name);
                } else if (isChild("value") && parentTypeIs("Property")) {
                    node.addedScope = true;
                    scope.objectScope.push(parents[parents.length - 2].key.name);
                }
            } else if (node.type == "MemberExpression") {
                node.name = resolveName(node);
                if (node.property.type == "Literal") {
                    path = scope.objectScope.join(".");
                    if (path)
                        path += ".";
                    path += node.name;
                    add(path, node.property.range);
                }
                // log("got member expression", node.name, node.range);
            } else if (node.type == "Identifier") {
                path = scope.objectScope.join(".");
                if (path)
                    path += ".";
                if (parentTypeIs("MemberExpression") && isChild("property")) {
                    path += parents[parents.length - 2].name;
                } else {
                    path += node.name;
                }
                add(path, node.range);
                // log("identifier", path, JSON.stringify(node.range));
            }
        },
        leave: function (node) {
            parents.pop();
            if (node.addedScope)
                scope.objectScope.pop();
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
