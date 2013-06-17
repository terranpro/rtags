var esrefactorContext = new esrefactor.Context();

function rtags-parse-file(code, file, cb)
{
    var parsed = esprima.parse(code, { loc: true, range: true, tolerant: true });
    if (!parsed) {
        throw new Error('Couldn\'t parse file ' + file + ' ' + code.length);
        return false;
    }
    context.setCode(syntax);
    if (!context._syntax)
        throw new Error('Unable to identify anything without a syntax tree');
    if (!this._scopeManager)
        throw new Error('Unable to identify anything without a valid scope manager');

    var scopeManager = this._scopeManager;
    var lookup = this._lookup;

    scopeManager.attach();
    var allRefs = {};
    estraverse.traverse(this._syntax, {
        enter: function (node) {
            scope = scopeManager.acquire(node) || scope;
            if (node.type === esprima.Syntax.Identifier) {
                cb(node);
            }
        },
        leave: function (node) {
            scope = scopeManager.release(node) || scope;
        }
    });
    scopeManager.detach();

        result = lookup(scope, identifier);

        if (result) {
            // Search for all other identical references (same scope).
            result.references = [];
            scopeManager.attach();
            estraverse.traverse(this._syntax, {
                enter: function (node) {
                    var scope, i, ref, d;
                    scope = scopeManager.acquire(node);
                    for (i = 0; i < (scope ? scope.references.length : 0); ++i) {
                        ref = scope.references[i];
                        if (ref.identifier.name === identifier.name) {
                            d = lookup(scope, ref.identifier);
                            if (d && d.declaration === result.declaration) {
                                result.references.push(ref.identifier);
                            }
                        }
                    }
                }
            });
            scopeManager.detach();
        }


        return result;
    };
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
}
