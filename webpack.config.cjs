const path = require('path');

module.exports = {
  entry: {
    app: './app/scripts/app.js',
    'lexical-editor': './app/scripts/lexical-editor.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/dist/'
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
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js'],
    modules: [path.resolve(__dirname, 'node_modules')],
    alias: {
      'lexical': path.resolve(__dirname, 'node_modules/lexical')
    }
  },
  optimization: {
    minimize: true
  }
}; 