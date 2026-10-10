const path = require('path')
const {DefinePlugin} = require('webpack')
const fs = require('fs')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = (env = {}) => {
  const rootPath = path.resolve(__dirname, '..')
  const gameId = env.game || 'pixel-quest'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(gameId)) throw new Error('Invalid game id')
  const distPath = path.join(rootPath, 'dist')
  const srcPath = path.join(rootPath, 'games', gameId)
  for (const file of ['app.js', 'index.html']) {
    if (!fs.existsSync(path.join(srcPath, file))) throw new Error('Missing game file: ' + path.join(srcPath, file))
  }

  const ATTRIBUTES_TO_EXPAND = [
    'src', 'gltf-model', 'cover-image-url', 'footer-image-url', 'watermark-image-url',
  ]

  const makeJsLoader = () => ({
    test: /\.js$/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env'],
        plugins: ['@babel/plugin-transform-runtime'],
      },
    },
    exclude: /node_modules/,
  })

  const makeTsLoader = () => ({
    test: /\.ts$/,
    loader: 'ts-loader',
    exclude: /node_modules/,
  })

  const makeCssLoader = () => ({
    test: /\.css$/,
    exclude: /\/assets\//,
    use: ['style-loader', 'css-loader'],
  })

  const makeSassLoader = () => ({
    test: /\.scss$/,
    use: ['style-loader', 'css-loader', 'sass-loader'],
  })

  const makeAssetLoader = () => ({
    test: /\..*$/,
    include: [path.join(srcPath, 'assets')],
    exclude: /\.json$/,
    loader: path.join(__dirname, 'asset-loader.js'),
  })

  const makeDefaultHtmlLoader = () => ({
    test: /\.html$/,
    use: {
      loader: 'html-loader',
      options: {
        esModule: false,
        sources: {
          list: [
            '...',
            {
              tag: 'script',
              attribute: 'src',
              type: 'src',
              filter: () => false,
            },
            ...ATTRIBUTES_TO_EXPAND.map(attr => ({
              tag: '*',
              attribute: attr,
              type: 'src',
            })),
          ],
        },
      },
    },
  })

  const config = {
    entry: path.join(srcPath, 'app.js'),
    output: {
      filename: 'bundle.js',
      path: distPath,
      publicPath: 'auto',
    },
    plugins: [
      new DefinePlugin({__AR_DEBUG__: JSON.stringify(env.debug === true || env.debug === 'true')}),
      new HtmlWebpackPlugin({
        template: path.join(srcPath, 'index.html'),
        filename: 'index.html',
        inject: false,
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.join(rootPath, 'external'),
            to: path.join(distPath, 'external'),
            noErrorOnMissing: true,
          },
          {
            from: path.join(srcPath, 'assets'),
            globOptions: {ignore: ['**/image-targets/**']},
            to: path.join(distPath, 'assets'),
            noErrorOnMissing: true,
          },
          {
            from: path.join(srcPath, 'assets', 'image-targets'),
            to: path.join(distPath, 'image-targets'),
            noErrorOnMissing: true,
          },
        ],
      }),
    ],
    resolve: {extensions: ['.ts', '.js']},
    module: {
      rules: [
        makeJsLoader(),
        makeTsLoader(),
        makeCssLoader(),
        makeSassLoader(),
        makeAssetLoader(),
        makeDefaultHtmlLoader(),
      ],
    },
    mode: 'production',
    context: srcPath,
    devServer: {
      host: '0.0.0.0',
      allowedHosts: 'all',
      open: false,
      compress: true,
      hot: true,
      liveReload: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
      client: {
        overlay: {
          warnings: false,
          errors: true,
        },
      },
    },
  }

  return config
}
