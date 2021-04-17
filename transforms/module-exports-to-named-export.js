/**
 * Transform
 *
 *   module.exports.a = *;
 *
 * to
 *
 *   export const a = *;
 *
 * Only on global context
 */

import Logger from "./utils/logger";
import { isTopNode } from "./utils/filters";

function transformer(file, api, options) {
    const j = api.jscodeshift;
    const logger = new Logger(file, options);

    // ------------------------------------------------------------------ SEARCH
    // https://astexplorer.net/#/gist/334f5bd39244c7feab38a3fd3cc0ce7f/c332a5b4cbd1a9718e644febf2dce9e9bd032d1b
    const nodes = j(file.source)
        .find(j.ExpressionStatement, {
            expression: {
                left: {
                    object: {
                        object: {
                            name: "module"
                        },
                        property: {
                            name: "exports"
                        }
                    }
                    // property is target
                },
                operator: "="
            }
        })
        .filter(isTopNode);

    logger.log(`${nodes.length} nodes will be transformed`);

    // ----------------------------------------------------------------- REPLACE
    const source = nodes
        .replaceWith((path) => {
            const node = path.node;
            // Identifier node
            const id = node.expression.left.property;
            const init = node.expression.right;
            // module.export.a = a
            // → export { a }
            if (id.type === "Identifier" && init.type === "Identifier") {
                return j.exportNamedDeclaration(null, [j.exportSpecifier(id, init)]);
            }
            // https://babeljs.io/docs/en/babel-types#exportnameddeclaration
            const declaration = j.variableDeclaration("const", [j.variableDeclarator(id, init)]);
            return j.exportNamedDeclaration(declaration);
        })
        .toSource();

    return j(source)
        .find(j.ExpressionStatement, {
            expression: {
                left: {
                    object: {
                        name: "module"
                    },
                    property: {
                        name: "exports"
                    }
                },
                right: {
                    type: "ObjectExpression"
                },
                operator: "="
            }
        })
        .filter(isTopNode)
        .replaceWith((path) => {
            const exportSpecifiers = path.node.expression.right.properties.map((property) => {
                console.log(JSON.stringify(property, null, "  "));
                return j.exportSpecifier(j.identifier("default"), j.identifier(elem.key.name));
            });
            return j.exportNamedDeclaration(null, exportSpecifiers);
        })
        .toSource();
}

export default transformer;
