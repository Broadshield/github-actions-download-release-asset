const path = require( 'path' );

module.exports = {

    // bundling mode
    mode: 'production',
    target: 'node12',

    // entry files
    entry: './src/main.ts',

    // output bundles (location)
    output: {
        path: path.resolve( __dirname, 'lib' ),
        filename: 'main.js',
    },

    // file resolutions
    resolve: {
        extensions: [ '.ts', '.js' ],
    },

    devtool: 'source-map',

    // loaders
    module: {
        rules: [
            {
                test: /\.tsx?/,
                use: ['babel-loader', 'ts-loader'],
                exclude: /node_modules/,
            }
        ]
    }
};
