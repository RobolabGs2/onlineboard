const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

function getFilesFromPath(path, extension) {
    let dir = fs.readdirSync(path);
    return dir.filter(elm => elm.match(new RegExp(`.*\.(${extension})`, 'ig')));
}

const paths = ((root) => {
    const paths = {
        tsEntry: 'entry', htmlTemplates: 'tmpl'
        };
    for (let path in paths) {
        paths[path] = `${root}/${paths[path]}`;
    }
    return paths;
})('./frontend');

const entries = getFilesFromPath(paths.tsEntry, 'ts').map(fileWithExt => fileWithExt.replace('.ts', ''));
module.exports = {
    entry: entries.reduce((acc, file) => {acc[file] = `${paths.tsEntry}/${file}.ts`; return acc}, {}),
    plugins: [
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin(),
    ].concat(entries.map(chunk =>
        new HtmlWebpackPlugin({
            template: `${paths.htmlTemplates}/${chunk}.ejs`,
            chunks: [chunk],
            filename: `${chunk}.html`,
            favicon: "./frontend/assets/images/icon.ico",
            meta: {
                viewport: "width=device-width",
                charset: "UTF-8"
            },
            hash: true,
            base: '/'
        }))),
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
        path: path.resolve(__dirname, './dist'),
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
        },
    },
};