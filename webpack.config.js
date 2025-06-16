const path = require('path');

module.exports = {
  entry: './app/scripts/app.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
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
              ['@babel/preset-env', { targets: "defaults" }]
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
  externals: {
    'lexical': 'Lexical'
  },
  optimization: {
    minimize: true
  }
}; 