/**
 * @fileoverview Ensure AMD-style callbacks contain correct number of arguments
 * @author Kevin Partington
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var util = require("../util");


//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = function (context) {

    var allowExtraDependencies = (context.options && context.options[0] && context.options[0].allowExtraDependencies) || false;
    var allowedExtraDependencies = findAllowedExtraDependencies();
    var TOO_MANY_PARAMS_MESSAGE = "Too many parameters in {{functionName}} callback (expected {{expected}}, found {{actual}}).";
    var TOO_FEW_PARAMS_MESSAGE = "Not enough parameters in {{functionName}} callback (expected {{expected}}, found {{actual}}).";

    //--------------------------------------------------------------------------
    // Helpers
    //--------------------------------------------------------------------------

    function isFunctionExpression(node) {
        return node.type === "FunctionExpression";
    }

    function findAllowedExtraDependencies() {
        if (context.options && context.options[0] && context.options[0].allowedExtraDependencies) {
            return context.options[0].allowedExtraDependencies;
        }
        return false;
    }

    function requireHasCallback(node) {
        return node.arguments.filter(isFunctionExpression).length;
    }

    function getExtraPaths(dependencyNodes, callbackParams) {
        var extraPaths = [];
        var extraPathQty = dependencyNodes.length - callbackParams.length;

        for (var i = dependencyNodes.length - 1; i >= dependencyNodes.length - extraPathQty; i--) {
            extraPaths.push(dependencyNodes[i].value);
        }
        return extraPaths;
    }

    function allPathsAllowed(paths, allowedPaths) {
        for (var i = 0; i < paths.length; i++) {
            if (allowedPaths.indexOf(paths[i]) === -1) {
                return false;
            }
        }
        return true;
    }

    function checkArity(node, funcName) {
        var dependencyNodes = util.getDependencyNodes(node),
            dependencyCount,
            callbackParams,
            actualParamCount;

        if (!dependencyNodes) {
            return;
        }

        dependencyCount = dependencyNodes.length;
        callbackParams = util.getAmdCallback(node).params;
        actualParamCount = callbackParams.length;

        if (dependencyNodes.length < callbackParams.length) {
            context.report(node, TOO_MANY_PARAMS_MESSAGE, {
                functionName: funcName,
                expected: dependencyCount,
                actual: actualParamCount
            });
        } else if (dependencyNodes.length > callbackParams.length && allowedExtraDependencies && !allowExtraDependencies) {
            var extraPaths = getExtraPaths(dependencyNodes, callbackParams);
            var pathsAllowed = allPathsAllowed(extraPaths, allowedExtraDependencies);
            if (!pathsAllowed) {
                context.report(node, TOO_FEW_PARAMS_MESSAGE, {
                    functionName: funcName,
                    expected: dependencyCount,
                    actual: actualParamCount
                });
            }
        } else if (dependencyNodes.length > callbackParams.length && !allowExtraDependencies) {
            context.report(node, TOO_FEW_PARAMS_MESSAGE, {
                functionName: funcName,
                expected: dependencyCount,
                actual: actualParamCount
            });
        }
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    return {
        "CallExpression": function (node) {
            /* istanbul ignore else: correctly does nothing */
            if (util.isDefineCall(node) && util.isAmdDefine(node)) {
                checkArity(node, "define");
            } else if (util.isRequireCall(node) && requireHasCallback(node)) {
                checkArity(node, node.callee.name);
            }
        }
    };

};

//------------------------------------------------------------------------------
// Rule Schema
//------------------------------------------------------------------------------

module.exports.schema = [
    {
        "type": "object",
        "properties": {
            "allowExtraDependencies": {
                "type": "boolean",
                "default": false
            },
            allowedExtraDependencies: {
                type: "array",
                uniqueItems: true,
                items: {
                    type: "string"
                }
            }
        },
        "additionalProperties": false
    }
];
