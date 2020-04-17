const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

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
        favicon: "./frontend/assets/images/icon32x32.ico",
        meta: {
            viewport: "width=device-width",
            charset: "UTF-8",
            keywords: "onlineboard онлайн доска",
            description: "OnlineBoard - онлайн доска с возможностью совместного редактирования и поддержкой различных математических синтаксисов.",
            "og:type": { property: "og:type", content: "website"},
            "og:site_name": { property: "og:site_name", content: "OnlineBoard"},
            "og:description": { 
                property: "og:description", 
                content: "OnlineBoard - онлайн доска с возможностью совместного редактирования и поддержкой различных математических синтаксисов."
            },
            "og:image": { property: "og:image", content: "/images/preview.png"},
            "og:image:width": { property: "og:image:width", content: "968"},
            "og:image:height": { property: "og:image:height", content: "504"},
            "og:url": { property: "og:url", content: "https://onlineboard.xyz/"},
            "og:locale": { property: "og:locale", content: "ru_RU"},


            "twitter:card": "summary_large_image",
            "twitter:title": "OnlineBoard",
            "twitter:description": "OnlineBoard - онлайн доска с возможностью совместного редактирования и поддержкой различных математических синтаксисов.",
            "twitter:image:src": "/images/preview.png",
            "twitter:url": "http://example.com/page.html",
            "twitter:domain": "https://onlineboard.xyz/",
            "twitter:site": "OnlineBoard",
        },
        hash: !demo,
        base: demo ? undefined : '/'
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
                new CopyPlugin([
                  { from: './frontend/assets/', to: '' }])
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