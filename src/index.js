const globby = require("globby");
const fs = require("fs");
const path = require("path");
const { Targetables } = require('@magento/pwa-buildpack');

class ExtendLocalIntercept {
    componentsCache = [];

    constructor(targets, magentoPath = 'node_modules/@magento') {
        this.magentoPath = magentoPath;
        this.targetables = Targetables.using(targets);
        this.talonsTarget = targets.of('@magento/peregrine').talons;
    }

    async allowTargetables(
        fileExtension = '*.js',
        targetablesPath = 'src/targets'
    ) {
        const paths = await globby(targetablesPath, {
            expandDirectories: {
                files: [fileExtension]
            }
        });

        const currentPath = process.cwd();

        paths.forEach(myPath => {
            const componentType = myPath.includes('rootComponents')
                ? 'rootComponents'
                : 'components';
            const relativePath = myPath.replace(
                `${targetablesPath}/${componentType}`,
                `${this.magentoPath}/venia-ui/lib/${componentType}`
            );
            const absolutePath = path.resolve(relativePath);

            fs.stat(absolutePath, (err, stat) => {
                if (!err && stat && stat.isFile()) {
                    const component = this.getReactComponent(
                        relativePath.replace('node_modules/', '')
                    );
                    const componentInterceptor = require(path.resolve(currentPath, myPath));
                    componentInterceptor.interceptComponent(component);
                }
            });
        });
    }

    async allowCssOverwrites(
        fileExtension = '*.module.css',
        targetablesPath = 'src/targets'
    ) {
        const paths = await globby(targetablesPath, {
            expandDirectories: {
                files: [fileExtension]
            }
        });

        paths.forEach(myPath => {
            const componentType = myPath.includes('rootComponents')
                ? 'rootComponents'
                : 'components';
            const relativePath = myPath.replace(
                `${targetablesPath}/${componentType}`,
                `${this.magentoPath}/venia-ui/lib/${componentType}`
            );
            const absolutePath = path.resolve(relativePath);

            fs.stat(absolutePath, (err, stat) => {
                if (!err && stat && stat.isFile()) {
                    const jsComponent = relativePath
                        .replace('node_modules/', '')
                        .replace(fileExtension.substring(1), '.js');

                    const eSModule = this.targetables.reactComponent(
                        jsComponent
                    );
                    /** Add import for our custom CSS classes */
                    eSModule.addImport(`import localClasses from "${myPath}"`);
                    /** Update the mergeClasses() method to inject our additional custom css */
                    eSModule.insertAfterSource(
                        'const classes = useStyle(defaultClasses, ',
                        'localClasses, '
                    );
                }
            });
        });
    }

    async allowPeregrineWraps(
        fileExtension = 'use*.js',
        targetablesPath = 'src/wrappers'
    ) {
        const paths = await globby(targetablesPath, {
            expandDirectories: {
                files: [fileExtension]
            }
        });
        const findTalonConfig = (talonConfig, wrapParts) => {
            const check = wrapParts[0];
            if (wrapParts.length === 1) {
                return talonConfig[check];
            }
            return findTalonConfig(talonConfig[check], wrapParts.slice(1));
        };

        paths.forEach(myPath => {
            const hookType = myPath.includes('talons') ? 'talons' : 'hooks';
            const relativePath = myPath.replace(
                `${targetablesPath}/${hookType}`,
                `${this.magentoPath}/peregrine/lib/${hookType}`
            );
            const absolutePath = path.resolve(relativePath);

            fs.stat(absolutePath, (err, stat) => {
                if (!err && stat && stat.isFile()) {
                    const pathElements = absolutePath.split('/');
                    const baseIndex = pathElements.indexOf(hookType) + 1;

                    const wrapParts = pathElements.slice(baseIndex);
                    const componentFolders = wrapParts.slice(
                        0,
                        wrapParts.length - 1
                    );
                    const hookName = wrapParts[wrapParts.length - 1].replace(
                        '.js',
                        ''
                    );

                    const wrapName = `${targetablesPath}/${hookType}/${componentFolders.join(
                        '/'
                    )}/${hookName}`;

                    this.talonsTarget.tap(talonWrapperConfig => {
                        const talonConfig = findTalonConfig(
                            talonWrapperConfig,
                            componentFolders
                        );
                        const talon = talonConfig[hookName];
                        const wrapName = `${targetablesPath}/${hookType}/${componentFolders.join(
                            '/'
                        )}/${hookName}`;

                        talon.wrapWith(wrapName);
                    });
                }
            });
        });
    }

    // Create a cache of components so our styling and intercepts can use the same object
    getReactComponent(modulePath) {
        if (this.componentsCache[modulePath] !== undefined) {
            return this.componentsCache[modulePath];
        }

        return (this.componentsCache[
            modulePath
        ] = this.targetables.reactComponent(modulePath));
    }
}

module.exports.ExtendLocalIntercept = ExtendLocalIntercept;
