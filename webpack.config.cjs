const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    app: ['./app/scripts/app.js', './app/styles/main.css'],
    'lexical-editor': ['./app/scripts/lexical-editor.js', './app/styles/lexical-editor.css']
  },
  output: {
    path: path.resolve(__dirname, 'app/dist'),
    filename: '[name].bundle.js',
    publicPath: './dist/'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { 
                targets: "defaults",
                modules: false
              }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ],
  resolve: {
    extensions: ['.js', '.css'],
    modules: [path.resolve(__dirname, 'node_modules')],
    alias: {
      'lexical': path.resolve(__dirname, 'node_modules/lexical')
    }
  },
  optimization: {
    minimize: true
  }
}; 