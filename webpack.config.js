const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

function getFilesFromPath(path, extension) {
    let dir = fs.readdirSync(path);
    return dir.filter(elm => elm.match(new RegExp(`.*\.(${extension})`, 'ig')));
}

const definePaths = ((root, demo) => {
    const paths = {
        tsEntry: 'entry', htmlTemplates: 'tmpl'
    };
    if (demo) {
        paths.tsEntry = 'demo';
    }
    for (let path in paths) {
        paths[path] = `${root}/${paths[path]}`;
    }
    return paths;
});

function htmlFor(chunk, tmplFolder, tmpl, resultName, demo) {
    return new HtmlWebpackPlugin({
        template: `${tmplFolder}/${tmpl}.ejs`,
        chunks: [chunk],
        filename: `${resultName}.html`,
        favicon: "./frontend/assets/images/icon.ico",
        meta: {
            viewport: "width=device-width",
            charset: "UTF-8"
        },
        hash: !demo,
        base: '/'
    });
}

function htmlForChunk(tmplFolder, demo, chunk) {
    return htmlFor(chunk, tmplFolder, chunk, demo ? 'index' : chunk, demo);
}
module.exports = (env) => {
    const isDemo = env && env.demo;
    console.info(`Demo: ${isDemo}`);
    const paths = definePaths('./frontend', isDemo);
    const entries = getFilesFromPath(paths.tsEntry, 'ts')
        .map(fileWithExt => fileWithExt.replace('.ts', ''));
    return {
        entry: entries.reduce((acc, file) => {
            acc[file] = `${paths.tsEntry}/${file}.ts`;
            return acc
        }, {}),
        plugins: [
            new CleanWebpackPlugin(),
            new MiniCssExtractPlugin(),
        ].concat(entries.map(chunk => htmlForChunk(paths.htmlTemplates, isDemo, chunk))),
        devtool: 'inline-source-map',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: [
                        {loader: 'ts-loader', options: {transpileOnly: true}}
                    ],
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/i,
                    use: [MiniCssExtractPlugin.loader, 'css-loader'],
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        output: {
            filename: '[name].bundle.js',
            path: path.resolve(__dirname, isDemo ? './static' : './dist'),
        },
        optimization: {
            splitChunks: {
                chunks: 'all',
            },
        },
    }
};